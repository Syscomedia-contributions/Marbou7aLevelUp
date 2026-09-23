import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Phone, Lock, Eye, EyeOff } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { setSession, type AuthUser } from "@/lib/auth";

interface RegisterFormProps {
  onSuccess?: () => void;
  onRequestLogin?: () => void;
}

type Step = "phone" | "verify";

const RegisterForm = ({ onSuccess, onRequestLogin }: RegisterFormProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const iconSide = isRtl ? "right-3" : "left-3";
  const inputPad = isRtl ? "pr-9" : "pl-9";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanedPhone = phone.replace(/[\s-]/g, "");

  const requestCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/register/start", { phone: cleanedPhone }, { auth: false });
      setStep("verify");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setError(t("auth.errorPhoneNotTT"));
      else if (err instanceof ApiError && err.status === 409) setError(t("auth.errorPhoneTaken"));
      else setError(t("auth.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^(?:\+216|00216|216)?\d{8}$/.test(cleanedPhone)) {
      setError(t("auth.errorPhone"));
      return;
    }
    requestCode();
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError(t("auth.errorPassword"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.errorPasswordMismatch"));
      return;
    }
    if (code.length !== 6) {
      setError(t("auth.errorOtp"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await api.post<{ token: string; user: AuthUser }>(
        "/auth/register/verify",
        { phone: cleanedPhone, code, password },
        { auth: false }
      );
      setSession(token, user);
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setError(t("auth.errorOtp"));
      else if (err instanceof ApiError && err.status === 409) setError(t("auth.errorPhoneTaken"));
      else setError(t("auth.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "phone") {
    return (
      <form onSubmit={handlePhoneSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tt-register-phone">{t("auth.phoneLabel")}</Label>
          <div className="relative">
            <Phone className={`absolute ${iconSide} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
            <Input
              id="tt-register-phone"
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="hero" className="w-full" disabled={loading}>
          {loading ? t("auth.sendingCode") : t("auth.continue")}
        </Button>
        <div className="text-center text-sm">
          <button type="button" onClick={() => onRequestLogin?.()} className="text-primary hover:underline font-semibold">
            {t("auth.backToLogin")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifySubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        {t("auth.otpDescription", { phone: cleanedPhone })}
      </p>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tt-register-password">{t("auth.passwordLabel")}</Label>
        <div className="relative">
          <Lock className={`absolute ${iconSide} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            id="tt-register-password"
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
      <div className="space-y-2">
        <Label htmlFor="tt-register-password-confirm">{t("auth.passwordConfirmLabel")}</Label>
        <div className="relative">
          <Lock className={`absolute ${iconSide} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            id="tt-register-password-confirm"
            type={showPassword ? "text" : "password"}
            placeholder={t("auth.passwordConfirmPlaceholder")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`${inputPad} ${isRtl ? "text-right" : ""}`}
            dir={isRtl ? "rtl" : undefined}
            required
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="hero" className="w-full" disabled={loading}>
        {loading ? t("auth.creatingAccount") : t("auth.registerSubmit")}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={requestCode} disabled={loading} className="text-primary hover:underline">
          {t("auth.resendCode")}
        </button>
        <button type="button" onClick={() => onRequestLogin?.()} className="text-primary hover:underline font-semibold">
          {t("auth.backToLogin")}
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;
