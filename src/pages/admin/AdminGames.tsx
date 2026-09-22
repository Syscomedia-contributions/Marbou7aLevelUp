import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";

const PAGE_SIZE = 20;
const STATUSES = ["in_progress", "completed", "abandoned"] as const;

interface Game {
  id: string;
  category_key: string;
  status: string;
  correct_count: number;
  wrong_count: number;
  points_earned: number;
  created_at: string;
  player_pseudo: string | null;
  player_phone: string | null;
}

interface GameDetail extends Game {
  answers: { question_id: string; question: string; choice_index: number | null; is_correct: boolean; time_ms: number | null }[];
}

const statusTone: Record<string, "default" | "secondary" | "outline"> = {
  in_progress: "secondary",
  completed: "default",
  abandoned: "outline",
};

export default function AdminGames() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<GameDetail | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    api
      .get<{ items: Game[]; total: number }>(`/admin/games?${params.toString()}`)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => load(), [load]);

  const openDetail = (id: string) => {
    api.get<{ game: GameDetail }>(`/admin/games/${id}`).then((res) => setDetail(res.game));
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-gradient">{t("admin.games.title")}</h1>

      <div className="glass-card p-4">
        <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.games.filterAll")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`admin.games.status${s === "in_progress" ? "InProgress" : s === "completed" ? "Completed" : "Abandoned"}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card p-0 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{t("admin.common.noResults")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.games.player")}</TableHead>
                <TableHead>{t("admin.games.category")}</TableHead>
                <TableHead>{t("admin.games.status")}</TableHead>
                <TableHead>{t("admin.games.correct")}/{t("admin.games.wrong")}</TableHead>
                <TableHead>{t("admin.games.points")}</TableHead>
                <TableHead>{t("admin.games.date")}</TableHead>
                <TableHead className="text-end">{t("admin.common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.player_pseudo || t("admin.games.guest")}</TableCell>
                  <TableCell className="capitalize">{g.category_key}</TableCell>
                  <TableCell><Badge variant={statusTone[g.status]}>{g.status}</Badge></TableCell>
                  <TableCell>{g.correct_count} / {g.wrong_count}</TableCell>
                  <TableCell className="font-semibold text-primary">{g.points_earned}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(g.created_at).toLocaleString(i18n.language)}</TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={() => openDetail(g.id)} aria-label={t("admin.common.viewDetails")}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("admin.common.previous")}</Button>
          <span className="text-muted-foreground">{t("admin.common.pageOf", { page, total: totalPages })}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{t("admin.common.next")}</Button>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.player_pseudo || t("admin.games.guest")} — {detail?.category_key}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-1.5">
              {detail.answers.map((a) => (
                <div key={a.question_id} className={`rounded-lg px-3 py-2 text-sm ${a.is_correct ? "bg-quiz-correct-surface" : "bg-quiz-incorrect-surface"}`}>
                  <div className="font-medium">{a.question}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {a.is_correct ? "✓" : "✗"} {a.time_ms ? `· ${a.time_ms}ms` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
