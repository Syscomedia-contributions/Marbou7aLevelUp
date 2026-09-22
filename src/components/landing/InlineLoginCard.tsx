import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoginForm from "./LoginForm";

/** Carte de connexion inline (web uniquement) affichée sous le CTA du Hero. */
const InlineLoginCard = ({ className = "" }: { className?: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      className={`rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm shadow-2xl p-6 text-start ${className}`}
    >
      <LoginForm submitLabel={t("auth.submit")} onSuccess={() => navigate("/portal")} />
    </div>
  );
};

export default InlineLoginCard;
