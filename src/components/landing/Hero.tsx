import {
  Atom,
  Dribbble,
  Palette,
  Landmark,
  ScrollText,
  Tv,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import heroBgWide from "@/assets/hero-egypt-bg-wide.png";
import heroBgTablet from "@/assets/hero-egypt-bg-tablet.png";
import marbou7aWordmarkAr from "@/assets/marbou7a-wordmark-ar.png";
import marbou7aWordmarkMobile from "@/assets/marbou7a-wordmark-mobile.png";

import TypewriterTitle from "./TypewriterTitle";
import Fireworks from "./Fireworks";
import MobilePrizeBurst from "./MobilePrizeBurst";

import HeroStargateVideo from "./HeroStargateVideo";
import InlineLoginCard from "./InlineLoginCard";



/* Trivia Crack-style 6 categories — color matches the wheel slices in index.css */
const CATEGORIES = [
  { key: "science",  labelKey: "hero.categories.science", Icon: Atom,       color: "hsl(210 90% 50% / 0.35)" },
  { key: "sports",   labelKey: "hero.categories.sport",   Icon: Dribbble,   color: "hsl(16 90% 55% / 0.35)"  },
  { key: "history",  labelKey: "hero.categories.history", Icon: ScrollText, color: "rgba(85, 107, 47, 0.35)"  },
  { key: "archeo",   labelKey: "hero.categories.archeo",  Icon: Landmark,   color: "rgba(176, 122, 58, 0.35)"  },
  { key: "ent",      labelKey: "hero.categories.ent",     Icon: Tv,         color: "hsl(280 70% 50% / 0.35)" },
  { key: "art",      labelKey: "hero.categories.art",     Icon: Palette,    color: "hsl(350 80% 52% / 0.35)" },
];

const DESKTOP_CATEGORY_CHIP_WIDTHS: Record<string, string> = {
  science: "112px",
  sports: "98px",
  history: "104px",
  archeo: "152px",
  ent: "165px",
  art: "67px",
};

const Hero = () => {
  const { t, i18n } = useTranslation();
  // AR uses the exact same LTR layout as FR/EN — only the text is translated.
  const isAr = false;

  return (
    <section className="relative -mt-14 pt-12 pb-12 max-sm:min-h-[100svh] max-sm:pb-0 sm:pt-24 sm:pb-16 md:pt-28 md:pb-24 lg:pt-28 lg:pb-48 overflow-x-clip">
      {/* Tablet: extended image (sky stretched up, ground stretched down) keeps horizontal size identical */}
      {(() => {
        const mirror = true; // AR mirrors FR/EN: same Stargate placement on desktop
        return (
          <>
            <div
              aria-hidden="true"
              data-hero-bg="tablet"
              className="absolute inset-0 -z-20 hidden sm:block lg:hidden bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${heroBgTablet})`, backgroundSize: "cover", transform: mirror ? "scaleX(-1)" : undefined }}
            />
            <div
              aria-hidden="true"
              data-hero-bg="desktop"
              className="absolute inset-0 -z-20 hidden lg:block"
              style={{ backgroundImage: `url(${heroBgWide})`, backgroundSize: "cover", backgroundPosition: "62% center", backgroundRepeat: "no-repeat", transform: mirror ? "scaleX(-1)" : undefined }}
            />

          </>
        );
      })()}





      {/* Mobile background is provided by Layout as a single full-page image */}

      <div className="spotlight hidden md:block" />

      {/* Fireworks — visible on tablet & desktop (mobile already shows them elsewhere) */}
      <Fireworks className="hidden md:block -z-10" />

      {/* MOBILE ONLY — animated premium coins in the empty side area */}
      <MobilePrizeBurst />
      {/* Tablet / desktop : la Stargate est animée par la vidéo fournie. */}
      <HeroStargateVideo />








      {/* Mobile side category chips — removed; horizontal icon row is now the only mobile indicator */}
      <div aria-hidden={false} className="hidden absolute inset-0 pointer-events-none z-10">
        {CATEGORIES.map(({ key, labelKey, color }, i) => {
          const N = CATEGORIES.length;
          const progress = i / (N - 1); // 0..1
          const topVh = 40 + progress * 36; // 40vh..76vh
          // All languages: Stargate on left → chips on right, left-edge aligned
          const anchor = { left: "60vw" as const };
          return (
            <span
              key={key}
              className="category-chip absolute whitespace-nowrap px-3 py-1.5 !text-[15px] !font-normal opacity-0 animate-fade-in pointer-events-auto"
              style={{
                backgroundColor: color,
                ['--chip-bg' as any]: color,
                top: `${topVh}vh`,
                ...anchor,
                animationDelay: `${i * 0.15}s`,
                animationFillMode: "forwards",
              }}
            >
              {t(labelKey)}
            </span>
          );
        })}
      </div>



      <div dir="ltr" className="container relative grid grid-cols-[minmax(0,1fr)] gap-6 lg:gap-0 items-start lg:grid-cols-[1.05fr_1fr] lg:[&>*:first-child]:lg:-translate-x-[calc(34rem-15vw)]">
        {/* LEFT — copy + CTAs */}
        <div dir="auto" className="order-2 lg:order-2 space-y-6 max-sm:space-y-4 md:space-y-10 lg:space-y-8 animate-fade-in-up text-center md:max-lg:text-start lg:text-start mt-[5vh] max-sm:mt-0 lg:mt-10">
          {/* Mobile: Marbou7a logo centered on the page, larger than in the navbar */}
          <div className="lg:hidden relative z-20 flex flex-col items-center justify-center select-none pointer-events-none max-sm:mb-0 sm:mb-2">
            <div dir="ltr" className="flex flex-col items-center gap-0 font-bold min-w-0">
              <img
                src={i18n.language === "ar" ? marbou7aWordmarkAr : marbou7aWordmarkMobile}
                alt="Marbou7a"
                className={`w-[52vw] max-w-[200px] max-[360px]:w-[50vw] sm:w-[250px] h-auto object-contain drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)] ${i18n.language === "ar" ? "max-sm:scale-[0.92]" : ""}`}
              />
              <span className="text-wordmark-gradient font-wordmark text-[21.6px] xs:text-[23.7px] sm:text-[24px] -mt-2 xs:-mt-2 sm:-mt-2 font-black tracking-[0.08em] xs:tracking-[0.08em] sm:tracking-[0.08em] uppercase whitespace-nowrap leading-none max-sm:translate-y-[12px] max-sm:translate-x-[3vw]">
                CASH
              </span>
            </div>
          </div>

          {/* Mobile-only static tagline sits right under the logo, above the Stargate wheel */}
          <h1
            dir="auto"
            className="lg:hidden relative z-20 text-center text-white text-[1.05rem] xs:text-[1.155rem] sm:text-[1.378rem] font-extrabold leading-snug max-w-[88%] mx-auto -mt-3 xs:-mt-4 sm:-mt-2 mb-[7vh] max-sm:mb-[6vh] max-sm:translate-y-[19%]"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.75), 0 3px 10px rgba(0,0,0,0.55)" }}
          >
            <Trans i18nKey="hero.heroTitle" components={{ grad: <span className="text-gradient" />, nowrap: <span className="whitespace-nowrap" /> }} />
          </h1>


          {/* Desktop: phrase + login card stacked tightly under the logo */}
          <div className="hidden lg:flex flex-col items-center relative lg:translate-y-12">
            <div className="-translate-y-[30%]">
              <TypewriterTitle
                className={`${i18n.language === "fr" ? "text-base lg:!-translate-x-[1vw] lg:!text-center" : "text-[1.2rem] lg:!translate-x-[0vw] lg:!text-center"} sm:text-2xl md:text-2xl lg:text-[1.8rem] font-extrabold leading-[1.5] sm:leading-[1.15] break-words max-sm:text-white lg:w-full lg:text-center`}
                speedMs={110}
              />
            </div>
            <InlineLoginCard className="absolute top-full left-1/2 -translate-x-1/2 mt-2 lg:w-[400px] z-30" />
          </div>










          {/* CTA card — mobile / tablet absolute positioning only */}
          <div className="relative text-center max-sm:!mt-0 max-sm:absolute max-sm:inset-x-0 max-sm:top-[calc(100svh-310px)] [@media(max-width:639px)_and_(max-height:700px)]:top-[calc(100svh-255px)] [@media(max-width:639px)_and_(max-height:700px)]:scale-[0.82] [@media(max-width:639px)_and_(max-height:700px)]:origin-top md:max-lg:text-start lg:text-start md:max-w-xl md:mx-auto md:max-lg:mx-0 lg:max-w-none lg:hidden">
            <div className="relative max-sm:px-1 max-sm:py-2">
            <div className={`relative max-sm:[filter:drop-shadow(0_2px_3px_rgba(0,0,0,0.9))_drop-shadow(0_0_10px_rgba(0,0,0,0.6))] ${isAr ? "md:-ml-[20%]" : ""}`}>
              <h2 className={`text-base sm:text-2xl md:text-[1.2rem] lg:text-[1.7rem] font-bold leading-tight break-words max-sm:font-extrabold`}>
                <Trans i18nKey="cta.title" components={{ grad: <span className="text-gradient" /> }} />
              </h2>
              <InlineLoginCard className={`block max-lg:relative max-lg:mx-auto max-lg:mt-6 max-sm:!mt-0 max-sm:-translate-y-[18%] max-lg:w-[min(100%,400px)] z-30 ${i18n.language === "fr" ? "lg:translate-x-[calc(-50%+1%)]" : ""}`} />

            </div>
              <div className={`mt-4 max-sm:!mt-0 sm:mt-12 lg:!mt-[calc(10vh+3rem)] ${i18n.language === "fr" || i18n.language === "en" || i18n.language === "ar" ? "lg:translate-y-[136%]" : "lg:translate-y-[130%]"} flex flex-row sm:flex-nowrap gap-2 sm:gap-3 justify-center md:max-lg:justify-start lg:justify-center`}>

              </div>
            </div>
          </div>

        </div>


        {/* RIGHT — desktop-only stacked category chips, hugging the Stargate rim */}
        <div dir="ltr" className="order-1 lg:order-1 lg:items-end lg:pl-24 xl:pl-40 lg:justify-self-start hidden lg:flex flex-col gap-[calc(1.15rem+3%)] mt-20">
          {CATEGORIES.map(({ key, labelKey, color }, i) => {
            // Right edges are aligned (items-end); each chip is pulled left so that
            // its right edge follows the elliptical left rim of the Stargate.
            const ARC_OFFSET: Record<string, number> = {
              science: 0,
              sports: -23,
              history: -33,
              archeo: -34,
              ent: -25,
              art: -4,
            };
            const BASE_SHIFT = -150; // global px nudge toward the ring (more negative = further left from Stargate)
            const dx = BASE_SHIFT + (ARC_OFFSET[key] ?? 0);
            return (
              <span
                key={key}
                className={`category-chip whitespace-nowrap !px-5 !py-2.5 text-lg opacity-0 animate-fade-in-only ${i18n.language === "ar" ? "justify-center !text-[25px]" : ""}`}
                style={{
                  backgroundColor: color,
                  ['--chip-bg' as any]: color,
                  width: i18n.language === "ar" ? DESKTOP_CATEGORY_CHIP_WIDTHS[key] : undefined,
                  transform: `translateX(${dx}px)`,
                  animationDelay: `${i * 0.15}s`,
                }}
              >
                {t(labelKey)}
              </span>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default Hero;
