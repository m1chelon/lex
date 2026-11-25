"""Varredura ponta a ponta do LEX: abre telas, joga todos os modos, força conflitos de sessão,
termina sessões e verifica a progressão. Registra erros de console, exceções e telas quebradas."""
import asyncio, sys, re
from playwright.async_api import async_playwright
from shoot import setup

BASE = 'http://localhost:4173/'
log = []
CUR = ['']

def note(kind, msg):
    line = f'[{CUR[0]}] {kind}: {msg}'
    log.append(line); print(line, flush=True)

async def health(pg, errs, where):
    CUR[0] = where
    while errs:
        note('ERRO', errs.pop(0))
    try:
        crashed = await pg.locator('.crash-card').count()
        text_len = await pg.evaluate("() => (document.getElementById('root')?.innerText || '').trim().length")
    except Exception as e:
        note('ERRO', f'avaliação falhou {e}'); return
    if crashed: note('QUEBROU', await pg.locator('.crash-card').first.inner_text())
    if text_len < 20: note('TELA VAZIA', f'{text_len} chars')

async def home(pg):
    await pg.goto(BASE, wait_until='networkidle'); await pg.wait_for_timeout(900)

async def click(pg, name, exact=False, timeout=4000):
    loc = pg.get_by_role('button', name=name, exact=exact).first
    await loc.click(timeout=timeout); await pg.wait_for_timeout(600)

R = '[data-route="session"]:not([aria-hidden]) '
async def step(pg):
    """Responde a questão visível de forma genérica. Retorna False se não houver o que fazer."""
    for sel in [R + '.memory-choices .chip', R + '.opt:not([disabled])', R + '.conf:not([disabled])']:
        loc = pg.locator(sel)
        if await loc.count() and await loc.first.is_visible():
            await loc.first.click(); return True
    inp = pg.locator(R + 'input.input:visible, ' + R + 'textarea:visible')
    if await inp.count():
        try:
            if not await inp.first.input_value():
                await inp.first.fill('teste'); return True
        except Exception: pass
    for name in ['Verificar', 'Já memorizei', 'Próxima questão', 'Continuar', 'Entendi', 'Começar', 'Ver resultado']:
        b = pg.locator(R + f'button:visible:has-text("{name}")')
        if await b.count() and await b.first.is_enabled():
            await b.first.click(); return True
    b = pg.locator(R + '.btn-primary.btn-block:visible')
    if await b.count() and await b.first.is_enabled():
        await b.first.click(); return True
    return False

async def play(pg, errs, label, n=10):
    stuck = 0
    for i in range(n):
        await pg.wait_for_timeout(350)
        ok = await step(pg)
        await health(pg, errs, f'{label} passo {i}')
        if not ok:
            stuck += 1
            if stuck >= 3:
                if await pg.locator('[data-route="session"]:not([aria-hidden]) .summary, [data-route="session"]:not([aria-hidden]) :text("Resumo")').count() == 0:
                    body = (await pg.evaluate("() => document.querySelector('[data-route=session]:not([aria-hidden])')?.innerText?.slice(0,160) || ''"))
                    if body: note('TRAVOU?', f'{label} passo {i}: {body!r}')
                return i
        else:
            stuck = 0
    return n

async def start_mode(pg, errs, mode, start=None):
    await home(pg)
    await click(pg, 'Jogar', exact=True)
    adj = pg.get_by_role('button', name='Ajustar treino')
    if await adj.count(): await adj.first.click(); await pg.wait_for_timeout(400)
    await pg.locator('.jg-mode', has_text=mode).first.click(); await pg.wait_for_timeout(400)
    if start:
        b = pg.get_by_role('button', name=start, exact=True)
        if await b.count(): await b.first.click()
    await pg.locator('.jg-footer .pill-cta').last.click(); await pg.wait_for_timeout(2200)
    await health(pg, errs, f'iniciar {mode}')

async def main():
    only = sys.argv[1:]
    async with async_playwright() as p:
        b, pg, errs = await setup(p)
        await health(pg, errs, 'setup')

        if not only or 'abas' in only:
            for t in ['Início', 'Leis', 'Concursos', 'Cursos', 'Progresso']:
                await home(pg); await click(pg, t, exact=True); await health(pg, errs, f'aba {t}')
                # rola até o fim para montar tudo
                await pg.evaluate("() => { for (const el of document.querySelectorAll('*')) if (el.scrollHeight > el.clientHeight + 50) el.scrollTop = el.scrollHeight; }")
                await pg.wait_for_timeout(600); await health(pg, errs, f'aba {t} rolada')
            await home(pg); await pg.get_by_role('button', name='Abrir seu perfil').click(); await pg.wait_for_timeout(800)
            await health(pg, errs, 'perfil')

        if not only or 'leis' in only:
            await home(pg); await click(pg, 'Leis', exact=True)
            materias = await pg.locator('.ramo-card, .branch-tile, [data-ramo]').count()
            names = [t.split('\n')[0] for t in await pg.locator('button:visible:has-text("Direito"), button:visible:has-text("Direitos")').all_inner_texts()]
            note('INFO', f'matérias {names}')
            for nm in names[:12]:
                await home(pg); await click(pg, 'Leis', exact=True)
                try:
                    await pg.get_by_role('button', name=re.compile('^' + re.escape(nm))).first.click(); await pg.wait_for_timeout(900)
                except Exception as e:
                    note('AVISO', f'não abriu matéria {nm}: {e}'); continue
                await health(pg, errs, f'matéria {nm}')
                laws = pg.locator('.ramo-law, .branch-heading')
                if await laws.count():
                    await laws.first.click(); await pg.wait_for_timeout(1500); await health(pg, errs, f'lei de {nm}')
                    tr = pg.locator('button:visible:has-text("Treinar este artigo"), button:visible:has-text("Treinar esta parte"), button:visible:has-text("Treinar esta lei")')
                    if await tr.count():
                        await tr.first.click(); await pg.wait_for_timeout(1200); await health(pg, errs, f'treinar de {nm}')

        if not only or 'modos' in only:
            modes = ['Memorizar Guiada', 'Memorizar', 'Leitura Guiada', 'Casos', 'Provar', 'Relâmpago', 'Simulado']
            for i, m in enumerate(modes):
                await start_mode(pg, errs, m, 'Do início' if i % 2 == 0 else None)
                # conflito com sessão anterior: alterna as três saídas
                conflict = pg.get_by_role('button', name='Encerrar a anterior e começar')
                if await conflict.count():
                    await health(pg, errs, f'conflito antes de {m}')
                    choice = ['Encerrar a anterior e começar', 'Retomar treino anterior', 'Voltar à escolha do treino'][i % 3]
                    await pg.get_by_role('button', name=choice).first.click(); await pg.wait_for_timeout(1800)
                    await health(pg, errs, f'conflito {choice} ({m})')
                    if choice.startswith('Voltar'):
                        await pg.locator('.jg-mode', has_text=m).first.evaluate('e => e.click()'); await pg.locator('.jg-footer .pill-cta').last.click(); await pg.wait_for_timeout(1500)
                        c2 = pg.get_by_role('button', name='Encerrar a anterior e começar')
                        if await c2.count(): await c2.first.click(); await pg.wait_for_timeout(1800)
                if m == 'Simulado':
                    for _ in range(80):
                        dlg = pg.locator('dialog[open][aria-label="Finalizar"]')
                        if await dlg.count():
                            note('INFO', 'finalizar: ' + (await dlg.first.inner_text())[:150].replace('\n', ' | '))
                            await dlg.locator('button.btn-primary, button:has-text("Entregar"), button:has-text("Finalizar")').first.click(); await pg.wait_for_timeout(1500)
                            break
                        o = pg.locator('[data-route="simulado-run"]:not([aria-hidden]) .opt:not([disabled]), [data-route="simulado-run"]:not([aria-hidden]) button:visible:has-text("Certo")')
                        if not await o.count(): break
                        await o.first.click(); await pg.wait_for_timeout(120)
                        nx = pg.locator('[data-route="simulado-run"]:not([aria-hidden]) button:visible:has-text("Próxima"), [data-route="simulado-run"]:not([aria-hidden]) button:visible:has-text("Finalizar"), [data-route="simulado-run"]:not([aria-hidden]) button:visible:has-text("Entregar")')
                        if await nx.count(): await nx.first.click(); await pg.wait_for_timeout(150)
                    await health(pg, errs, 'simulado jogado')
                    fin = pg.locator('button:visible:has-text("Entregar"), button:visible:has-text("Finalizar")')
                    if await fin.count(): await fin.first.click(); await pg.wait_for_timeout(1000)
                    conf = pg.locator('button:visible:has-text("Entregar")')
                    if await conf.count(): await conf.first.click(); await pg.wait_for_timeout(1200)
                    await health(pg, errs, 'simulado resultado')
                else:
                    await play(pg, errs, m, 8)
                    # abre o mapa da sessão
                    strip = pg.locator(R + '.status-strip')
                    if await strip.count():
                        await strip.first.click(); await pg.wait_for_timeout(500); await health(pg, errs, f'mapa {m}')
                        lei = pg.locator('button:visible:has-text("Lei inteira")')
                        if await lei.count(): await lei.first.click(); await pg.wait_for_timeout(900); await health(pg, errs, f'mapa lei {m}')
                        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)

        if not only or 'progressao' in only:
            # termina um Relâmpago inteiro e confere o resumo; depois "Continuar" deve seguir adiante
            await start_mode(pg, errs, 'Memorizar', 'Do início')
            c = pg.get_by_role('button', name='Encerrar a anterior e começar')
            if await c.count(): await c.first.click(); await pg.wait_for_timeout(1500)
            first_ref = await pg.evaluate("() => document.querySelector('[data-route=session]:not([aria-hidden]) .question-reference')?.innerText || ''")
            n = await play(pg, errs, 'memorizar completo', 200)
            await health(pg, errs, 'fim memorizar')
            summary = await pg.evaluate("() => document.querySelector('[data-route=session]:not([aria-hidden])')?.innerText?.slice(0,300) || ''")
            note('INFO', f'primeiro: {first_ref!r} · passos {n} · fim: {summary[:120]!r}')
            await start_mode(pg, errs, 'Memorizar', 'Continuar')
            c = pg.get_by_role('button', name='Encerrar a anterior e começar')
            if await c.count(): await c.first.click(); await pg.wait_for_timeout(1500)
            nxt = await pg.evaluate("() => document.querySelector('[data-route=session]:not([aria-hidden]) .question-reference')?.innerText || ''")
            note('INFO', f'ao continuar começou em: {nxt!r}')

        if not only or 'cursos' in only:
            await home(pg); await click(pg, 'Cursos', exact=True)
            names = await pg.locator('main:not([aria-hidden]) button.course').evaluate_all("els => els.map(e => e.querySelector('strong, h3, .title')?.innerText || e.innerText.split('\\n')[0])")
            note('INFO', f'cursos: {names}')
            for nm in names:
                await home(pg); await click(pg, 'Cursos', exact=True)
                try:
                    await pg.locator('main:not([aria-hidden]) button.course', has_text=nm).first.click(); await pg.wait_for_timeout(1200)
                except Exception as e:
                    note('AVISO', f'curso {nm}: {e}'); continue
                await health(pg, errs, f'curso {nm}')
                bt = pg.locator('main:not([aria-hidden]) .catalog-primary')
                if await bt.count():
                    await bt.first.click(); await pg.wait_for_timeout(1800)
                    c = pg.get_by_role('button', name='Encerrar a anterior e começar')
                    if await c.count(): await c.first.click(); await pg.wait_for_timeout(1500)
                    await play(pg, errs, f'curso {nm}', 6)

        if not only or 'concursos' in only:
            for area in ['TJSP · Escrevente', 'TJMS']:
                await home(pg); await click(pg, 'Concursos', exact=True)
                await pg.get_by_text(area).first.click(); await pg.wait_for_timeout(1800)
                await health(pg, errs, f'edital {area}')
                trein = pg.locator('main:not([aria-hidden]) button:visible:has-text("Treinar")')
                k = await trein.count()
                for j in range(min(k, 12)):
                    await home(pg); await click(pg, 'Concursos', exact=True)
                    await pg.get_by_text(area).first.click(); await pg.wait_for_timeout(1500)
                    t = pg.locator('main:not([aria-hidden]) button:visible:has-text("Treinar")').nth(j)
                    if not await t.count(): break
                    label = (await t.get_attribute('aria-label')) or (await t.inner_text())
                    await t.click(); await pg.wait_for_timeout(1800)
                    c = pg.get_by_role('button', name='Encerrar a anterior e começar')
                    if await c.count(): await c.first.click(); await pg.wait_for_timeout(1500)
                    cta = pg.locator('.jg-footer .pill-cta')
                    if await cta.count():
                        await cta.first.click(); await pg.wait_for_timeout(1800)
                        c = pg.get_by_role('button', name='Encerrar a anterior e começar')
                        if await c.count(): await c.first.click(); await pg.wait_for_timeout(1500)
                    note('INFO', f'treinou {area} {label}'); await health(pg, errs, f'{area} {label}')
                    await play(pg, errs, f'{area} {label}', 4)

        await b.close()
    print('\n==== RESUMO ====')
    for l in log:
        if not l.split(': ')[0].endswith('INFO'): print(l)
    print(f'{len([l for l in log if "INFO" not in l])} ocorrências')

if __name__ == "__main__": asyncio.run(main())
