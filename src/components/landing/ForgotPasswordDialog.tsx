import { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CopyFrame from "./CopyFrame";
import { useCopy } from "@/hooks/useCopy";

/** Réinitialisation du mot de passe par SMS gratuit Tunisie Telecom. */
const FORGOT_KEYWORD = "PASS";
const FORGOT_NUMBER = "85800";

interface ForgotPasswordDialogProps {
  trigger: ReactNode;
}

const ForgotPasswordDialog = ({ trigger }: ForgotPasswordDialogProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const { copied, copy } = useCopy();

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="sms-modal sm:max-w-md w-[calc(100vw-2rem)] max-h-[86vh] overflow-y-auto z-[130]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <span className="sms-modal__badge" aria-hidden>
            <KeyRound className="w-4 h-4" />
          </span>
          <DialogTitle>{t("auth.forgotTitle")}</DialogTitle>
          <DialogDescription
            dir={isRtl ? "rtl" : "ltr"}
            className={`sms-modal__intro ${isRtl ? "[unicode-bidi:plaintext] text-right" : ""}`}
          >
            <Trans
              i18nKey="auth.forgotIntro"
              components={{
                kw: <bdi dir="ltr" className="sms-inline-code" />,
                num: <bdi dir="ltr" className="sms-inline-code" />,
              }}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="sms-copy-frames">
          <CopyFrame value={FORGOT_KEYWORD} tone="gold" copied={copied} onCopy={copy} />
          <CopyFrame value={FORGOT_NUMBER} tone="cyan" copied={copied} onCopy={copy} />
        </div>

        <DialogClose asChild>
          <Button type="button" variant="hero" className="w-full">
            {t("auth.forgotOk")}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
