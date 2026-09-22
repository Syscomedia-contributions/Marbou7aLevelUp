import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Coins, Trophy, Gamepad2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

interface Summary {
  total_points: number;
  total_bonus: number;
  total_sessions: number;
}
interface CategoryRow {
  category_key: string;
  points: number;
  sessions: number;
}
interface TimePoint {
  day: string;
  points: number;
}

export default function AdminEarnings() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byCategory, setByCategory] = useState<CategoryRow[]>([]);
  const [timeseries, setTimeseries] = useState<TimePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ summary: Summary; byCategory: CategoryRow[] }>("/admin/earnings/summary"),
      api.get<{ timeseries: TimePoint[] }>("/admin/earnings/timeseries"),
    ])
      .then(([s, ts]) => {
        setSummary(s.summary);
        setByCategory(s.byCategory);
        setTimeseries(ts.timeseries);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-gradient">{t("admin.earnings.title")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-gradient-gold text-gold-foreground shadow-gold"><Coins className="w-5 h-5" /></span>
          <div><div className="text-2xl font-black">{(summary?.total_points ?? 0).toLocaleString()}</div><div className="text-xs text-muted-foreground font-semibold">{t("admin.earnings.totalPoints")}</div></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-gradient-violet text-accent-foreground shadow-violet"><Trophy className="w-5 h-5" /></span>
          <div><div className="text-2xl font-black">{(summary?.total_bonus ?? 0).toLocaleString()}</div><div className="text-xs text-muted-foreground font-semibold">{t("admin.earnings.totalBonus")}</div></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"><Gamepad2 className="w-5 h-5" /></span>
          <div><div className="text-2xl font-black">{(summary?.total_sessions ?? 0).toLocaleString()}</div><div className="text-xs text-muted-foreground font-semibold">{t("admin.earnings.totalSessions")}</div></div>
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4">{t("admin.earnings.timeseries")}</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 25%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(220 15% 65%)" }} tickFormatter={(d) => d.slice(5, 10)} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220 15% 65%)" }} />
              <Tooltip contentStyle={{ background: "hsl(224 45% 12%)", border: "1px solid hsl(222 30% 30%)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="points" stroke="hsl(43 96% 60%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-0 overflow-x-auto">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground px-4 pt-4">{t("admin.earnings.byCategory")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.games.category")}</TableHead>
              <TableHead>{t("admin.earnings.totalPoints")}</TableHead>
              <TableHead>{t("admin.earnings.totalSessions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byCategory.map((c) => (
              <TableRow key={c.category_key}>
                <TableCell className="capitalize font-medium">{c.category_key}</TableCell>
                <TableCell className="font-semibold text-primary">{c.points.toLocaleString()}</TableCell>
                <TableCell>{c.sessions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
