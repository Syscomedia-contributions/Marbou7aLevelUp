import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Phone, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { setSession, isAuthed, isAdmin, type AuthUser } from "@/lib/auth";
import marbou7aWordmark from "@/assets/marbou7a-wordmark.png";

export default function AdminLogin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === "ar";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already signed in as admin? Skip straight to the dashboard.
  if (isAuthed() && isAdmin()) {
    navigate("/admin", { replace: true });
    return null;
  }

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
      if (user.role !== "admin") {
        setError(t("admin.login.errorNotAdmin"));
        return;
      }
      setSession(token, user);
      navigate("/admin", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("admin.login.errorInvalid"));
      } else {
        setError(t("admin.login.errorGeneric"));
      }
    } finally {
      setLoading(false);
    }
  };

  const iconSide = isRtl ? "right-3" : "left-3";
  const inputPad = isRtl ? "pr-9" : "pl-9";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen min-h-[100dvh] flex items-center justify-center px-4 py-10"
      style={{ background: "radial-gradient(circle at 50% -10%, hsl(222 45% 18%), hsl(224 55% 8%) 60%)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 select-none">
          <img src={marbou7aWordmark} alt="Marbou7a" className="h-36 w-auto object-contain drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
          <span className="text-wordmark-gradient font-wordmark text-[22px] font-black uppercase tracking-[0.08em] leading-none -mt-[47px]">
            Cash
          </span>
          <div className="flex items-center gap-1.5 mt-3 text-muted-foreground">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-[0.15em]">{t("admin.login.title")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center mb-2">{t("admin.login.subtitle")}</p>

          <div className="space-y-2">
            <Label htmlFor="admin-phone">{t("admin.login.phoneLabel")}</Label>
            <div className="relative">
              <Phone className={`absolute ${iconSide} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                id="admin-phone"
                type="tel"
                inputMode="numeric"
                placeholder={t("admin.login.phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${inputPad} ${isRtl ? "text-right" : ""}`}
                dir={isRtl ? "rtl" : undefined}
                maxLength={16}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">{t("admin.login.passwordLabel")}</Label>
            <div className="relative">
              <Lock className={`absolute ${iconSide} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                placeholder={t("admin.login.passwordPlaceholder")}
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
            {loading ? t("admin.login.loggingIn") : t("admin.login.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
