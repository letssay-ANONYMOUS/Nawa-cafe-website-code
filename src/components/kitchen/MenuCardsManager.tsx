import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ArrowLeft, ImageIcon, LayoutGrid, Plus, RefreshCw, Save, Search, Trash2, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useMenuCards,
  menuSections,
  defaultSectionIdForCard,
  type MenuCard,
} from "@/hooks/useMenuCards";
import { useQueryClient } from "@tanstack/react-query";

const SECTION_KEY = "kitchen_menu_card_section";
const ALL_ID = "__all__";

interface EditForm {
  name: string;
  price: string;
  description: string;
  image_url: string;
  section: string; // section id, "" = default
}

const sectionNameById = (id: string | null): string => {
  if (!id) return "—";
  return menuSections.find((s) => s.id === id)?.name ?? "—";
};

const effectiveSectionId = (card: MenuCard): string | null =>
  card.section || defaultSectionIdForCard(card.id);

const getCardIdFromPath = (pathname: string): number | null => {
  const m = pathname.match(/\/admin\/kitchen\/menu-cards\/(\d+)/);
  return m ? Number(m[1]) : null;
};

export function MenuCardsManager() {
  const { data: cards = [], isLoading, refetch } = useMenuCards();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeSection, setActiveSection] = useState<string>(
    () => localStorage.getItem(SECTION_KEY) || ALL_ID,
  );
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectedId = getCardIdFromPath(location.pathname);
  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedId) ?? null,
    [cards, selectedId],
  );

  useEffect(() => {
    if (!selectedCard) {
      setForm(null);
      return;
    }
    setForm({
      name: selectedCard.name ?? "",
      price: selectedCard.price ?? "",
      description: selectedCard.description ?? "",
      image_url: selectedCard.image_url ?? "",
      section: selectedCard.section ?? "",
    });
  }, [selectedCard]);

  const filtered = useMemo(() => {
    let list = cards;
    if (activeSection !== ALL_ID) {
      list = list.filter((c) => effectiveSectionId(c) === activeSection);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        [c.name, c.description, c.price, String(c.id), sectionNameById(effectiveSectionId(c))]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return [...list].sort((a, b) => a.id - b.id);
  }, [cards, activeSection, search]);

  const handleSectionChange = (id: string) => {
    setActiveSection(id);
    localStorage.setItem(SECTION_KEY, id);
    navigate("/admin/kitchen/menu-cards");
  };

  const openCard = (card: MenuCard) => {
    navigate(`/admin/kitchen/menu-cards/${card.id}`);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCard) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `menu-cards/${selectedCard.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("menu-images")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      setForm((f) => (f ? { ...f, image_url: data.publicUrl } : f));
      toast({ title: "Image uploaded" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not upload image.";
      toast({ variant: "destructive", title: "Upload failed", description: msg });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!selectedCard || !form) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("menu_cards")
        .update({
          name: form.name || null,
          price: form.price || null,
          description: form.description || null,
          image_url: form.image_url || null,
          section: form.section || null,
        })
        .eq("id", selectedCard.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["menu-cards"] });
      toast({ title: "Saved", description: `Card #${selectedCard.id} updated.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save.";
      toast({ variant: "destructive", title: "Save failed", description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    try {
      const maxId = cards.reduce((m, c) => (c.id > m ? c.id : m), 0);
      const nextId = Math.max(maxId + 1, 200);
      const sectionForNew = activeSection !== ALL_ID ? activeSection : null;
      const { error } = await supabase.from("menu_cards").insert({
        id: nextId,
        name: "New Card",
        price: "",
        description: "",
        image_url: null,
        section: sectionForNew,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["menu-cards"] });
      toast({ title: "Card created", description: `New card #${nextId}.` });
      navigate(`/admin/kitchen/menu-cards/${nextId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create card.";
      toast({ variant: "destructive", title: "Create failed", description: msg });
    }
  };

  const handleDelete = async () => {
    if (!selectedCard) return;
    try {
      const { error } = await supabase.from("menu_cards").delete().eq("id", selectedCard.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["menu-cards"] });
      toast({ title: "Card deleted", description: `Card #${selectedCard.id} removed.` });
      navigate("/admin/kitchen/menu-cards");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete card.";
      toast({ variant: "destructive", title: "Delete failed", description: msg });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ────────────── Detail page ──────────────
  if (selectedId && selectedCard && form) {
    const previewImage = form.image_url || selectedCard.image_url || "";
    const previewName = form.name || "Untitled";
    const previewPrice = form.price || "—";
    const previewDescription = form.description || "";
    const sectionLabel = sectionNameById(form.section || defaultSectionIdForCard(selectedCard.id));

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate("/admin/kitchen/menu-cards")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Menu Cards
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete card #{selectedCard.id}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes "{selectedCard.name || "Untitled"}" from the public menu. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSave} disabled={saving || uploading}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving…" : "Save Card"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(280px,420px)_1fr]">
          {/* Preview card */}
          <Card className="overflow-hidden self-start border-coffee-200">
            <div className="relative overflow-hidden aspect-[4/3] bg-muted">
              {previewImage ? (
                <img src={previewImage} alt={previewName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs">
                #{selectedCard.id}
              </div>
            </div>
            <CardHeader>
              <CardDescription className="text-xs uppercase tracking-wider">
                {sectionLabel}
              </CardDescription>
              <CardTitle className="font-playfair text-2xl leading-tight">{previewName}</CardTitle>
              <CardDescription className="leading-relaxed">{previewDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-primary">{previewPrice}</span>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="outline" disabled>
                Preview only
              </Button>
            </CardFooter>
          </Card>

          {/* Edit form */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Edit Card Details</CardTitle>
                <CardDescription>Changes update the public menu card immediately.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 25 AED"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Section / Category</Label>
                  <Select
                    value={form.section || "__default__"}
                    onValueChange={(v) =>
                      setForm({ ...form, section: v === "__default__" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="__default__">
                        Default ({sectionNameById(defaultSectionIdForCard(selectedCard.id))})
                      </SelectItem>
                      {menuSections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Moves this card to a different section on the public menu.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
                <CardDescription>Upload a new image or paste a URL.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center transition hover:bg-muted">
                  <Upload className="w-6 h-6 text-primary" />
                  <span className="text-sm font-medium">
                    {uploading ? "Uploading…" : "Upload new image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
                <Input
                  placeholder="Or paste image URL"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (selectedId && !selectedCard) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/admin/kitchen/menu-cards")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Menu Cards
        </Button>
        <Card className="text-center py-16">
          <CardContent>
            <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">Menu card not found</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ────────────── Grid view ──────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <LayoutGrid className="w-5 h-5" /> Menu Cards Management
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, price, ID…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeSection === ALL_ID ? "default" : "outline"}
          onClick={() => handleSectionChange(ALL_ID)}
          className="rounded-full px-5"
          size="sm"
        >
          All
        </Button>
        {menuSections.map((s) => (
          <Button
            key={s.id}
            variant={activeSection === s.id ? "default" : "outline"}
            onClick={() => handleSectionChange(s.id)}
            className="rounded-full px-5"
            size="sm"
          >
            {s.name}
          </Button>
        ))}
      </div>

      <div className="flex justify-between items-center gap-3">
        <h3 className="font-playfair text-2xl font-bold text-foreground">
          {activeSection === ALL_ID ? "All Menu Cards" : sectionNameById(activeSection)}
        </h3>
        <span className="text-sm text-muted-foreground">{filtered.length} cards</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {filtered.map((card) => {
          const sectId = effectiveSectionId(card);
          const isOverridden = !!card.section && card.section !== defaultSectionIdForCard(card.id);
          return (
            <Card
              key={card.id}
              onClick={() => openCard(card)}
              className="hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group flex flex-col cursor-pointer border-coffee-200"
            >
              <div className="relative overflow-hidden aspect-[4/3] bg-muted">
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.name ?? ""}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs">
                  #{card.id}
                </div>
                {isOverridden && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
                    Moved
                  </div>
                )}
              </div>
              <CardHeader className="p-3 sm:p-4 pb-1">
                <CardDescription className="text-[10px] uppercase tracking-wider truncate">
                  {sectionNameById(sectId)}
                </CardDescription>
                <CardTitle className="text-sm sm:text-base font-semibold leading-tight line-clamp-2">
                  {card.name || "Untitled"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 mt-auto">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm sm:text-base font-bold text-primary">
                    {card.price || "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">Edit →</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="text-center py-16 col-span-full">
            <CardContent>
              <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No cards in this section.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default MenuCardsManager;
