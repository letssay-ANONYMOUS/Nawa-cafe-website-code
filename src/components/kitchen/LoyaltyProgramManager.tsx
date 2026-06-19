import { useEffect, useMemo, useState } from 'react';
import { Gift, Save } from 'lucide-react';
import { useMenuCards, useMenuSections, defaultSectionIdForCard } from '@/hooks/useMenuCards';
import { useStoreCategories } from '@/hooks/useStoreCategories';
import { useLoyaltyProgram, type LoyaltyProgramConfig } from '@/hooks/useLoyaltyProgram';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface StoreProductOption {
  id: string;
  product_name: string;
  category: string;
}

const toggleValue = (values: string[], value: string) => (
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
);

export function LoyaltyProgramManager() {
  const { toast } = useToast();
  const { config, loading, save, saving } = useLoyaltyProgram();
  const { data: menuCards = [] } = useMenuCards();
  const { data: menuSections = [] } = useMenuSections();
  const { data: storeCategories = [] } = useStoreCategories();
  const [storeProducts, setStoreProducts] = useState<StoreProductOption[]>([]);
  const [draft, setDraft] = useState<LoyaltyProgramConfig>(config);

  useEffect(() => setDraft(config), [config]);

  useEffect(() => {
    supabase
      .from('store_products')
      .select('id, product_name, category')
      .order('sort_order', { ascending: true })
      .then(({ data }) => setStoreProducts((data as StoreProductOption[] | null) ?? []));
  }, []);

  const menuCardOptions = useMemo(() => menuCards
    .filter((card): card is typeof card & { name: string } => Boolean(card.name))
    .map((card) => ({
      id: card.id,
      name: card.name,
      sectionId: card.section || defaultSectionIdForCard(card.id, menuSections),
    })), [menuCards, menuSections]);

  const hasTargets = draft.categoryTargets.length > 0 || draft.itemTargets.length > 0;

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast({ variant: 'destructive', title: 'Program name required' });
      return;
    }
    if (!Number.isInteger(Number(draft.threshold)) || Number(draft.threshold) < 1) {
      toast({ variant: 'destructive', title: 'Invalid target', description: 'Orders required must be at least 1.' });
      return;
    }
    if (draft.enabled && !hasTargets) {
      toast({
        variant: 'destructive',
        title: 'Choose eligible products',
        description: 'Select at least one category or individual card before enabling rewards.',
      });
      return;
    }

    try {
      await save({ ...draft, threshold: Number(draft.threshold), rewardQuantity: 1 });
      toast({
        title: 'Loyalty program updated',
        description: 'Customer progress and eligible products were recalculated.',
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not save loyalty program',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Loyalty program
            </CardTitle>
            <CardDescription className="mt-1">
              Choose qualifying categories or cards and how many purchases unlock one free eligible item.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.enabled}
              disabled={loading || saving}
              onCheckedChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
            />
            <Badge variant={draft.enabled ? 'default' : 'outline'}>
              {draft.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="loyalty-program-name">Program name</Label>
            <Input
              id="loyalty-program-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loyalty-threshold">Items required for one free item</Label>
            <Input
              id="loyalty-threshold"
              type="number"
              min={1}
              max={1000}
              step={1}
              value={draft.threshold}
              onChange={(event) => setDraft((current) => ({
                ...current,
                threshold: Number(event.target.value),
              }))}
            />
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4 text-sm">
          Customers will see: <strong>Buy {draft.threshold || 1} eligible items, get 1 free.</strong>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TargetList title="Menu categories">
            {menuSections.map((section) => {
              const value = `menu:${section.id}`.toLowerCase();
              return (
                <TargetOption
                  key={value}
                  id={`loyalty-${value}`}
                  label={section.name}
                  checked={draft.categoryTargets.includes(value)}
                  onToggle={() => setDraft((current) => ({
                    ...current,
                    categoryTargets: toggleValue(current.categoryTargets, value),
                  }))}
                />
              );
            })}
          </TargetList>

          <TargetList title="Store categories">
            {storeCategories.map((category) => {
              const value = `store:${category.id}`.toLowerCase();
              return (
                <TargetOption
                  key={value}
                  id={`loyalty-${value}`}
                  label={category.label}
                  checked={draft.categoryTargets.includes(value)}
                  onToggle={() => setDraft((current) => ({
                    ...current,
                    categoryTargets: toggleValue(current.categoryTargets, value),
                  }))}
                />
              );
            })}
          </TargetList>

          <TargetList title="Individual menu cards">
            {menuCardOptions.map((card) => {
              const value = `menu:${card.name}`.toLowerCase();
              return (
                <TargetOption
                  key={`${card.id}-${value}`}
                  id={`loyalty-menu-card-${card.id}`}
                  label={card.name}
                  detail={menuSections.find((section) => section.id === card.sectionId)?.name}
                  checked={draft.itemTargets.includes(value)}
                  onToggle={() => setDraft((current) => ({
                    ...current,
                    itemTargets: toggleValue(current.itemTargets, value),
                  }))}
                />
              );
            })}
          </TargetList>

          <TargetList title="Individual store cards">
            {storeProducts.map((product) => {
              const value = `store:${product.product_name}`.toLowerCase();
              return (
                <TargetOption
                  key={product.id}
                  id={`loyalty-store-card-${product.id}`}
                  label={product.product_name}
                  detail={storeCategories.find((category) => category.id === product.category)?.label}
                  checked={draft.itemTargets.includes(value)}
                  onToggle={() => setDraft((current) => ({
                    ...current,
                    itemTargets: toggleValue(current.itemTargets, value),
                  }))}
                />
              );
            })}
          </TargetList>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {draft.categoryTargets.length} categories and {draft.itemTargets.length} individual cards selected.
          </p>
          <Button onClick={handleSave} disabled={loading || saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save loyalty program'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TargetList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="h-56 space-y-1 overflow-y-auto rounded-md border bg-background p-2">
        {children}
      </div>
    </div>
  );
}

function TargetOption({
  id,
  label,
  detail,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  detail?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded px-2 py-2 hover:bg-muted/60">
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-5">{label}</span>
        {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
    </label>
  );
}

export default LoyaltyProgramManager;
