import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Crown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

interface Row {
  id: string;
  pseudo: string;
  phone: string;
  xp: number;
  level: number;
  games_played: number;
}

export default function AdminLeaderboard() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ leaderboard: Row[] }>("/admin/leaderboard")
      .then((res) => setRows(res.leaderboard))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-gradient">{t("admin.leaderboard.title")}</h1>

      <div className="glass-card p-0 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{t("admin.common.noResults")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t("admin.leaderboard.rank")}</TableHead>
                <TableHead>{t("admin.players.pseudo")}</TableHead>
                <TableHead>{t("admin.players.phone")}</TableHead>
                <TableHead>{t("admin.players.level")}</TableHead>
                <TableHead>{t("admin.players.xp")}</TableHead>
                <TableHead>{t("admin.players.gamesPlayed")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="font-black">
                    {i < 3 ? <Crown className={`w-4 h-4 inline ${i === 0 ? "text-gold" : i === 1 ? "text-muted-foreground" : "text-amber-700"}`} /> : i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{r.pseudo}</TableCell>
                  <TableCell dir="ltr">{r.phone}</TableCell>
                  <TableCell>{r.level}</TableCell>
                  <TableCell className="font-semibold text-primary">{r.xp.toLocaleString()}</TableCell>
                  <TableCell>{r.games_played}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
