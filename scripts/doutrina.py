#!/usr/bin/env python3
"""Indexa o acervo doutrinário por artigo de lei.

Gera public/data/doutrina/<lei>.json com trechos CURTOS (citação com obra e
página do PDF) para exibir após cada resposta. Não reescreve nada: os trechos
são cópias literais, recortadas em limites de frase.

Uso: python3 -I scripts/doutrina.py acervo public/data/doutrina
"""
import json, os, re, sys, unicodedata
from collections import defaultdict

ACERVO, OUT = sys.argv[1], sys.argv[2]
LAWS_DIR = os.path.join(os.path.dirname(OUT.rstrip('/')), 'laws')
MAX_CHARS = 520      # ~ 3 a 10 linhas no celular
MIN_CHARS = 160
PER_ART_COMMENTED = 4
PER_ART_OTHER = 3

# obra (arquivo, número) -> lei padrão para menções "art. N" sem qualificador
WORKS = {
    ('01', 1): 'cf', ('01', 2): 'cf', ('01', 3): None, ('01', 4): None,
    ('02', 1): 'cp', ('02', 2): 'cp', ('02', 3): 'cp', ('02', 4): 'cp', ('02', 5): 'l12850',
    ('03', 1): 'cpp', ('03', 2): 'cpp',
    ('04', 1): 'cc', ('04', 2): 'cc', ('04', 3): 'cc', ('04', 4): 'cc', ('04', 5): 'cc', ('04', 6): 'cc', ('04', 7): 'cdc',
    ('05', 1): 'cpc',
}
COMMENTED = {('02', 4): 'cp', ('03', 2): 'cpp'}

# números de lei -> id
NUM = {'10741': 'idoso', '8069': 'eca', '8078': 'cdc', '13709': 'lgpd', '9503': 'ctb', '7210': 'lep', '6015': 'lrp',
       '4737': 'ce', '4657': 'lindb', '10406': 'cc', '13105': 'cpc', '3689': 'cpp', '2848': 'cp', '64': 'lc64'}
QUAL = [
    (r'(?:CF|CF/88|CRFB|Constitui[çc][ãa]o(?: Federal| da Rep[úu]blica)?|Carta (?:Magna|Pol[íi]tica))\b', 'cf'),
    (r'(?:CPC(?:/2015|/15)?|C[óo]digo de Processo Civil(?: de 2015)?)\b(?!\s*/\s*19)(?!/73|/1973| de 1973)', 'cpc'),
    (r'(?:CPP|C[óo]digo de Processo Penal)\b', 'cpp'),
    (r'(?:CP|C[óo]digo Penal)\b(?!\s*Militar)', 'cp'),
    (r'(?:CC(?:/2002|/02)?|C[óo]digo Civil(?: de 2002)?)\b(?!/16|/1916| de 1916)', 'cc'),
    (r'(?:CDC|C[óo]digo de Defesa do Consumidor)\b', 'cdc'),
    (r'(?:C[óo]digo Eleitoral|CE\b(?=[^/]))', 'ce'),
    (r'(?:Lei das Elei[çc][õo]es|LE)\b', 'l9504'),
    (r'(?:Lei dos Partidos Pol[íi]ticos|LPP)\b', 'l9096'),
    (r'(?:Lei das Inelegibilidades|LC\s*(?:n[º°.]*\s*)?64(?:/90|/1990)?|Lei Complementar\s*(?:n[º°.]*\s*)?64(?:/90|/1990)?)', 'lc64'),
    (r'(?:LEP|Lei de Execu[çc][ãa]o Penal)\b', 'lep'),
    (r'(?:ECA|Estatuto da Crian[çc]a e do Adolescente)\b', 'eca'),
    (r'(?:LINDB|Lei de Introdu[çc][ãa]o)\b', 'lindb'),
    (r'(?:LIA|Lei de Improbidade(?: Administrativa)?)\b', 'l8429'),
]
QUAL = [(re.compile(p), i) for p, i in QUAL]
RE_LEI_NUM = re.compile(r'(?:Lei|Decreto-Lei|DL|LC|Lei Complementar)\s*(?:n[º°.o]*\s*)?(\d{1,2}\.?\d{3}|\d{1,3})(?:\s*,\s*de [^,;)]{3,30})?(?:/(\d{2,4}))?')
RE_MENTION = re.compile(r'\b[Aa]rt(?:igo)?s?\.?\s*(\d{1,4}(?:\.\d{3})?)\s*(?:[º°o](?![a-z]))?(?:\s*[-–]\s*([A-Z])\b)?')
RE_SUB = re.compile(r'^\s*(?:,\s*)?(?:(§\s*\d+\s*[º°o]?|par[áa]grafo [úu]nico)|(?:inc(?:iso|\.)?\s*)?([IVXLC]+)\b(?![a-z]))')

def fold(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')

def clean(s):
    s = re.sub(r'\*\*|__|`', '', s)
    s = re.sub(r'^#+\s*', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def article_numbers(law):
    p = os.path.join(LAWS_DIR, f'{law}.json')
    if not os.path.exists(p):
        return None
    d = json.load(open(p))
    return {a['n']: a for a in d['articles']}

LAWNUMS = {}
def law_exists(law):
    if law not in LAWNUMS:
        LAWNUMS[law] = article_numbers(law)
    return LAWNUMS[law] is not None

def read_works():
    files = sorted(f for f in os.listdir(ACERVO) if re.match(r'\d\d_.*\.md$', f))
    cat = json.load(open(os.path.join(ACERVO, 'catalogo_5md.json')))
    titles = {}
    for g in cat['grupos']:
        for o in g['obras']:
            titles[(g['arquivo'][:2], o['numero'])] = o['titulo'].replace('(Merged) ', '').replace('(merged) ', '')
    for f in files:
        key = f[:2]
        cur, lines = None, []
        with open(os.path.join(ACERVO, f), encoding='utf-8') as fh:
            for ln in fh:
                m = re.match(r'^## OBRA (\d+):', ln)
                if m:
                    if cur: yield cur, titles.get(cur, ''), lines
                    cur, lines = (key, int(m.group(1))), []
                elif cur:
                    lines.append(ln.rstrip('\n'))
        if cur: yield cur, titles.get(cur, ''), lines

def paragraphs(lines):
    """Cada linha é um parágrafo; junta continuações (quebra de página ou linha partida)."""
    page, out = 0, []
    for ln in lines:
        t = ln.strip()
        m = re.match(r'^\[\[p\. (\d+)\]\]$', t)
        if m: page = int(m.group(1)); continue
        if not t: continue
        t = clean(t)
        if out:
            prev = out[-1][1]
            if prev and prev[-1] not in '.:;!?”"' and re.match(r'^[a-zà-ú(“"0-9,]', t) and not re.match(r'^[a-z]\)', t):
                out[-1][1] = prev + ' ' + t; continue
        out.append([page, t])
    return [(p, t) for p, t in out if t]

def is_noise(t):
    return (len(t) < MIN_CHARS or re.match(r'^(STF|STJ|TJ|TRF|TSE|TST|Consulte|Ver |Vide |Nota|Sumário|SUMÁRIO|Bibliografia|[IVX]+\.\s|\d+\.\d+)', t)
            or t.count('|') > 3 or sum(c.isupper() for c in t[:80]) > 50)

def snippet(text, pos=0):
    """Recorte literal de até MAX_CHARS em limites de frase, começando na frase da menção."""
    sents = re.split(r'(?<=[.!?”])\s+(?=[A-ZÀ-Ú“(])', text)
    acc, starts = 0, []
    for s in sents:
        starts.append(acc); acc += len(s) + 1
    i = 0
    for k, st in enumerate(starts):
        if st <= pos: i = k
    if i <= 1: i = 0
    out = ''
    for s in sents[i:]:
        if out and len(out) + len(s) + 1 > MAX_CHARS: break
        out = (out + ' ' + s).strip()
    if len(out) > MAX_CHARS + 120:  # frase única muito longa: corta em palavra
        out = out[:MAX_CHARS].rsplit(' ', 1)[0] + ' (…)'
    if i > 0: out = '(…) ' + out
    return out

def art_key(n):
    m = re.match(r'(\d+)(?:-([A-Z]))?', n)
    return int(m.group(1)) * 100 + (ord(m.group(2)) - 64 if m.group(2) else 0)

def resolve_qual(after):
    """Lei citada logo após a menção ("do CPC", "da Lei 9.504/97"...)."""
    a = after[:70]
    m = re.match(r'^[^.;]{0,40}?\b(?:d[aoe]s?|no|na)\s+(.*)', a)
    if not m:
        return 'default'
    rest = m.group(1)
    if re.match(r'^(?:mesm[oa]|referid[oa]|citad[oa])', rest): return 'default'
    for rx, law in QUAL:
        if rx.match(rest): return law
    ml = RE_LEI_NUM.match(rest)
    if ml:
        n = ml.group(1).replace('.', '')
        if n in NUM: return NUM[n]
        for cand in (f'l{n}', f'lc{n}', f'dl{n}', f'd{n}'):
            if law_exists(cand): return cand
        return None
    if re.match(r'^(?:Lei|Decreto|Código|Constitui|Estatuto|Resolu|Regimento|Portaria|LC|ADCT|Ato das Disposi|Anteprojeto|Projeto|PL\b|PEC|Proposta|Emenda|Súmula|Enunciado|Regulamento|Tratado|Convenção|Pacto|Medida Provisória|MP\b|Instrução|Provimento|Código Comercial|CLT|CTN|CF/67|Constituição de 19|Carta de 19|antigo|revogad)', rest, re.I):
        return None
    return 'default'

STOPW = set('''sobre entre quando desde pelos pelas outro outra outros outras sendo seria serão poderá deverá cada mesmo mesma assim ainda apenas também todos todas qualquer forma termos artigo inciso parágrafo caput disposto previsto prevista lei código este esta esse essa aquele aquela seus suas ou ser são pelo pela para como mais'''.split())

def stems(text):
    return {fold(w)[:6] for w in re.findall(r'[A-Za-zÀ-ú]{5,}', text) if fold(w) not in STOPW}

ART_STEMS = {}
def art_stems(law, n):
    k = (law, n)
    if k not in ART_STEMS:
        a = (LAWNUMS.get(law) or {}).get(n)
        ART_STEMS[k] = stems(' '.join(u.get('t', '') for u in a['units'])) if a else set()
    return ART_STEMS[k]

def main():
    os.makedirs(OUT, exist_ok=True)
    obras = []
    idx = defaultdict(lambda: defaultdict(list))  # law -> n -> [entries]
    for key, title, lines in read_works():
        oi = len(obras); obras.append(title)
        default = WORKS.get(key)
        paras = paragraphs(lines)
        if key in COMMENTED:
            law = COMMENTED[key]; nums = LAWNUMS.setdefault(law, article_numbers(law)) or {}
            # cabeçalhos de artigo colados ao parágrafo anterior: separa quando o texto bate com a lei oficial
            split = []
            rx = re.compile(r'(?<=[.)”;:] )Art\.\s*(\d{1,3}(?:\.\d{3})?)\s*(?:[º°o]|\.º)?\s*(?:-\s*([A-Z]))?\.?\s+')
            for page, t in paras:
                cuts = [0]
                for m in rx.finditer(t):
                    n = m.group(1).replace('.', '') + (f'-{m.group(2)}' if m.group(2) else '')
                    a = nums.get(n)
                    if not a or not a['units']: continue
                    w_off = fold(' '.join(a['units'][0]['t'].split()[:4]))
                    if fold(t[m.end():m.end() + 60]).startswith(w_off[:24]): cuts.append(m.start())
                cuts.append(len(t))
                for x, y in zip(cuts, cuts[1:]):
                    if t[x:y].strip(): split.append((page, t[x:y].strip()))
            paras = split
            cands = []
            for i, (page, t) in enumerate(paras):
                m = re.match(r'^Art\.\s*(\d{1,3}(?:\.\d{3})?)\s*(?:[º°o]|\.º)?\s*(?:-\s*([A-Z]))?\.?\s+\S', t)
                if m:
                    n = m.group(1).replace('.', '') + (f'-{m.group(2)}' if m.group(2) else '')
                    if n in nums: cands.append((i, n, art_key(n)))
            # maior subsequência crescente = a sequência estrutural real dos artigos comentados
            best, prev = [1] * len(cands), [-1] * len(cands)
            for a in range(len(cands)):
                for b in range(max(0, a - 60), a):
                    if cands[b][2] < cands[a][2] and best[b] + 1 > best[a]: best[a], prev[a] = best[b] + 1, b
            a = max(range(len(cands)), key=lambda x: best[x]) if cands else -1
            starts = {}
            while a >= 0: starts[cands[a][0]] = cands[a][1]; a = prev[a]
            cur = None
            for i, (page, t) in enumerate(paras):
                if i in starts: cur = starts[i]; continue
                if re.match(r'^Art\.\s*\d', t): continue
                if not cur or is_noise(t) or re.match(r'^(§|•|[IVX]+\s*[-–]|[a-z]\))', t): continue
                tm = re.match(r'^([^:]{3,90}):\s', t)
                topic = tm.group(1) if tm else ''
                if sum('topic' in e for e in idx[law][cur]) < PER_ART_COMMENTED * 3:
                    idx[law][cur].append({'o': oi, 'p': page, 't': snippet(t), 'topic': topic, 'score': 10 if topic else 9})
            continue
        for page, t in paras:
            if is_noise(t) or re.match(r'^(?:\S+\s){0,5}Art\.\s*\d+[º°o.]*\s+[A-ZÀ-Ú]', t) or 'Pena –' in t[:400]: continue
            ments = list(RE_MENTION.finditer(t))
            if not ments or len(ments) > 6: continue
            for m in ments[:3]:
                after = t[m.end():]
                law = resolve_qual(after)
                if law == 'default': law = default
                if not law or not law_exists(law): continue
                if law == 'ce' and key != ('01', 4) and 'Eleitoral' not in after[:60]: continue
                nums = LAWNUMS[law]
                n = m.group(1).replace('.', '') + (f'-{m.group(2)}' if m.group(2) else '')
                if n not in nums: continue
                if re.match(r'^[^.;]{0,25}(?:/1973|/73|de 1973|/1916|de 1916|revogad|anterior|antigo)', after): continue
                if re.match(r'^[^.;]{0,30}\b(?:ADCT|Anteprojeto|Projeto de Lei|PEC|Ato das Disposições)', after): continue
                sm = RE_SUB.match(after)
                sub = clean(sm.group(1) or sm.group(2)) if sm else ''
                focus = 1.0 / len({x.group(1) for x in ments})
                early = 1.0 if m.start() < 220 else 0.5
                lenok = 1.0 if 250 <= len(t) <= 1400 else 0.6
                sn = snippet(t, m.start())
                overlap = len(stems(sn) & art_stems(law, n))
                if overlap < 2: continue  # só cita o artigo de passagem: não explica o dispositivo
                idx[law][n].append({'o': oi, 'p': page, 't': sn, 'sub': sub, 'score': focus + early + lenok + min(overlap, 6) * 0.35})
    total = 0
    for law, arts in idx.items():
        out = {}
        for n, ents in arts.items():
            lim = PER_ART_COMMENTED if law in COMMENTED.values() and any('topic' in e for e in ents) else PER_ART_OTHER
            seen, pick = set(), []
            for e in sorted(ents, key=lambda e: -e['score']):
                h = e['t'][:80]
                if h in seen or len(e['t']) < MIN_CHARS - 40: continue
                seen.add(h)
                pick.append({k: v for k, v in e.items() if k != 'score' and v != ''})
                if len(pick) >= lim: break
            if pick: out[n] = pick
        total += len(out)
        json.dump({'law': law, 'obras': obras, 'aviso': 'Trechos literais e curtos do acervo do usuário; página = posição no PDF original.', 'arts': out},
                  open(os.path.join(OUT, f'{law}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
        print(f'{law:8} {len(out):5} artigos comentados')
    print('total', total)

main()
