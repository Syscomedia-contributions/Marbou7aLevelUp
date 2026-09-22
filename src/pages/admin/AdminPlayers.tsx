import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";

const PAGE_SIZE = 20;

interface Player {
  id: string;
  phone: string;
  pseudo: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  xp: number;
  level: number;
  games_played: number;
}

interface PlayerDetail extends Player {
  badges: { code: string; label: string; emoji: string; earned_at: string }[];
  recentGames: {
    id: string;
    category_key: string;
    status: string;
    correct_count: number;
    wrong_count: number;
    points_earned: number;
    created_at: string;
  }[];
}

export default function AdminPlayers() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PlayerDetail | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    api
      .get<{ items: Player[]; total: number }>(`/admin/players?${params.toString()}`)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => load(), [load]);

  const toggleActive = async (p: Player) => {
    setItems((prev) => prev.map((it) => (it.id === p.id ? { ...it, is_active: !it.is_active } : it)));
    await api.patch(`/admin/players/${p.id}/toggle-active`).catch(() => load());
  };

  const openDetail = (id: string) => {
    api.get<{ player: PlayerDetail }>(`/admin/players/${id}`).then((res) => setDetail(res.player));
  };

  const dateFmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(i18n.language) : t("admin.players.never"));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-gradient">{t("admin.players.title")}</h1>

      <div className="glass-card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("admin.common.search")} value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        </div>
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
                <TableHead>{t("admin.players.pseudo")}</TableHead>
                <TableHead>{t("admin.players.phone")}</TableHead>
                <TableHead>{t("admin.players.level")}</TableHead>
                <TableHead>{t("admin.players.xp")}</TableHead>
                <TableHead>{t("admin.players.gamesPlayed")}</TableHead>
                <TableHead>{t("admin.players.lastLogin")}</TableHead>
                <TableHead>{t("admin.common.status")}</TableHead>
                <TableHead className="text-end">{t("admin.common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.pseudo}</TableCell>
                  <TableCell dir="ltr">{p.phone}</TableCell>
                  <TableCell><Badge variant="outline">{p.level}</Badge></TableCell>
                  <TableCell>{p.xp.toLocaleString()}</TableCell>
                  <TableCell>{p.games_played}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{dateFmt(p.last_login_at)}</TableCell>
                  <TableCell><Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} /></TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={() => openDetail(p.id)} aria-label={t("admin.common.viewDetails")}>
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
          <DialogHeader><DialogTitle>{detail?.pseudo}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="glass-card p-3"><div className="text-xl font-black">{detail.level}</div><div className="text-xs text-muted-foreground">{t("admin.players.level")}</div></div>
                <div className="glass-card p-3"><div className="text-xl font-black">{detail.xp}</div><div className="text-xs text-muted-foreground">{t("admin.players.xp")}</div></div>
                <div className="glass-card p-3"><div className="text-xl font-black">{detail.games_played}</div><div className="text-xs text-muted-foreground">{t("admin.players.gamesPlayed")}</div></div>
              </div>

              {detail.badges.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground mb-2">{t("admin.players.badges")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {detail.badges.map((b) => (
                      <Badge key={b.code} variant="secondary">{b.emoji} {b.label}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-muted-foreground mb-2">{t("admin.players.recentGames")}</h3>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {detail.recentGames.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-sm rounded-lg bg-card/60 px-3 py-2">
                      <span className="capitalize">{g.category_key}</span>
                      <span className="text-muted-foreground">{g.correct_count}✓ / {g.wrong_count}✗</span>
                      <span className="font-semibold text-primary">+{g.points_earned}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
