import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";

type Section = { h: string; p: string };

type TermsDialogProps = {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const TermsDialog = ({ children, open, onOpenChange }: TermsDialogProps) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith("ar");
  const sections = t("footer.termsContent.sections", { returnObjects: true }) as Section[];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollIndicator = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight > el.clientHeight + el.scrollTop + 4);
  }, []);

  useEffect(() => {
    updateScrollIndicator();
    const timeout = setTimeout(updateScrollIndicator, 250);
    const interval = setInterval(updateScrollIndicator, 750);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [updateScrollIndicator, sections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent
        dir={isArabic ? "rtl" : "ltr"}
        className="max-w-2xl max-h-[85vh] flex flex-col"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">{t("footer.termsContent.title")}</DialogTitle>
          <DialogDescription>{t("footer.termsContent.intro")}</DialogDescription>
        </DialogHeader>
        <div className="relative flex-1 max-h-[55vh] min-h-0">
          <div
            ref={scrollRef}
            onScroll={updateScrollIndicator}
            className="h-full max-h-[55vh] overflow-y-auto scrollbar-visible pr-3 -mr-3"
          >
            <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
              {Array.isArray(sections) &&
                sections.map((s, i) => (
                  <section key={i}>
                    <h3 className="font-semibold text-foreground mb-1">{s.h}</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{s.p}</p>
                  </section>
                ))}
              <p className="text-xs text-muted-foreground pt-4 border-t border-border/50">
                {t("footer.termsContent.updated")}
              </p>
            </div>
          </div>
          {canScrollDown && (
            <div
              className="absolute inset-x-0 bottom-0 h-12 pointer-events-none flex items-end justify-center pb-2"
              style={{
                background:
                  "linear-gradient(to top, hsl(222 47% 11% / 0.95) 0%, hsl(222 47% 11% / 0.5) 50%, transparent 100%)",
              }}
            >
              <ChevronDown className="w-5 h-5 text-primary animate-bounce" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsDialog;
