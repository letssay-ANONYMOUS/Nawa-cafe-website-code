import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

export interface StoreCardData {
  id: string;
  product_key: number;
  product_name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  volume: string | null;
  origin: string | null;
  badge: string | null;
  rating: number;
  coming_soon: boolean;
  category: string;
  stock_quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: StoreCardData | null;
  onSaved: () => void;
}

export function StoreCardEditModal({ open, onOpenChange, product, onSaved }: Props) {
  const [form, setForm] = useState<Partial<StoreCardData>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Sync form with product
  useState(() => {
    if (product) setForm(product);
  });

  // Re-init when product changes
  if (product && form.id !== product.id) {
    setForm(product);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `store/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
      setForm(prev => ({ ...prev, image_url: data.publicUrl }));
      toast({ title: 'Image uploaded' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    const { error } = await supabase
      .from('store_products')
      .update({
        product_name: form.product_name,
        description: form.description,
        price: Number(form.price ?? 0),
        image_url: form.image_url,
        volume: form.volume,
        origin: form.origin,
        badge: form.badge,
        coming_soon: !!form.coming_soon,
      })
      .eq('id', product.id);
    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message });
    } else {
      toast({ title: 'Saved', description: 'Card updated.' });
      onSaved();
      onOpenChange(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.product_name ?? ''} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price (AED)</Label>
              <Input type="number" value={form.price ?? 0} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Size / Volume</Label>
              <Input value={form.volume ?? ''} onChange={e => setForm(p => ({ ...p, volume: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Origin</Label>
              <Input value={form.origin ?? ''} onChange={e => setForm(p => ({ ...p, origin: e.target.value }))} />
            </div>
            <div>
              <Label>Badge</Label>
              <Input value={form.badge ?? ''} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={!!form.coming_soon} onCheckedChange={v => setForm(p => ({ ...p, coming_soon: v }))} />
            <Label>Coming Soon</Label>
          </div>
          <div>
            <Label>Image</Label>
            {form.image_url && (
              <img src={form.image_url} alt="" className="w-24 h-24 object-cover rounded mb-2 border" />
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-coffee-700 hover:text-coffee-900">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Upload new image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
            <Input
              className="mt-2"
              placeholder="Or paste image URL"
              value={form.image_url ?? ''}
              onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
