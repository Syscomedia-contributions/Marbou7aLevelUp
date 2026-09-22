import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldAlert, ScanLine, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

const PAGE_SIZE = 20;

interface Flag {
  id: string;
  session_id: string;
  reason: string;
  severity: "low" | "medium" | "high";
  detected_at: string;
  resolved: boolean;
  resolved_at: string | null;
  player_pseudo: string | null;
  player_phone: string | null;
  category_key: string | null;
  correct_count: number | null;
  wrong_count: number | null;
}

const severityTone: Record<string, "default" | "secondary" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export default function AdminAntiCheat() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<Flag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resolvedFilter, setResolvedFilter] = useState<string>("false");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (resolvedFilter !== "all") params.set("resolved", resolvedFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    api
      .get<{ items: Flag[]; total: number }>(`/admin/anticheat?${params.toString()}`)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [resolvedFilter, page]);

  useEffect(() => load(), [load]);

  const scan = async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await api.post<{ created: number }>("/admin/anticheat/scan");
      setScanMsg(t("admin.anticheat.scanResult", { n: res.created }));
      load();
    } finally {
      setScanning(false);
    }
  };

  const resolve = async (id: string) => {
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, resolved: true } : f)));
    await api.patch(`/admin/anticheat/${id}/resolve`).catch(() => load());
  };

  const reasonLabel = (reason: string) =>
    reason === "fast_answers" ? t("admin.anticheat.reasonFastAnswers") : reason === "perfect_streak" ? t("admin.anticheat.reasonPerfectStreak") : reason;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-gradient flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" /> {t("admin.anticheat.title")}
        </h1>
        <Button variant="hero" size="sm" onClick={scan} disabled={scanning} className="gap-1.5 w-fit">
          <ScanLine className="w-4 h-4" /> {scanning ? t("admin.anticheat.scanning") : t("admin.anticheat.scanButton")}
        </Button>
      </div>

      {scanMsg && <p className="text-sm text-primary">{scanMsg}</p>}

      <div className="glass-card p-4">
        <Select value={resolvedFilter} onValueChange={(v) => { setPage(1); setResolvedFilter(v); }}>
          <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.anticheat.filterAll")}</SelectItem>
            <SelectItem value="false">{t("admin.anticheat.filterUnresolved")}</SelectItem>
            <SelectItem value="true">{t("admin.anticheat.filterResolved")}</SelectItem>
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
                <TableHead>{t("admin.anticheat.reason")}</TableHead>
                <TableHead>{t("admin.anticheat.severity")}</TableHead>
                <TableHead>{t("admin.games.category")}</TableHead>
                <TableHead>{t("admin.anticheat.detectedAt")}</TableHead>
                <TableHead>{t("admin.common.status")}</TableHead>
                <TableHead className="text-end">{t("admin.common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.player_pseudo || "—"}</TableCell>
                  <TableCell>{reasonLabel(f.reason)}</TableCell>
                  <TableCell><Badge variant={severityTone[f.severity]}>{t(`admin.anticheat.severity${f.severity.charAt(0).toUpperCase()}${f.severity.slice(1)}`)}</Badge></TableCell>
                  <TableCell className="capitalize">{f.category_key || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(f.detected_at).toLocaleString(i18n.language)}</TableCell>
                  <TableCell>
                    {f.resolved ? (
                      <Badge variant="secondary">{t("admin.common.resolved")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("admin.common.unresolved")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    {!f.resolved && (
                      <Button variant="ghost" size="icon" onClick={() => resolve(f.id)} aria-label={t("admin.common.resolve")}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
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
    </div>
  );
}
