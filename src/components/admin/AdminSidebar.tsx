import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home,
  Users,
  Gamepad2,
  HelpCircle,
  Trophy,
  Coins,
  ShieldAlert,
  BarChart3,
  Settings,
} from "lucide-react";
import marbou7aWordmark from "@/assets/marbou7a-wordmark.png";
import marbou7aWordmarkAr from "@/assets/marbou7a-wordmark-ar.png";

const LINKS = [
  { to: "/admin", key: "dashboard", Icon: Home, end: true },
  { to: "/admin/players", key: "players", Icon: Users },
  { to: "/admin/games", key: "games", Icon: Gamepad2 },
  { to: "/admin/questions", key: "questions", Icon: HelpCircle },
  { to: "/admin/leaderboard", key: "leaderboard", Icon: Trophy },
  { to: "/admin/earnings", key: "earnings", Icon: Coins },
  { to: "/admin/anticheat", key: "anticheat", Icon: ShieldAlert },
  { to: "/admin/stats", key: "stats", Icon: BarChart3 },
  { to: "/admin/settings", key: "settings", Icon: Settings },
] as const;

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { t, i18n } = useTranslation();

  return (
    <nav className="flex flex-col gap-1 p-3">
      <div className="relative flex justify-center py-6 mb-2">
        {/* Portal-style glow halo behind the logo, same palette as the
            homepage Stargate — pure ambiance, no layout impact. */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-primary/25 blur-2xl animate-pulse"
          aria-hidden
        />
        {/* Exact same lockup as the site's logo everywhere else: the
            MARBOU7A image with "CASH" tucked tightly underneath it. */}
        <div dir="ltr" className="relative flex flex-col items-center gap-0 select-none">
          <img
            src={i18n.language === "ar" ? marbou7aWordmarkAr : marbou7aWordmark}
            alt="Marbou7a"
            className="h-24 w-auto object-contain drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
          />
          <span className="text-wordmark-gradient font-wordmark text-lg -mt-8 font-black tracking-[0.06em] uppercase whitespace-nowrap leading-none">
            Cash
          </span>
        </div>
      </div>

      {LINKS.map(({ to, key, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              isActive
                ? "bg-gradient-primary text-primary-foreground shadow-glow scale-[1.02]"
                : "text-foreground/80 hover:bg-card hover:text-foreground hover:translate-x-0.5"
            }`
          }
        >
          <Icon className="w-5 h-5 shrink-0" />
          <span>{t(`admin.sidebar.${key}`)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
