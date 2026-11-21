// Diff por palavras (LCS) para comparar redações.
export type DiffPart = { t: string; op: 'eq' | 'add' | 'del' };
export function wordDiff(a: string, b: string): DiffPart[] {
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/);
  const n = A.length, m = B.length;
  if (n * m > 4_000_000) return [{ t: a, op: 'del' }, { t: b, op: 'add' }];
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (t: string, op: DiffPart['op']) => { const l = out[out.length - 1]; if (l && l.op === op) l.t += t; else out.push({ t, op }); };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { push(A[i], 'eq'); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) push(A[i++], 'del');
    else push(B[j++], 'add');
  }
  while (i < n) push(A[i++], 'del');
  while (j < m) push(B[j++], 'add');
  return out;
}
