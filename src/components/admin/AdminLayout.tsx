import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LanguageSwitcher from "@/components/landing/LanguageSwitcher";
import { AdminSidebar } from "./AdminSidebar";
import { clearSession, getCurrentUser } from "@/lib/auth";

export default function AdminLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const admin = getCurrentUser();
  const isRtl = i18n.language === "ar";

  const handleLogout = () => {
    clearSession();
    navigate("/admin/login");
  };

  return (
    // No bg-background here on purpose: <body> already carries the site's
    // signature --gradient-hero (Stargate space glow), and letting it show
    // through — instead of covering it with a flat color like before — is
    // what makes the admin section read as part of the same game universe.
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen min-h-[100dvh] flex relative">
      {/* Ambient glow orbs, same palette as the rest of Marbou7a */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-cyan/15 blur-3xl animate-float" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-gold/10 blur-3xl animate-float-slow" />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-e border-border/60 bg-card/40 backdrop-blur-xl">
        <AdminSidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="glass-card !rounded-none border-x-0 border-t-0 relative flex items-center justify-between gap-3 px-4 py-3">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-primary opacity-60" aria-hidden />
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("admin.sidebar.dashboard")}>
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRtl ? "right" : "left"} className="w-72 p-0">
                <AdminSidebar onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-wordmark text-sm font-black uppercase tracking-[0.08em] text-wordmark-gradient lg:hidden">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {admin && (
              <span className="hidden sm:inline text-sm text-muted-foreground font-medium px-2">
                {admin.pseudo}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t("admin.logout")}</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
