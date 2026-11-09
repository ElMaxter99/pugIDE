/** Opciones de caducidad de «Compartir proyecto» (P-15): utilidades puras. */

export type ExpiryChoice = '1h' | '1d' | '7d' | '30d' | 'never';

export const EXPIRY_CHOICES: readonly { id: ExpiryChoice; label: string }[] = [
  { id: '1h', label: '1 hora' },
  { id: '1d', label: '1 día' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'never', label: 'Nunca' },
];

const MS: Record<Exclude<ExpiryChoice, 'never'>, number> = { '1h': 3_600_000, '1d': 86_400_000, '7d': 7 * 86_400_000, '30d': 30 * 86_400_000 };

/** Instante de caducidad de una opción (undefined: no caduca). */
export function expiryFrom(choice: ExpiryChoice, now: number): number | undefined {
  return choice === 'never' ? undefined : now + MS[choice];
}

/** «16 nov 2026» (y la hora si caduca el mismo día que se mira, que es lo que importa con «1 hora»). */
export function formatShareDate(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  const date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const sameDay = new Date(now).toDateString() === d.toDateString();
  return sameDay ? `${date}, ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : date;
}
