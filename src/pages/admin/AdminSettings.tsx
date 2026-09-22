import { useState, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export default function AdminSettings() {
  const { t } = useTranslation();
  const admin = getCurrentUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await api.patch("/admin/settings/password", { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("admin.settings.errorCurrentPassword"));
      } else {
        setError(t("admin.login.errorGeneric"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-md">
      <h1 className="text-2xl font-black text-gradient">{t("admin.settings.title")}</h1>

      {admin && (
        <div className="glass-card p-4 text-sm">
          <span className="text-muted-foreground">{t("admin.players.pseudo")}: </span>
          <span className="font-semibold">{admin.pseudo}</span>
          <span className="text-muted-foreground mx-2">·</span>
          <span dir="ltr">{admin.phone}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Lock className="w-4 h-4" /> {t("admin.settings.changePassword")}
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="current-password">{t("admin.settings.currentPassword")}</Label>
          <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">{t("admin.settings.newPassword")}</Label>
          <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={4} required />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-primary">{t("admin.settings.passwordChanged")}</p>}

        <Button type="submit" variant="hero" disabled={loading}>
          {loading ? t("admin.common.loading") : t("admin.common.save")}
        </Button>
      </form>
    </div>
  );
}
