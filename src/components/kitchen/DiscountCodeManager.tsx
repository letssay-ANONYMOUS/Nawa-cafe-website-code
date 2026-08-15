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
import { CalendarIcon, RefreshCw, Trash2, Tag, Percent, Check, ChevronsUpDown } from 'lucide-react';
import LoyaltyProgramManager from '@/components/kitchen/LoyaltyProgramManager';
import ReferralProgramManager from '@/components/kitchen/ReferralProgramManager';

interface DiscountRow {
  id: string;
  code: string;
  display_name: string | null;
  percent: number;
  scope: 'cart' | 'item';
  target_source: 'menu' | 'store' | null;
  target_name: string | null;
  application_mode: 'manual' | 'global';
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface StoreProductLite {
  id: string;
  product_name: string;
}

type Scope = 'cart' | 'item';
type ApplicationMode = 'manual' | 'global';

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
  const [displayName, setDisplayName] = useState('');
  const [percent, setPercent] = useState<string>('10');
  const [applicationMode, setApplicationMode] = useState<ApplicationMode>('manual');
  const [scope, setScope] = useState<Scope>('cart');
  const [targetKey, setTargetKey] = useState<string>(''); // "menu:NAME" or "store:NAME"
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [durationLabel, setDurationLabel] = useState<string>('7 days');
  const [customExpiry, setCustomExpiry] = useState<Date | undefined>(undefined);

  const refreshDiscountCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['has-active-discount-codes'] });
    queryClient.invalidateQueries({ queryKey: ['discount-code'] });
    queryClient.invalidateQueries({ queryKey: ['active-global-discount'] });
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
    setDisplayName('');
    setPercent('10');
    setApplicationMode('manual');
    setScope('cart');
    setTargetKey('');
    setDurationLabel('7 days');
    setCustomExpiry(undefined);
  };

  const handleCreate = async () => {
    const cleanCode = code.trim().toUpperCase();
    const cleanDisplayName = displayName.trim();
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

    const payload = {
      code: cleanCode,
      display_name: cleanDisplayName || cleanCode,
      percent: pct,
      application_mode: applicationMode,
      scope,
      target_source,
      target_name,
      expires_at,
      active: true,
    };

    setSaving(true);
    const { data: existingRows, error: existingError } = await supabase
      .from('discount_codes')
      .select('id')
      .eq('code', cleanCode)
      .limit(1);

    if (existingError) {
      setSaving(false);
      toast({ variant: 'destructive', title: 'Failed to check code', description: existingError.message });
      return;
    }

    const existingId = existingRows?.[0]?.id;
    const saveQuery = existingId
      ? supabase.from('discount_codes').update(payload).eq('id', existingId)
      : supabase.from('discount_codes').insert(payload);

    const { data: savedRows, error } = await saveQuery.select('*').limit(1);
    setSaving(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to create code', description: error.message });
      return;
    }
    const createdRow = savedRows?.[0];
    if (!createdRow) {
      toast({ variant: 'destructive', title: 'Save failed', description: 'No discount code was returned after saving.' });
      return;
    }
    loadSeq.current += 1;
    setRows((prev) => [createdRow as DiscountRow, ...prev.filter((r) => r.id !== createdRow.id)]);
    setLoading(false);
    refreshDiscountCaches();
    toast({
      title: applicationMode === 'global' ? 'Global discount saved' : 'Promo code saved',
      description: applicationMode === 'global'
        ? `${cleanCode} now applies automatically for every customer.`
        : `${cleanCode} is active and must be entered by the customer.`,
    });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Create discount code
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label>Discount type</Label>
            <Select value={applicationMode} onValueChange={(value) => setApplicationMode(value as ApplicationMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Promo code - customer enters it</SelectItem>
                <SelectItem value="global">Global discount code - automatic</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {applicationMode === 'global'
                ? 'Applied automatically at cart and checkout. Customers do not type this code.'
                : 'For blogger, influencer, and campaign codes. It is never filled in automatically.'}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="dc-code">{applicationMode === 'global' ? 'Internal code' : 'Code'}</Label>
            <Input
              id="dc-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={applicationMode === 'global' ? 'GLOBAL10' : 'SUMMER15'}
              maxLength={32}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dc-display-name">Customer-facing name</Label>
            <Input
              id="dc-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={applicationMode === 'global' ? 'Summer offer' : 'Summer 15'}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              This exact name appears in cart and checkout. Leave blank to show the code.
            </p>
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
              {saving ? 'Creating…' : applicationMode === 'global' ? 'Create global discount' : 'Create promo code'}
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
                        {row.display_name && row.display_name !== row.code && (
                          <Badge variant="outline">{row.display_name}</Badge>
                        )}
                        <Badge variant="secondary">{row.percent}% off</Badge>
                        <Badge variant={row.application_mode === 'global' ? 'default' : 'outline'}>
                          {row.application_mode === 'global' ? 'Global discount' : 'Manual promo'}
                        </Badge>
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
      <LoyaltyProgramManager />
      <ReferralProgramManager />
    </div>
  );
}

export default DiscountCodeManager;
