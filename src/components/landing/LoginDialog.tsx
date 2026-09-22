import { ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

interface LoginDialogProps {
  /** Omit to drive the dialog externally via `open`/`onOpenChange` instead. */
  trigger?: ReactNode;
  redirectTo?: string;
  title?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Mode = "login" | "register";

const LoginDialog = ({ trigger, redirectTo = "/portal", title, open: openProp, onOpenChange: onOpenChangeProp }: LoginDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (isControlled) onOpenChangeProp?.(next);
    else setInternalOpen(next);
    if (!next) setMode("login");
  };

  const handleSuccess = () => {
    handleOpenChange(false);
    navigate(redirectTo);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="sm:max-w-md bg-card border border-border/60 shadow-2xl p-6 z-[120]"
        overlayClassName="bg-transparent"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center px-4 sm:px-8">
          <DialogTitle className="text-center">
            {mode === "login" ? title ?? t("auth.title") : t("auth.registerTitle")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === "login" ? t("auth.description") : t("auth.registerDescription")}
          </DialogDescription>
        </DialogHeader>

        {mode === "login" ? (
          <LoginForm
            submitLabel={t("auth.submit")}
            onSuccess={handleSuccess}
            onRequestRegister={() => setMode("register")}
          />
        ) : (
          <RegisterForm onSuccess={handleSuccess} onRequestLogin={() => setMode("login")} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
