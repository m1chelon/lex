// Utilidades de texto: normalização, RNG determinístico, comparação de respostas digitadas.
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const normAnswer = (s: string) => fold(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed: string | number) {
  let a = typeof seed === 'number' ? seed : hashStr(seed);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// Só parênteses que repetem um numeral por extenso são equivalentes.
const numberWords = /^(?:e|zero|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzent[oa]s|trezent[oa]s|quatrocent[oa]s|quinhent[oa]s|seiscent[oa]s|setecent[oa]s|oitocent[oa]s|novecent[oa]s|mil)$/;
const typedForm = (s: string) => fold(s)
  .split(/((?<=\d)[,./:](?=\d))/)
  .map((part, index) => index % 2 ? part : part.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' '))
  .join('').trim();
const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function checkTyped(given: string, expected: string): { ok: boolean; close: boolean } {
  const g = typedForm(given), e = typedForm(expected);
  if (!g) return { ok: false, close: false };
  if (g === e) return { ok: true, close: false };
  // Marcadores sobrevivem à normalização de pontuação e permitem misturar os formatos em uma mesma resposta.
  const pairs: { digits: string; words: string }[] = [];
  const withSlots = expected.replace(/(?<![\p{L}\p{N}.,])\d+(?:[.,]\d+)*\s*\([^()]+\)/gu, (part) => {
    const match = /^(\d+(?:[.,]\d+)*)\s*\(([^()]+)\)$/.exec(part)!;
    const words = typedForm(match[2]);
    if (!words.split(' ').every((word) => numberWords.test(word))) return part;
    pairs.push({ digits: typedForm(match[1]), words });
    return ` lexnumeralslot${pairs.length} `;
  });
  if (pairs.length) {
    const pattern = escaped(typedForm(withSlots)).replace(/lexnumeralslot(\d+)/g, (_, index: string) => {
      const { digits, words } = pairs[Number(index) - 1];
      return `(?:${escaped(digits)}(?: ${escaped(words)})?|${escaped(words)})`;
    });
    if (new RegExp(`^${pattern}$`).test(g)) return { ok: true, close: false };
  }
  return { ok: false, close: 1 - lev(g, e) / Math.max(g.length, e.length) >= 0.7 };
}
