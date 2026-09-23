import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Lock, Eye, EyeOff } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { setSession, type AuthUser } from "@/lib/auth";
import ForgotPasswordDialog from "./ForgotPasswordDialog";

interface LoginFormProps {
  onSuccess?: () => void;
  onRequestRegister?: () => void;
  submitLabel?: string;
}

const LoginForm = ({ onSuccess, onRequestRegister, submitLabel }: LoginFormProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = phone.replace(/[\s-]/g, "");
    if (!/^(?:\+216|00216|216)?\d{8}$/.test(cleaned)) {
      setError(t("auth.errorPhone"));
      return;
    }
    if (password.length < 4) {
      setError(t("auth.errorPassword"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await api.post<{ token: string; user: AuthUser }>(
        "/auth/login",
        { phone: cleaned, password },
        { auth: false }
      );
      setSession(token, user);
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("auth.errorLoginInvalid"));
      } else {
        setError(t("auth.errorGeneric"));
      }
    } finally {
      setLoading(false);
    }
  };

  const iconSide = isRtl ? "right-3" : "left-3";
  const inputPad = isRtl ? "pr-9" : "pl-9";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tt-phone">{t("auth.phoneLabel")}</Label>
        <div className="relative">
          <Phone className={`absolute ${iconSide} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            id="tt-phone"
            type="tel"
            inputMode="numeric"
            placeholder={t("auth.phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`${inputPad} ${isRtl ? "text-right" : ""}`}
            dir={isRtl ? "rtl" : undefined}
            maxLength={16}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tt-password">{t("auth.passwordLabel")}</Label>
        <div className="relative">
          <Lock className={`absolute ${iconSide} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            id="tt-password"
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${isRtl ? "pr-9 pl-9" : "pl-9 pr-9"} ${isRtl ? "text-right" : ""}`}
            dir={isRtl ? "rtl" : undefined}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className={`absolute ${isRtl ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none`}
            aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="hero" className="w-full" disabled={loading}>
        {loading ? t("auth.loggingIn") : submitLabel ?? t("auth.continue")}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <ForgotPasswordDialog
          trigger={
            <button type="button" className="text-primary hover:underline">
              {t("auth.forgot")}
            </button>
          }
        />
        <button
          type="button"
          onClick={() => onRequestRegister?.()}
          className="text-primary hover:underline font-semibold"
        >
          {t("auth.signup")}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
