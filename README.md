# LEX — legislação para concursos e direito em geral

Aplicação web (feita para o navegador do celular, com funcionamento offline) que ensina a ler, compreender e memorizar a legislação exigida no **Edital de Abertura nº 02/2026 — Escrevente Técnico Judiciário (2ª a 10ª RAJs)**, Anexo VIII (DJE-SP, Edição 4542, 19/10/2026, p. 154–156).

## Comandos

| Comando | O que faz |
|---|---|
| `npm run import` | Baixa (ou reaproveita de `raw/`) as fontes oficiais, estrutura e grava `public/data/` com proveniência e checagem de cobertura |
| `npm run import:refresh` | Igual, forçando novo download |
| `npm run validate` | Confere cada referência do conteúdo didático contra o texto oficial (artigo + trecho literal) e cada citação doutrinária contra a página do acervo |
| `npm test` | Testes do parser (inclui amostra no formato do Planalto), geradores, FSRS e diff |
| `npm run build` | Tipagem + validação + build (pasta `dist/`, arquivos estáticos) |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run doutrina` | Indexa o acervo doutrinário por artigo e gera o arquivo pessoal `lex-doutrina.json` (para importar no app em Você → Doutrina) |
| `npm run build:public` | Compila o jogo para o GitHub Pages (`dist-public/`). Os acervos doutrinários pessoais são importados no aparelho em Perfil → Doutrina |

## Áreas e modos (versão atual)

- **Áreas:** TJSP (artigos do Anexo VIII do Edital 02/2026), TJMS — Analista Judiciário (leis citadas no Anexo I do edital FGV 2025, na íntegra) e Direito em geral (70 normas, por ramo, baixadas sob demanda).
- **Modos:** Aprender, Memorizar, Casos (situações hipotéticas, separadas da literalidade) e Provar (lei seca, casos ou ambos). Duração de 5 a 30 min ou infinita; cronômetro regressivo no modo com tempo; ordem linear (art. 1, 2…, a partir de qualquer artigo) ou misturada; cobre caput, parágrafos, incisos, alíneas e itens.
- **Literalidade:** distratores priorizam sinônimos e palavras trocáveis da própria lei (ex.: reclusão/detenção, poderá/deverá), sempre com a indicação "Lei · Artigo N, inciso X".
- **Simulados:** lei seca (5 alternativas), Certo/Errado inspirado no CEBRASPE (nota líquida) e situação-problema inspirada na FGV; 10, 30, 50 ou 100 questões, com cronômetro. As questões são geradas a partir do texto oficial — nenhuma questão de prova real é copiada.
- **Comentários doutrinários opcionais em Direito:** trecho literal curto (até ~10 linhas) do acervo do usuário, com obra e página do PDF; Código Penal e CPP comentados são indexados artigo por artigo, as demais obras por menção expressa ao artigo.
- **Mascote (Tuca) e floresta:** cada lei é uma árvore que cresce com o domínio dos artigos.
- **Concursos:** TJSP · Escrevente e TJMS · Analista, com andamento por edital, histórico e listas de revisão, erros recentes e memorização. **Cursos** é a área para conteúdos temáticos de doutrina.
- **Início:** esfera da meta diária, atalhos para retomar o treino, Relâmpago, Simulado e Pomodoro. A tela Jogar reúne área, norma, modo e duração, com as opções de simulado na própria tela.
- **Tuca reage:** feliz no acerto, comemora sequências (3, 5, 10), fica triste no erro com incentivo; tela final com mensagem conforme o desempenho.
- **Sistema visual do Aura aplicado** (a partir das telas do estudo de caso): paleta oficial #8E97FD / #1C2054 / #8B5CF6 / #5B8DEF / #F43F5E; fonte Plus Jakarta Sans (substituta livre da Satoshi); ladrilhos coloridos com ícones ("O que vamos treinar hoje?"), cartão herói ilustrado com botão branco, pílulas de filtro e cartões horizontais ("Sugestões para você"), categorias por ramo com ícones, programas em degradê (Trilhas), cartões de estatística e anéis de crescimento (Progresso), barra inferior com botão central (jogar agora) e onboarding em 4 passos.
- **Visual Aura** (`src/styles/aura.css`, tokens em `tokens.css`): paleta amostrada do estudo de caso Aura (fundo #020210/#080b1f, cartões #272b57→#313465, acento #8992f6→#616bd9), céu estrelado, esfera de vidro, fita de luz e títulos finos. Respeita redução de movimento, de transparência e o modo desempenho.

## Estado das fontes (importação automática)

| Norma | Fonte | Situação |
|---|---|---|
| Lei 10.261/68 (EFP), LC 1.111/10 | ALESP (compilada) | importadas |
| Res. TJSP 850/2021 (compilada + original), 963/2025 | e-SAJ (API pública) | importadas |
| Regimento Interno do TJSP | PDF oficial | importado |
| Normas da Corregedoria — Tomo I | PDF oficial (com notas de rodapé separadas) | importado |
| CP, CPP, CPC, CF, Leis 9.099, 8.429, 13.146 | normas.leg.br (Congresso Nacional/Senado) — compilação monovigente | importadas. O Planalto recusa clientes automatizados (HTTP 403); por decisão do usuário, a fonte federal é o portal do Senado. Importação manual do HTML do Planalto continua disponível no app |
| Lei 12.153/09 | normas.leg.br — publicação original | importada; o Sicon do Senado não registra nenhuma alteração da lei, logo o texto original é o vigente |

## Integridade

- **Cobertura de caracteres exata nas 14 normas**: a recontagem sobre a estrutura final (rótulos, textos, notas, rubricas, rodapés, redações anteriores) bate com a fonte, letra por letra e dígito por dígito.
- **Atualização das leis federais**: cada compilação é confrontada com o Sicon do Senado (lista de normas alteradoras). Alterações registradas mas não citadas na compilação geram aviso no painel; hoje nenhuma atinge artigo exigido no edital (afetam CP 171; CPC 528/611/833 só como ressalva; Lei 9.099 arts. 22–23; EPD arts. 18 e 125; LIA art. 11, XIII, vetado).

- O texto legal nunca é reescrito: o parser apenas segmenta (artigo/§/inciso/alínea/item/pena), separa notas de alteração, rubricas e notas de rodapé e guarda redações anteriores (texto riscado da fonte). Uma checagem conta letras e dígitos da fonte e da estrutura — devem coincidir.
- Cada lei registra fonte, URL, data de obtenção, SHA-256 do arquivo, rótulo de versão e versão do parser.
- Conteúdo didático é rotulado (explicação didática, interpretação jurídica, exemplo hipotético) e separado do texto oficial; redações alteradas em exercícios são identificadas como "propositalmente incorretas".
- O painel administrativo lista lacunas de cobertura do edital, avisos do importador e o estado de verificação das referências (conferidas ao vivo no aparelho, inclusive após importação manual).

## Pontos que exigem atenção humana

- Resoluções do TSE e normas internas do TJMS (Res. 252/2021; Portarias 2.100/2021, 2.121/2021, 2.209/2021, 2.329/2022) não puderam ser baixadas automaticamente (bloqueio do servidor). Salve a página oficial como HTML e importe pelo painel de fontes (ou em `raw/manual/<id>.html` + `npm run import`).
- O índice doutrinário reproduz trechos curtos das obras do acervo, para estudo pessoal; não publique o app com esses dados para terceiros sem autorização dos titulares.

- **Lei 10.261/68, arts. 188, 189, 215, 216 e 318**: a compilação da ALESP mostra apenas a redação anterior (riscada), sem redação vigente visível — o app sinaliza "conferir na fonte".
- **Normas da Corregedoria, art. 370**: não aparece no PDF oficial (fora do recorte do edital).
- Os PDFs do Regimento Interno (gerado em 12/11/2026) e das Normas (atualizadas até 22/10/2026) são posteriores ao edital (19/10/2026); o edital manda considerar a legislação vigente na data da publicação.
- O acervo doutrinário (`acervo/`, obras protegidas por direito autoral) é usado só no build para conferir citações curtas; não é publicado.
