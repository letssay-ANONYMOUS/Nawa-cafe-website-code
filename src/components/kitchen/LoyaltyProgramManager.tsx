import { useEffect, useMemo, useState } from 'react';
import { Gift, Save } from 'lucide-react';
import { useMenuCards, useMenuSections, defaultSectionIdForCard } from '@/hooks/useMenuCards';
import { useLoyaltyProgram, type LoyaltyProgramConfig } from '@/hooks/useLoyaltyProgram';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const toggleValue = (values: string[], value: string) => (
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
);

export function LoyaltyProgramManager() {
  const { toast } = useToast();
  const { config, loading, save, saving } = useLoyaltyProgram();
  const { data: menuCards = [] } = useMenuCards();
  const { data: menuSections = [] } = useMenuSections();
  const [draft, setDraft] = useState<LoyaltyProgramConfig>(config);

  useEffect(() => setDraft(config), [config]);

  const menuCardOptions = useMemo(() => menuCards
    .filter((card): card is typeof card & { name: string } => Boolean(card.name))
    .map((card) => ({
      id: card.id,
      name: card.name,
      sectionId: card.section || defaultSectionIdForCard(card.id, menuSections),
    })), [menuCards, menuSections]);

  const hasStampGivers = draft.categoryTargets.length > 0 || draft.itemTargets.length > 0;
  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast({ variant: 'destructive', title: 'Program name required' });
      return;
    }
    if (!Number.isInteger(Number(draft.threshold)) || Number(draft.threshold) < 1) {
      toast({ variant: 'destructive', title: 'Invalid target', description: 'Stamps required must be at least 1.' });
      return;
    }
    if (draft.enabled && !hasStampGivers) {
      toast({
        variant: 'destructive',
        title: 'Choose stamp-giving cards',
        description: 'Select at least one menu category or card that gives a stamp before enabling the program.',
      });
      return;
    }
    try {
      await save({ ...draft, threshold: Number(draft.threshold), rewardQuantity: 1 });
      toast({
        title: 'Stamp program updated',
        description: 'Customer progress was recalculated.',
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not save stamp program',
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
              Stamp card program
            </CardTitle>
            <CardDescription className="mt-1">
              Menu only. Choose which cards give a stamp when ordered, and which cards customers can redeem for
              free once they collect enough stamps.
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
            <Label htmlFor="loyalty-threshold">Stamps required for one free item</Label>
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
          Customers will see: <strong>Collect {draft.threshold || 1} stamps, get 1 free item.</strong>
        </div>

        <TargetList title="Menu categories that give a stamp">
          {menuSections.map((section) => {
            const value = `menu:${section.id}`.toLowerCase();
            return (
              <TargetOption
                key={value}
                id={`loyalty-stamp-${value}`}
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

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Individual menu cards</h3>
          <p className="text-xs text-muted-foreground">
            Each card has two independent flags. <strong>Stamp</strong> = ordering it counts toward the
            customer's card. <strong>Free redeem</strong> = it can be claimed free once the card is full.
            They are separate on purpose: if nothing is ticked for Free redeem, nothing can be claimed
            free — even by a customer with a full stamp card.
          </p>
          <div className="max-h-[34rem] space-y-3 overflow-y-auto rounded-lg border bg-background p-3">
            {menuCardOptions.map((card) => {
              const stampValue = `menu:${card.name}`.toLowerCase();
              const sectionName = menuSections.find((section) => section.id === card.sectionId)?.name;
              const categoryValue = `menu:${card.sectionId}`.toLowerCase();
              const categoryGivesStamp = draft.categoryTargets.includes(categoryValue);
              const givesStamp = draft.itemTargets.includes(stampValue);
              const isRedeemable = draft.redeemableItemTargets.includes(stampValue);
              return (
                <StampCardRow
                  key={card.id}
                  cardId={card.id}
                  name={card.name}
                  sectionName={sectionName}
                  givesStamp={givesStamp || categoryGivesStamp}
                  stampLockedByCategory={categoryGivesStamp}
                  isRedeemable={isRedeemable}
                  onStampToggle={() => setDraft((current) => ({
                    ...current,
                    itemTargets: toggleValue(current.itemTargets, stampValue),
                  }))}
                  onRedeemToggle={() => setDraft((current) => ({
                    ...current,
                    redeemableItemTargets: toggleValue(current.redeemableItemTargets, stampValue),
                  }))}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {draft.categoryTargets.length + draft.itemTargets.length} stamp-giving selections,{' '}
            {draft.redeemableItemTargets.length} redeemable selections.
          </p>
          <Button onClick={handleSave} disabled={loading || saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save stamp program'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StampCardRow({
  cardId,
  name,
  sectionName,
  givesStamp,
  stampLockedByCategory,
  isRedeemable,
  onStampToggle,
  onRedeemToggle,
}: {
  cardId: number;
  name: string;
  sectionName?: string;
  givesStamp: boolean;
  stampLockedByCategory: boolean;
  isRedeemable: boolean;
  onStampToggle: () => void;
  onRedeemToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-coffee-200">
      <div className="mb-3 min-w-0">
        <p className="truncate text-sm font-semibold leading-5 text-coffee-900">{name}</p>
        {sectionName && <p className="truncate text-xs text-muted-foreground">{sectionName}</p>}
      </div>

      <div className="space-y-3">
        <label
          htmlFor={`loyalty-stamp-card-${cardId}`}
          className={`flex cursor-pointer items-center gap-3 rounded-md p-1.5 transition-colors ${
            stampLockedByCategory ? 'cursor-default bg-sky-50/70' : 'hover:bg-muted/60'
          }`}
        >
          <Checkbox
            id={`loyalty-stamp-card-${cardId}`}
            aria-label={`${name} gives a stamp`}
            checked={givesStamp}
            disabled={stampLockedByCategory}
            onCheckedChange={onStampToggle}
            className="h-8 w-8 rounded-md border-2 border-slate-400 text-white data-[state=checked]:border-sky-300 data-[state=checked]:bg-sky-300 data-[state=checked]:text-white"
          />
          <span className="min-w-0 text-base leading-6 text-slate-600">
            This item will give a stamp
            {stampLockedByCategory && (
              <span className="ml-1 text-xs text-slate-400">(enabled by category)</span>
            )}
          </span>
        </label>

        <label
          htmlFor={`loyalty-redeem-card-${cardId}`}
          className="flex cursor-pointer items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted/60"
        >
          <Checkbox
            id={`loyalty-redeem-card-${cardId}`}
            aria-label={`${name} is redeemable with stamps`}
            checked={isRedeemable}
            onCheckedChange={onRedeemToggle}
            className="h-8 w-8 rounded-md border-2 border-slate-400 text-white data-[state=checked]:border-sky-300 data-[state=checked]:bg-sky-300 data-[state=checked]:text-white"
          />
          <span className="min-w-0 text-base leading-6 text-slate-600">
            Customers can redeem this item using stamp card
          </span>
        </label>
      </div>
    </div>
  );
}

function TargetList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="h-40 space-y-1 overflow-y-auto rounded-md border bg-background p-2">
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
