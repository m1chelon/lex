"""PDF (página salva do TSE / documento do TJMS) -> linhas para o importador do LEX.

Uso: python3 -I extract_layout_pdf.py <in.pdf> <out.json>

O texto vem do poppler (pdftotext -bbox-layout), que lê corretamente parênteses e travessões
dessas fontes. Os traços finos horizontais que cruzam o MEIO das palavras (tachado) são
lidos com o pdfplumber: palavras tachadas são marcadas como redação anterior (struck),
nunca descartadas em silêncio. Cabeçalho/rodapé da impressão do navegador são removidos.
Saída: {"bodySize", "pages", "blocks": [{"t", "pg", "gap", "indent", "struck"}]}
"""
import sys, json, re, subprocess, html
import pdfplumber

src, out = sys.argv[1], sys.argv[2]
xml = subprocess.run(['pdftotext', '-bbox-layout', src, '-'], capture_output=True, check=True).stdout.decode('utf-8')
pdf = pdfplumber.open(src)

HEADER = re.compile(r'^\d{2}/\d{2}/\d{4}, \d{2}:\d{2}$|— Tribunal Superior Eleitoral$|^https?://\S+\s+\d+/\d+$|^https?://www\.tse\.jus\.br/\S+$|^\d+/\d+$')

def strikes(page):
    out = []
    for r in page.rects + page.lines:
        h = r['bottom'] - r['top']; w = r['x1'] - r['x0']
        if h < 1.6 and w > 2.5:
            out.append((r['x0'], r['x1'], (r['top'] + r['bottom']) / 2))
    return out

blocks = []
lefts = []
pages = re.findall(r'<page width="[\d.]+" height="[\d.]+">(.*?)</page>', xml, re.S)
for pi, pg in enumerate(pages):
    st = strikes(pdf.pages[pi]) if pi < len(pdf.pages) else []
    prev_bottom = None
    # todas as palavras da página, reagrupadas em linhas visuais pela posição vertical
    allw = [(float(a), float(b), float(c), float(d), html.unescape(t)) for a, b, c, d, t in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', pg)]
    allw.sort(key=lambda w: ((w[1] + w[3]) / 2, w[0]))
    vlines = []
    for w in allw:
        mid = (w[1] + w[3]) / 2
        if vlines and abs(vlines[-1]['mid'] - mid) <= 3.0:
            vlines[-1]['w'].append(w)
        else:
            vlines.append({'mid': mid, 'w': [w]})
    for vl in vlines:
        words = sorted(vl['w'], key=lambda w: w[0])
        x0 = words[0][0]; y0 = min(w[1] for w in words); y1 = max(w[3] for w in words)
        text = ' '.join(w[4] for w in words)
        if HEADER.search(text.strip()) and (y0 < 40 or y0 > 740):
            continue
        if re.match(r'^\d{2}/\d{2}/\d{4}, \d{2}:\d{2} .*Tribunal Superior Eleitoral$', text) or re.match(r'^https?://www\.tse\.jus\.br/\S+ \d+/\d+$', text):
            continue
        # tachado: traço cruzando a faixa central (25%–72% da altura) e cobrindo >= 60% da palavra
        def struck(w):
            wx0, wy0, wx1, wy1, _ = w; hgt = wy1 - wy0
            cov = 0.0
            for sx0, sx1, sy in st:
                if wy0 + .25 * hgt <= sy <= wy0 + .72 * hgt:
                    cov += max(0.0, min(wx1, sx1) - max(wx0, sx0))
            return cov >= .6 * (wx1 - wx0)
        flags = [struck(w) for w in words]
        gap = (y0 - prev_bottom) if prev_bottom is not None else 0
        prev_bottom = y1
        runs = []
        for w, f in zip(words, flags):
            if runs and runs[-1][0] == f: runs[-1][1].append(w[4])
            else: runs.append([f, [w[4]]])
        for k, (f, ws) in enumerate(runs):
            blocks.append({'t': ' '.join(ws), 'pg': pi + 1, 'gap': round(gap, 1) if k == 0 else 99, 'x': round(x0, 1), 'struck': f or None})
        lefts.append(round(x0))

# margem esquerda dominante -> recuo de primeira linha
from collections import Counter
left = Counter(lefts).most_common(1)[0][0] if lefts else 0
for b in blocks:
    b['indent'] = (b['x'] - left) > 12 or None
json.dump({'bodySize': 12, 'pages': len(pages), 'left': left, 'blocks': blocks}, open(out, 'w'), ensure_ascii=False)
n = sum(1 for b in blocks if b['struck'])
print(f'{src}: {len(blocks)} linhas, {n} tachadas, margem {left}', file=sys.stderr)
