import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, Gamepad2, Activity, Coins, Loader2, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { api } from "@/lib/api";

interface StatsSummary {
  totalPlayers: number;
  activePlayers: number;
  totalGames: number;
  gamesInProgress: number;
  totalEarnings: number;
  openAlerts: number;
}

interface ChartPoint {
  day: string;
  n: number;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "primary" | "gold" | "cyan" | "violet";
}) => {
  const toneCls =
    tone === "gold"
      ? "bg-gradient-gold text-gold-foreground"
      : tone === "cyan"
      ? "bg-gradient-cyan text-cyan-foreground"
      : tone === "violet"
      ? "bg-gradient-violet text-accent-foreground"
      : "bg-gradient-primary text-primary-foreground";
  return (
    <div className="glass-card p-4 flex items-center gap-3 overflow-hidden relative transition-transform hover:scale-[1.02] hover:shadow-glow">
      <span className={`grid place-items-center w-11 h-11 rounded-2xl shrink-0 shadow-glow ${toneCls}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-black leading-none text-foreground">{value.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground font-semibold mt-1 truncate">{label}</div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [gamesPerDay, setGamesPerDay] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<StatsSummary>("/admin/stats/summary"),
      api.get<{ signups: ChartPoint[]; gamesPerDay: ChartPoint[] }>("/admin/stats/charts"),
    ])
      .then(([s, c]) => {
        setSummary(s);
        setGamesPerDay(c.gamesPerDay);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-gradient">{t("admin.dashboard.title")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label={t("admin.dashboard.totalPlayers")} value={summary?.totalPlayers ?? 0} tone="primary" />
        <StatCard icon={Activity} label={t("admin.dashboard.activePlayers")} value={summary?.activePlayers ?? 0} tone="cyan" />
        <StatCard icon={Gamepad2} label={t("admin.dashboard.totalGames")} value={summary?.totalGames ?? 0} tone="violet" />
        <StatCard icon={Gamepad2} label={t("admin.dashboard.gamesInProgress")} value={summary?.gamesInProgress ?? 0} tone="primary" />
        <StatCard icon={Coins} label={t("admin.dashboard.totalEarnings")} value={summary?.totalEarnings ?? 0} tone="gold" />
        <StatCard icon={ShieldAlert} label={t("admin.dashboard.openAlerts")} value={summary?.openAlerts ?? 0} tone="cyan" />
      </div>

      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4">
          {t("admin.dashboard.gamesPerDay")}
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gamesPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 25%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(220 15% 65%)" }} tickFormatter={(d) => d.slice(5, 10)} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220 15% 65%)" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(224 45% 12%)", border: "1px solid hsl(222 30% 30%)", borderRadius: 8 }} />
              <Bar dataKey="n" fill="hsl(187 85% 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
