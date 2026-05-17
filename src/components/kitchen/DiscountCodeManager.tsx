import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useMenuCards } from '@/hooks/useMenuCards';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, RefreshCw, Trash2, Tag, Percent, Check, ChevronsUpDown, Sparkles } from 'lucide-react';
import { useLoyaltyDiscount } from '@/hooks/useLoyaltyDiscount';

interface DiscountRow {
  id: string;
  code: string;
  percent: number;
  scope: 'cart' | 'item';
  target_source: 'menu' | 'store' | null;
  target_name: string | null;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface StoreProductLite {
  id: string;
  product_name: string;
}

type Scope = 'cart' | 'item';

const DURATION_PRESETS: { label: string; hours: number | null }[] = [
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '4 days', hours: 24 * 4 },
  { label: '7 days', hours: 24 * 7 },
  { label: '30 days', hours: 24 * 30 },
  { label: '2 months', hours: 24 * 60 },
  { label: 'No expiry', hours: null },
  { label: 'Custom date', hours: -1 },
];

export function DiscountCodeManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const loadSeq = useRef(0);
  const { data: menuCards } = useMenuCards();
  const [storeProducts, setStoreProducts] = useState<StoreProductLite[]>([]);
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState<string>('10');
  const [scope, setScope] = useState<Scope>('cart');
  const [targetKey, setTargetKey] = useState<string>(''); // "menu:NAME" or "store:NAME"
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [durationLabel, setDurationLabel] = useState<string>('7 days');
  const [customExpiry, setCustomExpiry] = useState<Date | undefined>(undefined);

  // Loyalty discount (site-wide, applied to every order)
  const { percent: loyaltyPercent, save: saveLoyalty, saving: savingLoyalty } = useLoyaltyDiscount();
  const [loyaltyDraft, setLoyaltyDraft] = useState<string>('');
  useEffect(() => {
    setLoyaltyDraft(String(loyaltyPercent));
  }, [loyaltyPercent]);

  const refreshDiscountCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['has-active-discount-codes'] });
    queryClient.invalidateQueries({ queryKey: ['discount-code'] });
  }, [queryClient]);

  const load = useCallback(async () => {
    const requestId = ++loadSeq.current;
    setLoading(true);
    try {
      const [codesRes, storeRes] = await Promise.all([
        supabase
          .from('discount_codes')
          .select('*')
          .order('updated_at', { ascending: false }),
        supabase
          .from('store_products')
          .select('id, product_name')
          .order('sort_order', { ascending: true }),
      ]);
      if (requestId !== loadSeq.current) return;
      if (codesRes.error) {
        toast({ variant: 'destructive', title: 'Failed to load codes', description: codesRes.error.message });
      } else {
        setRows((codesRes.data as DiscountRow[]) || []);
      }
      if (!storeRes.error) {
        setStoreProducts((storeRes.data as StoreProductLite[]) || []);
      }
    } finally {
      if (requestId === loadSeq.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const productOptions = useMemo(() => {
    const opts: { value: string; label: string; source: 'menu' | 'store' }[] = [];
    (menuCards || [])
      .filter((c) => c.name)
      .forEach((c) => opts.push({ value: `menu:${c.name}`, label: `🍽 ${c.name}`, source: 'menu' }));
    storeProducts.forEach((p) =>
      opts.push({ value: `store:${p.product_name}`, label: `🛍 ${p.product_name}`, source: 'store' }),
    );
    return opts;
  }, [menuCards, storeProducts]);

  const resetForm = () => {
    setCode('');
    setPercent('10');
    setScope('cart');
    setTargetKey('');
    setDurationLabel('7 days');
    setCustomExpiry(undefined);
  };

  const handleCreate = async () => {
    const cleanCode = code.trim().toUpperCase();
    const pct = Number(percent);

    if (!cleanCode || cleanCode.length < 3) {
      toast({ variant: 'destructive', title: 'Invalid code', description: 'Code must be at least 3 characters.' });
      return;
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast({ variant: 'destructive', title: 'Invalid percent', description: 'Percent must be between 1 and 100.' });
      return;
    }

    let target_source: 'menu' | 'store' | null = null;
    let target_name: string | null = null;
    if (scope === 'item') {
      if (!targetKey) {
        toast({ variant: 'destructive', title: 'Pick a product', description: 'Select which product this code discounts.' });
        return;
      }
      const [src, ...nameParts] = targetKey.split(':');
      target_source = src as 'menu' | 'store';
      target_name = nameParts.join(':');
    }

    let expires_at: string | null = null;
    const preset = DURATION_PRESETS.find((d) => d.label === durationLabel);
    if (preset?.hours === null) {
      expires_at = null;
    } else if (preset?.hours === -1) {
      if (!customExpiry) {
        toast({ variant: 'destructive', title: 'Pick a date', description: 'Choose a custom expiry date.' });
        return;
      }
      expires_at = customExpiry.toISOString();
    } else if (preset) {
      expires_at = new Date(Date.now() + preset.hours * 60 * 60 * 1000).toISOString();
    }

    setSaving(true);
    const { data: createdRow, error } = await supabase
      .from('discount_codes')
      .upsert({
        code: cleanCode,
        percent: pct,
        scope,
        target_source,
        target_name,
        expires_at,
        active: true,
      }, { onConflict: 'code' })
      .select('*')
      .single();
    setSaving(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to create code', description: error.message });
      return;
    }
    loadSeq.current += 1;
    setRows((prev) => [createdRow as DiscountRow, ...prev.filter((r) => r.id !== createdRow.id)]);
    setLoading(false);
    refreshDiscountCaches();
    toast({ title: 'Code saved', description: `${cleanCode} is now active.` });
    resetForm();
  };

  const toggleActive = async (row: DiscountRow) => {
    const { error } = await supabase
      .from('discount_codes')
      .update({ active: !row.active })
      .eq('id', row.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
    refreshDiscountCaches();
  };

  const deleteRow = async (row: DiscountRow) => {
    if (!confirm(`Delete code "${row.code}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('discount_codes').delete().eq('id', row.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    refreshDiscountCaches();
    toast({ title: 'Code deleted', description: row.code });
  };

  const handleSaveLoyalty = async () => {
    const n = Number(loyaltyDraft);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      toast({ variant: 'destructive', title: 'Invalid percent', description: 'Loyalty discount must be 0–100.' });
      return;
    }
    try {
      await saveLoyalty(n);
      toast({
        title: n === 0 ? 'Loyalty discount disabled' : 'Loyalty discount updated',
        description: n === 0
          ? 'Customers will no longer see an automatic discount.'
          : `Every order now gets ${n}% off automatically.`,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Save failed', description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Site-wide loyalty discount control */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Loyalty discount (applied to every order)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[auto,1fr,auto] md:items-end">
          <div className="flex items-center gap-3">
            <Switch
              checked={loyaltyPercent > 0}
              disabled={savingLoyalty}
              onCheckedChange={async (on) => {
                const next = on ? (Number(loyaltyDraft) > 0 ? Number(loyaltyDraft) : 15) : 0;
                setLoyaltyDraft(String(next));
                try {
                  await saveLoyalty(next);
                  toast({
                    title: on ? 'Loyalty discount enabled' : 'Loyalty discount disabled',
                    description: on
                      ? `Every order now gets ${next}% off automatically.`
                      : 'Customers will no longer see an automatic discount.',
                  });
                } catch (e) {
                  toast({ variant: 'destructive', title: 'Save failed', description: (e as Error).message });
                }
              }}
            />
            <span className="text-sm font-medium">
              {loyaltyPercent > 0 ? 'Active' : 'Disabled'}
            </span>
          </div>
          <div className="space-y-1">
            <Label htmlFor="loyalty-percent">Percent off</Label>
            <div className="relative">
              <Input
                id="loyalty-percent"
                type="number"
                min={0}
                max={100}
                step={1}
                value={loyaltyDraft}
                onChange={(e) => setLoyaltyDraft(e.target.value)}
                disabled={loyaltyPercent === 0 || savingLoyalty}
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-xs text-muted-foreground">
              Default is 15%. Set to 0 or toggle off to disable for everyone.
            </p>
          </div>
          <Button onClick={handleSaveLoyalty} disabled={savingLoyalty || loyaltyPercent === 0}>
            {savingLoyalty ? 'Saving…' : 'Save percent'}
          </Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Create discount code
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="dc-code">Code</Label>
            <Input
              id="dc-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER15"
              maxLength={32}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dc-percent">Discount %</Label>
            <div className="relative">
              <Input
                id="dc-percent"
                type="number"
                min={1}
                max={100}
                step={1}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Apply to</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cart">Whole cart</SelectItem>
                <SelectItem value="item">Single product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'item' && (
            <div className="space-y-1">
              <Label>Product</Label>
              <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productPickerOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className={cn('truncate', !targetKey && 'text-muted-foreground')}>
                      {targetKey
                        ? productOptions.find((o) => o.value === targetKey)?.label ?? 'Pick a product'
                        : 'Search menu or store products…'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command
                    filter={(value, search) => {
                      // Match against the label (search by name) — `value` we
                      // pass below is the human-readable label lowercased.
                      return value.includes(search.toLowerCase()) ? 1 : 0;
                    }}
                  >
                    <CommandInput placeholder="Search by name…" />
                    <CommandList className="max-h-72">
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup heading="Menu">
                        {productOptions.filter((o) => o.source === 'menu').map((o) => (
                          <CommandItem
                            key={o.value}
                            value={o.label.toLowerCase()}
                            onSelect={() => {
                              setTargetKey(o.value);
                              setProductPickerOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', targetKey === o.value ? 'opacity-100' : 'opacity-0')} />
                            {o.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup heading="Store">
                        {productOptions.filter((o) => o.source === 'store').map((o) => (
                          <CommandItem
                            key={o.value}
                            value={o.label.toLowerCase()}
                            onSelect={() => {
                              setTargetKey(o.value);
                              setProductPickerOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', targetKey === o.value ? 'opacity-100' : 'opacity-0')} />
                            {o.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-1">
            <Label>Valid for</Label>
            <Select value={durationLabel} onValueChange={setDurationLabel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_PRESETS.map((d) => (
                  <SelectItem key={d.label} value={d.label}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {durationLabel === 'Custom date' && (
            <div className="space-y-1">
              <Label>Expires on</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !customExpiry && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customExpiry ? format(customExpiry, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customExpiry}
                    onSelect={setCustomExpiry}
                    disabled={(d) => d < new Date(Date.now() - 24 * 60 * 60 * 1000)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end">
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create code'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Active & past codes</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-1', loading && 'animate-spin')} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No codes yet. Create one above.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => {
                const expired = !!row.expires_at && new Date(row.expires_at) <= new Date();
                return (
                  <div
                    key={row.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-base">{row.code}</span>
                        <Badge variant="secondary">{row.percent}% off</Badge>
                        <Badge variant="outline">
                          {row.scope === 'cart' ? 'Whole cart' : row.target_name || 'Item'}
                        </Badge>
                        {expired && <Badge variant="destructive">Expired</Badge>}
                        {!row.active && !expired && <Badge variant="outline">Disabled</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Expires: {row.expires_at ? format(new Date(row.expires_at), 'PPp') : 'Never'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={row.active} onCheckedChange={() => toggleActive(row)} />
                        <span className="text-xs text-muted-foreground">
                          {row.active ? 'Active' : 'Off'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(row)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DiscountCodeManager;
