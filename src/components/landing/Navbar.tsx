import { Button } from "@/components/ui/button";
import { Menu, Home, LogOut, UserMinus } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import marbou7aWordmark from "@/assets/marbou7a-wordmark.png";
import marbou7aWordmarkAr from "@/assets/marbou7a-wordmark-ar.png";
import logoTT from "@/assets/logo-tt.png";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import HowToPlayDialog from "./HowToPlayDialog";
import TermsDialog from "./TermsDialog";
import { toast } from "@/hooks/use-toast";
import { stopAllPortalSounds } from "@/lib/portalSounds";
import { AUTH_CHANGE_EVENT, clearSession, isAuthed } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SCROLL_HIDE_THRESHOLD = 50;

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [showBranding, setShowBranding] = useState(true);
  const [isAuthedState, setIsAuthedState] = useState<boolean>(() => isAuthed());
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setIsAuthedState(isAuthed());
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // The Marbou7a logo, TT logo and language switcher should only be visible
  // when the user is at the very top of the page. They disappear as soon as
  // the page is scrolled down and reappear when scrolling back to the top.
  useEffect(() => {
    const onScroll = () => setShowBranding(window.scrollY < SCROLL_HIDE_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  const handleLogout = () => {
    clearSession();
    stopAllPortalSounds();
    window.dispatchEvent(new Event("portal:stop-alarm"));
    toast({ title: t("nav.logout"), description: "OK", duration: 1500 });
    navigate("/");
    window.scrollTo(0, 0);
  };

  // On the home page the desktop navbar links/buttons are hidden (logos only);
  // everywhere else — including the game — the full navbar reappears.
  const isHome = location.pathname === "/";
  const isPortal = location.pathname === "/portal";
  const isArabic = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith("ar");
  const isQuiz = location.pathname.startsWith("/quiz/");
  const lowerArabicCashOnMobile =
    isArabic &&
    (["/portal", "/gameplay", "/prizes", "/faq"].includes(location.pathname) || isQuiz);
  const lowerArabicGameLogoOnMobile = lowerArabicCashOnMobile;
  const hideOnHome = isHome ? "lg:invisible lg:pointer-events-none lg:select-none" : "";

  // Shared scroll-reveal animation for the TT logo, Marbou7a logo and language
  // switcher. They are only visible at the very top of the page.
  const brandingScrollCls = `transition-all duration-300 ease-out ${showBranding ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0 pointer-events-none"}`;

  // En jeu on conserve les éléments (sidebar, logo, actions, langue) mais sans le cadre de la nav bar desktop.
  const showDesktopFrame = false;
  // Décalage vertical propre à l'arabe en jeu : uniquement à partir des tablettes/desktop.
  // Sur mobile il désalignait le logo, le bouton menu et le sélecteur de langue
  // par rapport aux versions FR/EN, donc on le neutralise sous 640px.
  const arGameShift = i18n.language === "ar" && !isHome ? "sm:translate-y-[3vh]" : "";

  const links = [

    { label: t("nav.gameplay"), to: "/gameplay" },
    { label: t("nav.portal"), to: "/portal" },
    { label: t("nav.prizes"), to: "/prizes" },
    { label: t("nav.faq"), to: "/faq" },
  ];
  return (
    <header className={`fixed top-0 inset-x-0 z-50 px-3 xs:px-4 ${isHome ? "pt-3 xs:pt-4" : "pt-2 xs:pt-2.5"}`}>
      <nav className={`relative container flex items-center justify-between lg:[direction:ltr] px-2 xs:px-4 sm:px-6 ${isHome ? "py-1 lg:py-0.5" : "py-0.5 lg:py-0"} gap-1.5 xs:gap-2 sm:gap-3 ${isHome ? "max-lg:bg-transparent max-lg:border-0 max-lg:shadow-none max-lg:backdrop-blur-none" : "max-lg:rounded-3xl max-lg:border max-lg:border-border/60 max-lg:bg-card/90 max-lg:backdrop-blur-xl max-lg:shadow-[var(--shadow-card)]"} ${showDesktopFrame ? "lg:rounded-2xl lg:border lg:border-primary/30 lg:bg-card/40 lg:backdrop-blur-md lg:shadow-[0_4px_24px_rgba(0,0,0,0.25)]" : "lg:bg-transparent lg:border-0 lg:shadow-none lg:backdrop-blur-none lg:[&::before]:hidden"}`}>
        {isHome && (
          <div className={`absolute inset-0 flex items-center justify-between lg:[direction:ltr] px-2 xs:px-4 sm:px-6 py-1 lg:py-0.5 gap-1.5 xs:gap-2 sm:gap-3 pointer-events-none z-10 ${brandingScrollCls}`} aria-hidden>
            <img
              src={logoTT}
              alt="Tunisie Telecom"
              className="h-5 xs:h-7 sm:h-10 md:h-12 w-auto object-contain shrink-0 invisible -ml-0.5 sm:ml-0 max-sm:scale-[1.14] -translate-y-[35%]"
            />
            <div dir="ltr" className={`flex flex-col items-center gap-0.5 font-bold min-w-0 pointer-events-none select-none max-sm:-translate-y-[11%] max-lg:hidden ${i18n.language === 'ar' ? ' sm:-translate-x-[37%] lg:translate-x-[calc(186%+24px)] lg:translate-y-[70%] lg:scale-[67%]' : i18n.language === 'en' ? ' sm:-translate-x-[39%] lg:translate-x-[405%] lg:translate-y-[70%] lg:scale-[135%]' : i18n.language === 'fr' ? ' sm:-translate-x-[41%] lg:translate-x-[calc(405%+20px)] lg:translate-y-[70%] lg:scale-[135%]' : ' sm:-translate-x-[37%]'}`} aria-label="Marbou7a Level Up">
              <img
                src={i18n.language === "ar" ? marbou7aWordmarkAr : marbou7aWordmark}
                className="h-14 max-[360px]:h-11 xs:h-20 sm:h-20 md:h-24 lg:h-32 -my-1 xs:-my-2 sm:-my-6 w-auto object-contain drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
                alt="Marbou7a"
              />
              <span className={`text-wordmark-gradient font-wordmark text-[11px] xs:text-[13px] sm:text-[19px] md:text-[20px] lg:text-[25px] -mt-4 xs:-mt-5 sm:-mt-6 font-black tracking-[0.04em] xs:tracking-[0.05em] sm:tracking-[0.08em] uppercase whitespace-nowrap leading-none sm:leading-normal max-sm:[word-spacing:2%] sm:[word-spacing:-3px] ${i18n.language === 'ar' ? 'lg:translate-y-[160%] lg:translate-x-[6%] lg:scale-[190%]' : 'lg:translate-y-[17%] lg:translate-x-[6%]'}`}>
                CASH
              </span>
            </div>
            <ul className={`hidden lg:flex invisible items-center gap-6 lg:text-base xl:text-lg lg:gap-8 xl:gap-12 ${i18n.language === 'en' ? 'lg:-translate-x-[11%]' : i18n.language === 'fr' ? 'lg:-translate-x-[15%]' : ''}`}>
              {links.map((l) => (
                <li key={l.to}><span className="opacity-0 whitespace-nowrap">{l.label}</span></li>
              ))}
            </ul>
            {isAuthedState && (
              <Button variant="hero" size="sm" className="relative z-10 shrink-0 lg:hidden max-xs:h-8 max-xs:px-2 max-xs:text-xs invisible" aria-hidden tabIndex={-1}>
                <span aria-hidden className="mr-1 text-lg">🎬</span>
                {t("nav.howToPlay")}
              </Button>
            )}
            <div className="flex items-center gap-1 xs:gap-2 shrink-0 invisible [&_button]:max-xs:h-8 [&_button]:max-xs:px-2 [&_button]:max-xs:text-xs">
              <div className="lg:hidden -translate-y-[35%]">
                <LanguageSwitcher />
              </div>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-hidden tabIndex={-1}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
            <div className="hidden lg:flex items-center gap-2 shrink-0 invisible -translate-y-[35%]">
              {isAuthedState && (
                <Button variant="hero" size="sm" className="invisible" aria-hidden tabIndex={-1}>
                  <span aria-hidden className="mr-1 text-lg">🎬</span>
                  {t("nav.howToPlay")}
                </Button>
              )}
              <LanguageSwitcher />
            </div>
          </div>
        )}
        {isHome && (
          <img
            src={logoTT}
            alt="Tunisie Telecom"
            className={`h-5 xs:h-7 sm:h-10 md:h-12 w-auto object-contain shrink-0 drop-shadow-[0_0_6px_rgba(255,255,255,0.25)] -ml-0.5 sm:ml-0 pointer-events-none select-none max-sm:scale-[1.14] -translate-y-[35%] ${brandingScrollCls}`}
          />
        )}
        {/* Single sidebar trigger (mobile + desktop): replaces TT logo on web (game pages only) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <div className={`shrink-0 ${isHome ? 'hidden' : 'flex'} ${arGameShift}`}>
            <SheetTrigger asChild>
              <Button
                variant="glass"
                size="sm"
                className="shrink-0 text-foreground gap-1.5 px-3"
                aria-label={t("nav.menu")}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
          </div>
          <SheetContent side="left" className="w-72">
            <ul className="flex flex-col gap-4 mt-8 text-base">
              <li>
                <NavLink
                  to="/"
                  onClick={() => setSidebarOpen(false)}
                  className="group flex items-center gap-2.5 py-2 text-white transition-colors"
                >
                  {({ isActive }) => (
                    <>
                      <Home className="w-5 h-5 shrink-0 pointer-events-none" />
                      <span className={`group-hover:text-gradient group-focus:text-gradient group-active:text-gradient transition-colors ${isActive ? "text-gradient font-semibold" : ""}`}>
                        {t("nav.home")}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    onClick={() => setSidebarOpen(false)}
                    className="group flex items-center gap-2.5 py-2 text-white transition-colors"
                  >
                    {({ isActive }) => (
                      <>
                        {l.to === "/gameplay" && <span className="text-lg leading-none pointer-events-none select-none">🎮</span>}
                        {l.to === "/portal" && <span className="text-lg leading-none pointer-events-none select-none">🔘</span>}
                        {l.to === "/prizes" && <span className="text-lg leading-none pointer-events-none select-none">🏆</span>}
                        {l.to === "/faq" && <span className="text-lg leading-none pointer-events-none select-none">❓</span>}
                        <span className={`group-hover:text-gradient group-focus:text-gradient group-active:text-gradient transition-colors ${isActive ? "text-gradient font-semibold" : ""}`}>
                          {l.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(false); setTermsOpen(true); }}
                  className="group flex items-center gap-2.5 w-full text-start py-2 text-white transition-colors"
                >
                  <span className="text-lg leading-none pointer-events-none select-none">📜</span>
                  <span className="group-hover:text-gradient group-active:text-gradient transition-colors">
                    {t("footer.terms")}
                  </span>
                </button>
              </li>
              <li className="pt-2 border-t border-border/40">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center gap-2.5 w-full text-start py-2 text-white hover:text-pink-500 hover:font-semibold active:text-pink-500 active:font-semibold transition-colors">
                      <LogOut className="w-5 h-5 shrink-0 text-pink-500" />
                      {t("nav.logout")}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("nav.logoutConfirmTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("nav.logoutConfirmDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("nav.unsubscribeCancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { setSidebarOpen(false); handleLogout(); }} className="bg-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.55)] hover:bg-pink-600 hover:shadow-[0_0_18px_rgba(236,72,153,0.7)] hover:-translate-y-0.5 transition-all font-semibold">
                        {t("nav.unsubscribeConfirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
              <li>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center gap-2.5 w-full text-start py-2 text-white hover:text-orange-500 hover:font-semibold active:text-orange-500 active:font-semibold transition-colors">
                      <UserMinus className="w-5 h-5 shrink-0 text-orange-500" />
                      {t("nav.unsubscribeShort")}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("nav.unsubscribeConfirmTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("nav.unsubscribeConfirmDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogAction
                        className="bg-[#FF4500] text-white hover:bg-[#FF4500]/90 border-0"
                        onClick={() => { setSidebarOpen(false); toast({ title: t("nav.unsubscribeConfirmTitle"), description: "OK", duration: 2000 }); }}
                      >
                        {t("nav.unsubscribeConfirm")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            </ul>
          </SheetContent>
        </Sheet>
        <div dir="ltr" className={`flex flex-col items-center gap-0.5 font-bold min-w-0 pointer-events-none select-none ${lowerArabicGameLogoOnMobile ? 'max-sm:-translate-y-[8%]' : 'max-sm:-translate-y-[11%]'} max-sm:scale-[1.1025] max-sm:origin-left ${isHome ? (i18n.language === 'ar' ? ' sm:-translate-x-[35%] lg:translate-x-[188%] lg:translate-y-[70%] lg:scale-[67%]' : i18n.language === 'en' ? ' sm:-translate-x-[37%] lg:translate-x-[407%] lg:translate-y-[70%] lg:scale-[135%]' : i18n.language === 'fr' ? ' sm:-translate-x-[39%] lg:translate-x-[407%] lg:translate-y-[70%] lg:scale-[135%]' : ' sm:-translate-x-[35%]') : (i18n.language === 'ar' ? ' sm:-translate-x-[170%]' : i18n.language === 'fr' ? ' sm:-translate-x-[170%]' : ' sm:-translate-x-[180%]')} ${isHome ? 'invisible' : ''} ${arGameShift}`} aria-label="Marbou7a Level Up" aria-hidden={isHome || undefined}>
          <img
            src={i18n.language === "ar" ? marbou7aWordmarkAr : marbou7aWordmark}
            className={`${isHome ? 'h-14 max-[360px]:h-11 xs:h-20 sm:h-20 md:h-24 lg:h-28 -my-1 xs:-my-2 sm:-my-6' : (i18n.language === 'ar' ? 'h-[20px] xs:h-[24px] sm:h-[36px] md:h-[45px] lg:h-[54px] -my-1 xs:-my-1 sm:-my-2' : 'h-14 xs:h-20 sm:h-20 md:h-24 lg:h-28 -my-1 xs:-my-2 sm:-my-4')} w-auto object-contain drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]`}
            alt="Marbou7a"
          />
          <span className={`text-wordmark-gradient font-wordmark ${isHome ? 'text-[11px] xs:text-[13px] sm:text-[19px] md:text-[20px] lg:text-[22px] -mt-4 xs:-mt-5 sm:-mt-6' : (i18n.language === 'ar' ? 'text-[9px] xs:text-[10px] sm:text-[17px] md:text-[18px] lg:text-[21px] -mt-2 xs:-mt-3 sm:-mt-3' : 'text-[12px] xs:text-[13px] sm:text-[18px] md:text-[19px] lg:text-[22px] -mt-3 xs:-mt-4 sm:-mt-5')} font-black tracking-[0.04em] xs:tracking-[0.05em] sm:tracking-[0.08em] uppercase whitespace-nowrap leading-none sm:leading-normal max-sm:[word-spacing:2%] sm:[word-spacing:-3px] ${isHome ? (i18n.language === 'ar' ? 'lg:translate-y-[160%] lg:translate-x-[6%] lg:scale-[190%]' : i18n.language === 'fr' || i18n.language === 'en' ? 'lg:translate-y-[17%] lg:translate-x-[6%]' : '') : (i18n.language === 'ar' ? `${lowerArabicCashOnMobile ? 'max-sm:translate-y-[13px]' : 'max-sm:translate-y-[3px]'} lg:translate-y-[16px]` : 'lg:translate-y-[2%]')}`}>
            CASH
          </span>
        </div>
        {/* Comment jouer (mobile) : visible dans le jeu (hors accueil) */}
        {!isHome && (
          <Button variant="hero" size="sm" onClick={() => setHowToPlayOpen(true)} className="relative z-10 shrink-0 lg:hidden max-xs:h-8 max-xs:px-2 max-xs:text-xs">
            <span aria-hidden className="mr-1 text-lg">🎬</span>
            {t("nav.howToPlay")}
          </Button>
        )}
        <HowToPlayDialog open={howToPlayOpen} onClose={() => setHowToPlayOpen(false)} />
        <div className={`flex items-center gap-1 xs:gap-2 shrink-0 [&_button]:max-xs:h-8 [&_button]:max-xs:px-2 [&_button]:max-xs:text-xs ${hideOnHome}`}>
          <div className={`lg:hidden ${isHome ? '-translate-y-[35%]' : ''} ${isPortal ? '' : brandingScrollCls}`}>
            <LanguageSwitcher />
          </div>
        </div>
        <div className={`hidden lg:flex items-center gap-2 shrink-0 ${isHome ? '-translate-y-[35%]' : ''} ${arGameShift}`}>
          {!isHome && (
            <Button variant="hero" size="sm" onClick={() => setHowToPlayOpen(true)} className="relative z-10 shrink-0">
              <span aria-hidden className="mr-1 text-lg">🎬</span>
              {t("nav.howToPlay")}
            </Button>
          )}
          <div className={isPortal ? '' : brandingScrollCls}>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>
      {/* Termes et conditions : boîte ouverte depuis le sidebar, montée en dehors
          du panneau pour rester affichée une fois le sidebar refermé. */}
      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} />
    </header>
  );
};

export default Navbar;
