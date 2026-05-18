import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Save, Loader2, X, ImagePlus } from "lucide-react";
import { useMenuCards, menuSections, type MenuCard } from "@/hooks/useMenuCards";

interface EditState {
  name: string;
  price: string;
  description: string;
  image_url: string;
}

const sectionOfCard = (id: number): string => {
  const s = menuSections.find((sec) =>
    sec.cardIds ? sec.cardIds.includes(id) : id >= sec.startId && id <= sec.endId
  );
  return s?.name || "—";
};

export function MenuCardsManager() {
  const { data: cards = [], isLoading } = useMenuCards();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => {
      const fields = [c.name, c.description, c.price, String(c.id), sectionOfCard(c.id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(q);
    });
  }, [cards, search]);

  const startEdit = (card: MenuCard) => {
    setEditingId(card.id);
    setDraft({
      name: card.name || "",
      price: card.price || "",
      description: card.description || "",
      image_url: card.image_url || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleImageUpload = async (file: File) => {
    if (!file || !editingId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `menu-cards/${editingId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("menu-images")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      setDraft((d) => (d ? { ...d, image_url: data.publicUrl } : d));
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editingId || !draft) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("menu_cards")
        .update({
          name: draft.name.trim() || null,
          price: draft.price.trim() || null,
          description: draft.description.trim() || null,
          image_url: draft.image_url.trim() || null,
        })
        .eq("id", editingId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["menu-cards"] });
      toast({ title: "Card updated", description: `Card #${editingId} saved.` });
      cancelEdit();
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Menu Cards Editor</h2>
          <p className="text-xs text-muted-foreground">
            Edit name, price, description and image for any of the {cards.length} menu cards.
          </p>
        </div>
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, price, section or ID…"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((card) => {
            const isEditing = editingId === card.id;
            return (
              <Card key={card.id} className={isEditing ? "ring-2 ring-primary" : ""}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                      {(isEditing ? draft?.image_url : card.image_url) ? (
                        <img
                          src={(isEditing ? draft!.image_url : card.image_url) as string}
                          alt={card.name || ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            #{card.id} · {sectionOfCard(card.id)}
                          </p>
                          {!isEditing && (
                            <>
                              <p className="font-medium text-foreground truncate">
                                {card.name || "Untitled"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {card.price || "—"}
                              </p>
                            </>
                          )}
                        </div>
                        {!isEditing && (
                          <Button size="sm" variant="outline" onClick={() => startEdit(card)}>
                            Edit
                          </Button>
                        )}
                      </div>
                      {!isEditing && card.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {card.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {isEditing && draft && (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={draft.name}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Price</Label>
                          <Input
                            value={draft.price}
                            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                            placeholder="e.g. 25 AED"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          rows={2}
                          value={draft.description}
                          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Image URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={draft.image_url}
                            onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                            placeholder="https://…"
                          />
                          <label className="inline-flex items-center justify-center px-3 rounded-md border bg-background hover:bg-muted cursor-pointer text-xs gap-1 shrink-0">
                            {uploading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ImagePlus className="w-3 h-3" />
                            )}
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleImageUpload(f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={save} disabled={saving}>
                          {saving ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              No cards match “{search}”.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MenuCardsManager;
