const MAP: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function romanToInt(s: string): number {
  const r = s.toUpperCase();
  let total = 0;
  for (let i = 0; i < r.length; i++) {
    const v = MAP[r[i]];
    if (!v) return NaN;
    const next = MAP[r[i + 1]] ?? 0;
    total += v < next ? -v : v;
  }
  return total;
}

export function intToRoman(n: number): string {
  const t: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of t) while (n >= v) { out += s; n -= v; }
  return out;
}

/** "IV-A" -> 4.01 ; "IX" -> 9 ; "3" -> 3 ; "12-B" -> 12.02 */
export function ordinalKey(s: string): number {
  const m = s.trim().match(/^([0-9.]+|[IVXLCDM]+)\s*[º°o]?\s*(?:-\s*([A-Z]))?(?:-([A-Z]))?$/i);
  if (!m) return NaN;
  const base = /^[0-9.]+$/.test(m[1]) ? parseInt(m[1].replace(/\./g, ''), 10) : romanToInt(m[1]);
  const suf = m[2] ? (m[2].toUpperCase().charCodeAt(0) - 64) / 100 : 0;
  const suf2 = m[3] ? (m[3].toUpperCase().charCodeAt(0) - 64) / 10000 : 0;
  return base + suf + suf2;
}
