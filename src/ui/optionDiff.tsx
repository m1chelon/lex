// Destaque do trecho que muda entre alternativas quase iguais (útil na correção).

/** Prefixo e sufixo comuns (em palavras) a todas as alternativas; null se forem pouco parecidas. */
export function optionDiffs(texts: string[]): [number, number] | null {
  if (texts.length < 2) return null;
  const words = texts.map((t) => t.split(' '));
  const min = Math.min(...words.map((w) => w.length));
  let pre = 0;
  while (pre < min && words.every((w) => w[pre] === words[0][pre])) pre++;
  let suf = 0;
  while (suf < min - pre && words.every((w) => w[w.length - 1 - suf] === words[0][words[0].length - 1 - suf])) suf++;
  return pre + suf >= 6 ? [pre, suf] : null;
}

export function withDiff(text: string, diff: [number, number] | null) {
  if (!diff) return text;
  const w = text.split(' ');
  const mid = w.slice(diff[0], w.length - diff[1]).join(' ');
  return <>{w.slice(0, diff[0]).join(' ')} <mark className="opt-diff">{mid || '—'}</mark> {w.slice(w.length - diff[1]).join(' ')}</>;
}
