import asyncio, json, re
from playwright.async_api import async_playwright
SCROLLER = """() => { let best=null, h=0; for (const el of document.querySelectorAll('*')) { const s=getComputedStyle(el); if ((s.overflowY==='auto'||s.overflowY==='scroll') && el.scrollHeight>el.clientHeight+20 && el.clientHeight>300) { if (el.scrollHeight>h){h=el.scrollHeight;best=el;} } } if(best){best.setAttribute('data-shoot','1');} return best?[best.scrollHeight,best.clientHeight]:[document.scrollingElement.scrollHeight, innerHeight]; }"""
async def capture(pg, name, max_chunks=6):
    await pg.wait_for_timeout(700)
    total, view = await pg.evaluate(SCROLLER)
    n = min(max_chunks, max(1, -(-total // (view - 80))))
    for i in range(n):
        await pg.evaluate(f"() => {{ const el=document.querySelector('[data-shoot]')||document.scrollingElement; el.scrollTop={i*(view-80)}; }}")
        await pg.wait_for_timeout(350)
        await pg.screenshot(path=f's-{name}-{i}.png')
    await pg.evaluate("() => { const el=document.querySelector('[data-shoot]')||document.scrollingElement; el.scrollTop=0; el.removeAttribute&&el.removeAttribute('data-shoot'); }")
    return n
async def setup(p):
    b = await p.chromium.launch(args=['--no-sandbox'])
    ctx = await b.new_context(viewport={'width':390,'height':780}, device_scale_factor=1)
    pg = await ctx.new_page()
    errs=[]
    pg.on('console', lambda m: errs.append(m.text[:200]) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)[:200]))
    await pg.goto('http://localhost:4173/', wait_until='networkidle'); await pg.wait_for_timeout(1500)
    await pg.locator('input:visible').first.fill('Gabriel')
    await pg.locator('select:visible').first.select_option(index=1)
    await pg.get_by_role('button', name='Criar perfil e jogar').click(); await pg.wait_for_timeout(2500)
    return b, pg, errs
async def tab(pg, name):
    await pg.goto('http://localhost:4173/', wait_until='networkidle'); await pg.wait_for_timeout(1000)
    await pg.get_by_role('button', name=name, exact=True).first.click(); await pg.wait_for_timeout(1000)
