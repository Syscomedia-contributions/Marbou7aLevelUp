import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { api } from "@/lib/api";

interface Point {
  day: string;
  n: number;
}

export default function AdminStats() {
  const { t } = useTranslation();
  const [signups, setSignups] = useState<Point[]>([]);
  const [gamesPerDay, setGamesPerDay] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ signups: Point[]; gamesPerDay: Point[] }>("/admin/stats/charts")
      .then((res) => {
        setSignups(res.signups);
        setGamesPerDay(res.gamesPerDay);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-gradient">{t("admin.stats.title")}</h1>

      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4">{t("admin.dashboard.signups")}</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={signups}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 25%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(220 15% 65%)" }} tickFormatter={(d) => d.slice(5, 10)} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220 15% 65%)" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(224 45% 12%)", border: "1px solid hsl(222 30% 30%)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="n" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} name={t("admin.dashboard.signups")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4">{t("admin.dashboard.gamesPerDay")}</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={gamesPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 25%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(220 15% 65%)" }} tickFormatter={(d) => d.slice(5, 10)} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220 15% 65%)" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(224 45% 12%)", border: "1px solid hsl(222 30% 30%)", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="n" stroke="hsl(187 85% 53%)" strokeWidth={2} dot={false} name={t("admin.dashboard.gamesPerDay")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
