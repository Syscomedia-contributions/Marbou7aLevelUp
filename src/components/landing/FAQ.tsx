import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SectionHeading } from "./Features";
import { useTranslation } from "react-i18next";

type FaqItem = { q: string; a: string };
type FaqGroup = { title: string; items: FaqItem[] };

const FAQ = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const groups = t("faq.groups", { returnObjects: true }) as FaqGroup[];

  return (
    <section id="faq" dir={isAr ? "rtl" : "ltr"} className="py-20 md:py-28 max-sm:-translate-y-[2%]">
      <div className="container max-w-3xl">
        <SectionHeading eyebrow={t("faq.eyebrow")} titleKey="faq.title" />

        <div className="mt-10 space-y-10">
          {groups.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-bold ring-1 ring-primary/30">
                  {gi + 1}
                </span>
                <h3 className="text-lg md:text-xl font-bold tracking-tight">{group.title}</h3>
                <span className="flex-1 h-px bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
              </div>
              <Accordion type="single" collapsible className="space-y-3">
                {group.items.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${gi}-${i}`}
                    className="glass-card glow-border px-5 border-0"
                  >
                    <AccordionTrigger className="text-start hover:no-underline py-5 font-semibold">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 whitespace-pre-line">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="mt-12 glass-card glow-border px-6 py-8 md:px-10 md:py-10 text-center">
          <h3 className="text-xl md:text-2xl font-bold mb-2">{t("faq.supportTitle")}</h3>
          <p className="text-muted-foreground mb-6">{t("faq.supportSubtitle")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <p className="text-base md:text-lg font-medium">{t("faq.smsContact")}</p>
            <p className="text-base md:text-lg font-medium">{t("faq.phoneContact")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
