export function formatCurrency(value: string | number | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (Number.isNaN(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, day] = value.slice(0, 10).split('-');
    return `${day}/${m}/${y}`;
  }
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Data local no formato YYYY-MM-DD */
export function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toISODate(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Interpreta YYYY-MM-DD no fuso local (evita deslocamento de um dia). */
export function parseISODateLocal(iso: string): Date {
  const [y, m, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** Data e hora locais no formato YYYY-MM-DDTHH:mm (datetime-local). */
export function toDateTimeLocal(date: Date, time: string): string {
  const [hh, mm] = time.split(':');
  const iso = toISODate(date);
  const h = String(Number(hh) || 0).padStart(2, '0');
  const min = String(Number(mm) || 0).padStart(2, '0');
  return `${iso}T${h}:${min}`;
}

export function moneyNumber(value: string | number | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return Number.isNaN(n) ? 0 : n;
}

/** Máscara (XX) XXXXX-XXXX (celular) ou (XX) XXXX-XXXX (fixo), conforme dígitos. */
export function formatBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';

  if (digits.length <= 2) {
    return digits.length === 2 ? `(${digits}) ` : `(${digits}`;
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const isMobile = rest.startsWith('9') || digits.length === 11;

  if (isMobile) {
    if (rest.length <= 5) {
      return `(${ddd}) ${rest}`;
    }
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }

  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`;
  }
  return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}
