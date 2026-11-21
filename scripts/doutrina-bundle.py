#!/usr/bin/env python3
"""Junta public/data/doutrina/*.json num único arquivo pessoal (lex-doutrina.json),
para importar no app em Você → Doutrina. Uso: python3 -I scripts/doutrina-bundle.py public/data/doutrina lex-doutrina.json"""
import json, os, sys, datetime
src, out = sys.argv[1], sys.argv[2]
leis = {}
for f in sorted(os.listdir(src)):
    if f.endswith('.json'):
        d = json.load(open(os.path.join(src, f), encoding='utf-8'))
        leis[d['law']] = d
bundle = {'formato': 'lex-doutrina', 'versao': 1, 'geradoEm': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
          'aviso': 'Trechos curtos do acervo doutrinário do próprio usuário, para uso pessoal. Página = posição no PDF original. Não redistribuir.',
          'leis': leis}
json.dump(bundle, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(out, len(leis), 'leis', sum(len(v['arts']) for v in leis.values()), 'artigos', os.path.getsize(out) // 1024, 'KB')
