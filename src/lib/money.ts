export function formatAED(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;

  return `AED ${amount.toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatAEDFromInput(value: number | string | null | undefined): string {
  if (typeof value === 'number') return formatAED(value);

  const raw = String(value ?? '').trim();
  if (!raw) return formatAED(0);

  const numeric = Number(raw.replace(/,/g, '').replace(/AED/gi, '').trim());
  if (Number.isFinite(numeric)) return formatAED(numeric);

  const match = raw.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? formatAED(Number(match[0])) : raw;
}
