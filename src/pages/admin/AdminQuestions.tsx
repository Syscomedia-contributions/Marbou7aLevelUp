import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Search, CheckCircle2, Circle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";

const CATEGORIES = ["science", "sport", "history", "archeo", "ent", "art"] as const;
const KINDS = ["mcq", "truefalse", "image", "matching", "whoami", "sound", "puzzle"] as const;
const TILE_POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
// Difficulty is no longer shown/editable in the Admin UI, but the backend
// still requires the field on every create/update — new questions get this
// default, and editing a question keeps whatever difficulty it already has
// (see openEdit/handleSubmit) so existing data is never silently overwritten.
const DEFAULT_DIFFICULTY = "moyen";
const PAGE_SIZE = 20;

interface Pair {
  left: string;
  right: string;
}

interface PuzzleTile {
  id: string;
  label: string;
  imageUrl: string;
  imagePosition: (typeof TILE_POSITIONS)[number];
}

interface Question {
  id: string;
  category_key: string;
  difficulty: string;
  subcategory: string;
  kind: string;
  question: string;
  choices: string[] | null;
  answer_index: number | null;
  image_url: string | null;
  image_emoji: string | null;
  audio_url: string | null;
  pairs: Pair[] | null;
  clues: string[] | null;
  puzzle_tiles: PuzzleTile[] | null;
  fun_fact: string;
  is_active: boolean;
}

interface FormState {
  categoryKey: string;
  difficulty: string;
  subcategory: string;
  kind: string;
  question: string;
  choices: string[];
  answerIndex: number;
  imageUrl: string;
  imageEmoji: string;
  audioUrl: string;
  pairs: Pair[];
  clues: string[];
  puzzleTiles: PuzzleTile[];
  funFact: string;
}

const emptyPuzzleTiles = (): PuzzleTile[] =>
  TILE_POSITIONS.map((position, i) => ({
    id: `t${i + 1}`,
    label: "",
    imageUrl: "",
    imagePosition: position,
  }));

const emptyForm: FormState = {
  categoryKey: CATEGORIES[0],
  difficulty: DEFAULT_DIFFICULTY,
  subcategory: "",
  kind: "mcq",
  question: "",
  choices: ["", "", "", ""],
  answerIndex: 0,
  imageUrl: "",
  imageEmoji: "",
  audioUrl: "",
  pairs: [
    { left: "", right: "" },
    { left: "", right: "" },
  ],
  clues: ["", "", ""],
  puzzleTiles: emptyPuzzleTiles(),
  funFact: "",
};

export default function AdminQuestions() {
  const { t } = useTranslation();

  const [items, setItems] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter !== "all") params.set("categoryKey", categoryFilter);
    if (activeFilter !== "all") params.set("active", activeFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));

    api
      .get<{ items: Question[]; total: number }>(`/admin/questions?${params.toString()}`)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [search, categoryFilter, activeFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditingId(q.id);
    setForm({
      categoryKey: q.category_key,
      difficulty: q.difficulty,
      subcategory: q.subcategory,
      kind: q.kind || "mcq",
      question: q.question,
      choices: q.choices?.length ? q.choices : ["", ""],
      answerIndex: q.answer_index ?? 0,
      imageUrl: q.image_url || "",
      imageEmoji: q.image_emoji || "",
      audioUrl: q.audio_url || "",
      pairs: q.pairs?.length
        ? q.pairs
        : [
            { left: "", right: "" },
            { left: "", right: "" },
          ],
      clues: q.clues?.length ? q.clues : ["", "", ""],
      puzzleTiles: q.puzzle_tiles?.length === 4 ? q.puzzle_tiles : emptyPuzzleTiles(),
      funFact: q.fun_fact,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const updateChoice = (i: number, value: string) => {
    setForm((f) => ({ ...f, choices: f.choices.map((c, idx) => (idx === i ? value : c)) }));
  };

  const addChoice = () => {
    setForm((f) => (f.choices.length >= 6 ? f : { ...f, choices: [...f.choices, ""] }));
  };

  const removeChoice = (i: number) => {
    setForm((f) => {
      if (f.choices.length <= 2) return f;
      const choices = f.choices.filter((_, idx) => idx !== i);
      const answerIndex = f.answerIndex === i ? 0 : f.answerIndex > i ? f.answerIndex - 1 : f.answerIndex;
      return { ...f, choices, answerIndex };
    });
  };

  const updatePair = (i: number, side: "left" | "right", value: string) => {
    setForm((f) => ({ ...f, pairs: f.pairs.map((p, idx) => (idx === i ? { ...p, [side]: value } : p)) }));
  };

  const addPair = () => {
    setForm((f) => (f.pairs.length >= 8 ? f : { ...f, pairs: [...f.pairs, { left: "", right: "" }] }));
  };

  const removePair = (i: number) => {
    setForm((f) => (f.pairs.length <= 2 ? f : { ...f, pairs: f.pairs.filter((_, idx) => idx !== i) }));
  };

  const updateClue = (i: number, value: string) => {
    setForm((f) => ({ ...f, clues: f.clues.map((c, idx) => (idx === i ? value : c)) }));
  };

  const addClue = () => {
    setForm((f) => (f.clues.length >= 6 ? f : { ...f, clues: [...f.clues, ""] }));
  };

  const removeClue = (i: number) => {
    setForm((f) => (f.clues.length <= 1 ? f : { ...f, clues: f.clues.filter((_, idx) => idx !== i) }));
  };

  const updateTile = (i: number, patch: Partial<PuzzleTile>) => {
    setForm((f) => ({ ...f, puzzleTiles: f.puzzleTiles.map((tl, idx) => (idx === i ? { ...tl, ...patch } : tl)) }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.question.trim()) return;

    const payload: Record<string, unknown> = {
      categoryKey: form.categoryKey,
      difficulty: form.difficulty,
      subcategory: form.subcategory || undefined,
      kind: form.kind,
      question: form.question.trim(),
      funFact: form.funFact,
      imageUrl: form.imageUrl.trim() || undefined,
      imageEmoji: form.imageEmoji.trim() || undefined,
      audioUrl: form.audioUrl.trim() || undefined,
    };

    if (form.kind === "matching") {
      const pairs = form.pairs
        .map((p) => ({ left: p.left.trim(), right: p.right.trim() }))
        .filter((p) => p.left && p.right);
      if (pairs.length < 2) {
        setFormError(t("admin.questions.pairs") + " ≥ 2");
        return;
      }
      payload.pairs = pairs;
    } else if (form.kind === "puzzle") {
      const tiles = form.puzzleTiles.map((tl) => ({ ...tl, label: tl.label.trim(), imageUrl: tl.imageUrl.trim() }));
      if (tiles.some((tl) => !tl.label || !tl.imageUrl)) {
        setFormError(t("admin.questions.puzzleTiles") + " (4)");
        return;
      }
      payload.puzzleTiles = tiles;
    } else {
      const choices = form.choices.map((c) => c.trim()).filter(Boolean);
      if (choices.length < 2) {
        setFormError(t("admin.questions.choices") + " ≥ 2");
        return;
      }
      payload.choices = choices;
      payload.answerIndex = Math.min(form.answerIndex, choices.length - 1);
      if (form.kind === "whoami") {
        const clues = form.clues.map((c) => c.trim()).filter(Boolean);
        if (clues.length < 1) {
          setFormError(t("admin.questions.clues") + " ≥ 1");
          return;
        }
        payload.clues = clues;
      }
      if (form.kind === "sound" && !form.audioUrl.trim()) {
        setFormError(t("admin.questions.audioUrl"));
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/questions/${editingId}`, payload);
      } else {
        await api.post("/admin/questions", payload);
      }
      setDialogOpen(false);
      load();
    } catch {
      setFormError(t("admin.login.errorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (q: Question) => {
    setItems((prev) => prev.map((it) => (it.id === q.id ? { ...it, is_active: !it.is_active } : it)));
    try {
      await api.patch(`/admin/questions/${q.id}/toggle`);
    } catch {
      load();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await api.delete(`/admin/questions/${deleteTarget.id}`);
    setDeleteTarget(null);
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-gradient">{t("admin.questions.title")}</h1>
        <Button variant="hero" size="sm" onClick={openCreate} className="gap-1.5 w-fit">
          <Plus className="w-4 h-4" /> {t("admin.common.add")}
        </Button>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("admin.common.search")}
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setPage(1); setCategoryFilter(v); }}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder={t("admin.questions.filterAllCategories")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.questions.filterAllCategories")}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{t(`hero.categories.${c === "sport" ? "sport" : c}`, c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={(v) => { setPage(1); setActiveFilter(v); }}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.common.status")}</SelectItem>
            <SelectItem value="true">{t("admin.common.active")}</SelectItem>
            <SelectItem value="false">{t("admin.common.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card p-0 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">{t("admin.common.noResults")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.questions.question")}</TableHead>
                <TableHead>{t("admin.questions.category")}</TableHead>
                <TableHead>{t("admin.questions.kind")}</TableHead>
                <TableHead>{t("admin.common.status")}</TableHead>
                <TableHead className="text-end">{t("admin.common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="max-w-sm truncate font-medium">{q.question}</TableCell>
                  <TableCell><Badge variant="outline">{q.category_key}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {t(`admin.questions.kind${(q.kind || "mcq").charAt(0).toUpperCase()}${(q.kind || "mcq").slice(1)}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q)} />
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(q)} aria-label={t("admin.common.edit")}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(q)} aria-label={t("admin.common.delete")}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t("admin.common.previous")}
          </Button>
          <span className="text-muted-foreground">{t("admin.common.pageOf", { page, total: totalPages })}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            {t("admin.common.next")}
          </Button>
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t("admin.questions.editTitle") : t("admin.questions.addTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("admin.questions.category")}</Label>
              <Select value={form.categoryKey} onValueChange={(v) => setForm((f) => ({ ...f, categoryKey: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("admin.questions.kind")}</Label>
              <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`admin.questions.kind${k.charAt(0).toUpperCase()}${k.slice(1)}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("admin.questions.subcategory")}</Label>
              <Input value={form.subcategory} onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>{t("admin.questions.question")}</Label>
              <Textarea
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("admin.questions.imageUrl")}</Label>
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.questions.imageEmoji")}</Label>
                <Input
                  value={form.imageEmoji}
                  onChange={(e) => setForm((f) => ({ ...f, imageEmoji: e.target.value }))}
                  placeholder="🖼️"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("admin.questions.audioUrl")}</Label>
              <Input
                value={form.audioUrl}
                onChange={(e) => setForm((f) => ({ ...f, audioUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {form.kind === "matching" ? (
              <div className="space-y-2">
                <Label>{t("admin.questions.pairs")}</Label>
                {form.pairs.map((pair, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={pair.left}
                      placeholder={t("admin.questions.pairLeft")}
                      onChange={(e) => updatePair(i, "left", e.target.value)}
                    />
                    <span className="text-muted-foreground shrink-0">→</span>
                    <Input
                      value={pair.right}
                      placeholder={t("admin.questions.pairRight")}
                      onChange={(e) => updatePair(i, "right", e.target.value)}
                    />
                    {form.pairs.length > 2 && (
                      <button type="button" onClick={() => removePair(i)} className="shrink-0 text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {form.pairs.length < 8 && (
                  <Button type="button" variant="outline" size="sm" onClick={addPair} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> {t("admin.questions.pairs")}
                  </Button>
                )}
              </div>
            ) : form.kind === "puzzle" ? (
              <div className="space-y-3">
                <Label>{t("admin.questions.puzzleTiles")}</Label>
                {form.puzzleTiles.map((tile, i) => (
                  <div key={tile.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <Input
                      value={tile.label}
                      placeholder={t("admin.questions.tileLabel")}
                      onChange={(e) => updateTile(i, { label: e.target.value })}
                    />
                    <Input
                      value={tile.imageUrl}
                      placeholder={t("admin.questions.tileImageUrl")}
                      onChange={(e) => updateTile(i, { imageUrl: e.target.value })}
                    />
                    <Select value={tile.imagePosition} onValueChange={(v) => updateTile(i, { imagePosition: v as PuzzleTile["imagePosition"] })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TILE_POSITIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {t(`admin.questions.tilePosition${p.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("")}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t("admin.questions.choices")} — {t("admin.questions.correctAnswer")}</Label>
                {form.choices.map((choice, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, answerIndex: i }))}
                      aria-label={t("admin.questions.correctAnswer")}
                      className="shrink-0"
                    >
                      {form.answerIndex === i ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    <Input
                      value={choice}
                      placeholder={t("admin.questions.choicePlaceholder", { n: i + 1 })}
                      onChange={(e) => updateChoice(i, e.target.value)}
                    />
                    {form.choices.length > 2 && (
                      <button type="button" onClick={() => removeChoice(i)} className="shrink-0 text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {form.choices.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={addChoice} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> {t("admin.questions.choices")}
                  </Button>
                )}
              </div>
            )}

            {form.kind === "whoami" && (
              <div className="space-y-2">
                <Label>{t("admin.questions.clues")}</Label>
                {form.clues.map((clue, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={clue}
                      placeholder={t("admin.questions.cluePlaceholder", { n: i + 1 })}
                      onChange={(e) => updateClue(i, e.target.value)}
                    />
                    {form.clues.length > 1 && (
                      <button type="button" onClick={() => removeClue(i)} className="shrink-0 text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {form.clues.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={addClue} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> {t("admin.questions.clues")}
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{t("admin.questions.funFact")}</Label>
              <Textarea value={form.funFact} onChange={(e) => setForm((f) => ({ ...f, funFact: e.target.value }))} rows={2} />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("admin.common.cancel")}</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={saving}>
                {saving ? t("admin.common.loading") : t("admin.common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.common.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.questions.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("admin.common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
