/**
 * Servicio de almacenamiento: única puerta de acceso a localStorage.
 * Todas las fechas de calendario usan la zona horaria local del usuario.
 */

export function load<T>(key: string, fallback: T): T {
  // El fallback se devuelve CLONADO: los servicios mutan el objeto devuelto,
  // y devolver la constante compartida contaminaría el estado "vacío" de todo
  // el módulo (p. ej. progreso fantasma tras borrar la cuenta).
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return structuredClone(fallback);
    return JSON.parse(raw) as T;
  } catch {
    return structuredClone(fallback);
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Almacenamiento lleno o no disponible: la app sigue funcionando en memoria.
  }
}

/** Fecha local YYYY-MM-DD (zona horaria del usuario). */
export function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return dateStr(new Date());
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Días de diferencia entre dos fechas YYYY-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad);
  const db = new Date(by, bm - 1, bd);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}
