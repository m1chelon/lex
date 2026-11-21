"""PDF -> JSON lines for the LEX importer.

Usage: python3 -I extract_pdf.py <in.pdf> <out.json> [--footnotes]

Each output block: {"t": text, "fn": [footnote texts referenced in this line], "pg": page}
With --footnotes, small-font lines at the bottom of each page that start with a
number are treated as footnotes, and small superscript digits inside body lines
are removed from the text and resolved to those footnotes. The legal text itself
is never rewritten: only footnote markers are moved out of it.
"""
import sys, json, re, collections
import pdfplumber

def dominant_size(chars):
    c = collections.Counter(round(ch['size'], 1) for ch in chars if ch['text'].strip())
    return c.most_common(1)[0][0] if c else 0

def main():
    src, out = sys.argv[1], sys.argv[2]
    use_fn = '--footnotes' in sys.argv
    pdf = pdfplumber.open(src)
    allsizes = collections.Counter(round(ch['size'], 1) for p in pdf.pages for ch in p.chars if ch['text'].strip())
    body = allsizes.most_common(1)[0][0]
    blocks = []
    for pi, page in enumerate(pdf.pages):
        lines = page.extract_text_lines(return_chars=True)
        footnotes = {}
        body_lines = []
        if use_fn:
            # footnote zone: consecutive small-font lines at the bottom of the page
            i = len(lines) - 1
            fn_lines = []
            while i >= 0 and dominant_size(lines[i]['chars']) < body - 1.0:
                fn_lines.insert(0, lines[i]); i -= 1
            body_lines = lines[:i + 1]
            cur = None
            for l in fn_lines:
                m = re.match(r'^(\d{1,3})\s+(.*)$', l['text'].strip())
                if m:
                    cur = m.group(1); footnotes[cur] = m.group(2).strip()
                elif cur:
                    footnotes[cur] += ' ' + l['text'].strip()
        else:
            body_lines = lines
        if use_fn:
            is_sup = lambda o: o.get('object_type') == 'char' and o['size'] < body - 2.5 and o['text'].isdigit()
            clean = page.filter(lambda o: not is_sup(o))
            sups = sorted([c for c in page.chars if is_sup(c)], key=lambda c: (round(c['top']), c['x0']))
            # group superscript digits into numbers
            groups = []
            for c in sups:
                if groups and abs(groups[-1]['top'] - c['top']) < 2 and c['x0'] - groups[-1]['x1'] < 1.5:
                    groups[-1]['t'] += c['text']; groups[-1]['x1'] = c['x1']
                else:
                    groups.append({'t': c['text'], 'top': c['top'], 'x1': c['x1']})
            limit = body_lines[-1]['bottom'] + 1 if body_lines else 0
            clines = [l for l in clean.extract_text_lines() if l['top'] < limit]
            for l in clines:
                refs = [g['t'] for g in groups if l['top'] - 6 <= g['top'] <= l['bottom']]
                for g in groups:
                    if l['top'] - 6 <= g['top'] <= l['bottom']: g['top'] = -999  # consume
                text = re.sub(r'\s+', ' ', l['text']).strip()
                fns = [footnotes.get(r, f'[nota {r} não localizada na página]') for r in refs]
                if text:
                    blocks.append({'t': text, 'fn': fns, 'pg': pi + 1, 'x0': l['x0'], 'x1': l['x1'], 'top': l['top'], 'bottom': l['bottom']})
        else:
            for l in body_lines:
                text = re.sub(r'\s+', ' ', l['text']).strip()
                if text:
                    blocks.append({'t': text, 'fn': [], 'pg': pi + 1, 'x0': l['x0'], 'x1': l['x1'], 'top': l['top'], 'bottom': l['bottom']})
    # geometria: espaço acima da linha e centralização
    xs0 = sorted(b['x0'] for b in blocks); xs1 = sorted(b['x1'] for b in blocks)
    left = xs0[len(xs0)//20]; right = xs1[-len(xs1)//20]
    mid = (left + right) / 2; width = right - left
    prev = None
    for b in blocks:
        b['gap'] = round(b['top'] - prev['bottom'], 1) if prev and prev['pg'] == b['pg'] else 0
        w = b['x1'] - b['x0']
        b['center'] = abs((b['x0'] + b['x1']) / 2 - mid) < 10 and w < width * 0.8 and b['x0'] > left + 25
        prev = b
    for b in blocks:
        for k in ('x0', 'x1', 'top', 'bottom'): b.pop(k, None)
    json.dump({'bodySize': body, 'pages': len(pdf.pages), 'blocks': blocks}, open(out, 'w'), ensure_ascii=False)
    print(f'{src}: {len(blocks)} lines, {len(pdf.pages)} pages, body font {body}')

main()
