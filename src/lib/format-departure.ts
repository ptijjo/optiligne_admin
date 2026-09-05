/** Formate des secondes depuis minuit service GTFS en HH:MM (peut dépasser 24h). */
export function formatDeparture(sec: number): string {
  const safe = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Parse HH:MM (ou H:MM) en secondes depuis minuit. */
export function parseDeparture(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) {
    return null;
  }
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59 || hours > 47) {
    return null;
  }
  return hours * 3600 + minutes * 60;
}
