/** Días sin exportar a partir de los cuales se recuerda hacer una copia de seguridad. */
export const BACKUP_REMINDER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Los proyectos solo viven en el navegador: se recuerda exportar si pasaron `BACKUP_REMINDER_DAYS` desde la
 * última exportación o, si nunca se exportó, desde el primer uso (así un usuario nuevo no recibe el aviso).
 * Devuelve los días transcurridos, o null si no toca avisar.
 */
export function backupReminderDays(
  info: { lastBackup: number | null; firstUse: number | null },
  now: number,
  hasContent: boolean,
): number | null {
  if (!hasContent) return null;
  const since = info.lastBackup ?? info.firstUse;
  if (since === null) return null;
  const days = Math.floor((now - since) / DAY_MS);
  return days >= BACKUP_REMINDER_DAYS ? days : null;
}
