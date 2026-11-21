import type { Lesson } from './types';

export const LESSONS: Lesson[] = [
  {
    id: 'l-ler-lei', titulo: 'Como ler uma lei', subtitulo: 'Artigo, caput, parágrafo, inciso, alínea e item', topicos: ['adm-efp'], minutos: 2,
    slides: [
      { titulo: 'A lei é organizada em camadas', blocos: [
        { tipo: 'texto', texto: 'Toda lei é dividida em artigos. Cada artigo pode ter uma parte principal (o caput) e desdobramentos. Saber essa estrutura é o primeiro passo para memorizar com precisão — e para entender o que a questão de prova está perguntando.' },
        { tipo: 'esquema', titulo: 'Hierarquia dentro do artigo', nos: ['Artigo (Art. 1º, Art. 10)', 'Caput — o texto principal', 'Parágrafo (§ 1º, § 2º… ou Parágrafo único)', 'Inciso (I, II, III…)', 'Alínea (a, b, c…)', 'Item (1, 2, 3…)'] },
      ] },
      { titulo: 'Veja um exemplo real', blocos: [
        { tipo: 'texto', texto: 'No Estatuto dos Funcionários Públicos de SP, o art. 11 tem um caput que anuncia uma lista, e a lista vem em incisos:' },
        { tipo: 'lei', ref: { law: 'efp', art: '11' } },
        { tipo: 'atencao', texto: 'Repare: os incisos só fazem sentido lidos junto com o caput ("Os cargos públicos serão providos por: … nomeação").' },
      ] },
      { titulo: 'Onde as provas escondem armadilhas', blocos: [
        { tipo: 'tabela', cabecalho: ['Fique de olho em', 'Por quê'], linhas: [
          ['poderá × deverá', 'Faculdade × obrigação: a troca muda o sentido da norma'],
          ['salvo, exceto, ressalvado', 'Anunciam exceções — muito cobradas'],
          ['prazos e números', 'Trocas de 15 por 10 dias, 2 por 5 anos'],
          ['reclusão × detenção', 'Espécies de pena com regimes diferentes'],
        ] },
        { tipo: 'exemplo', texto: 'Exemplo hipotético de pegadinha: "A posse poderá verificar-se no prazo de 15 dias". O texto oficial diz "deverá verificar-se no prazo de 30 (trinta) dias" (Estatuto, art. 52).' },
      ] },
    ],
    checks: ['c-tec-01', 'c-tec-02'],
    refs: [{ law: 'efp', art: '11' }, { law: 'efp', art: '52' }],
  },
  {
    id: 'l-crimes-funcionais', titulo: 'Crimes funcionais', subtitulo: 'Crimes praticados por funcionário público contra a Administração (CP, arts. 312 a 327)', topicos: ['penal-cp'], minutos: 3,
    slides: [
      { titulo: 'Quem pode praticar', blocos: [
        { tipo: 'texto', texto: 'Os crimes funcionais exigem que o autor seja funcionário público. O Código Penal usa um conceito amplo: basta exercer cargo, emprego ou função pública, ainda que de forma temporária ou sem remuneração.' },
        { tipo: 'lei', ref: { law: 'cp', art: '327' } },
        { tipo: 'atencao', texto: 'O particular pode responder junto com o funcionário (coautor ou partícipe), desde que conheça a condição de funcionário do comparsa.' },
      ] },
      { titulo: 'O mapa dos principais crimes', blocos: [
        { tipo: 'tabela', cabecalho: ['Crime', 'Verbo-chave', 'Ideia central'], linhas: [
          ['Peculato (312)', 'Apropriar-se / desviar / subtrair', 'Bem sob posse (ou acesso) em razão do cargo'],
          ['Concussão (316)', 'Exigir', 'Impõe vantagem indevida'],
          ['Corrupção passiva (317)', 'Solicitar / receber / aceitar promessa', 'Negocia vantagem indevida'],
          ['Prevaricação (319)', 'Retardar / deixar de praticar / praticar contra a lei', 'Interesse ou sentimento pessoal'],
          ['Condescendência (320)', 'Deixar de responsabilizar', 'Indulgência com subordinado'],
          ['Advocacia administrativa (321)', 'Patrocinar', 'Interesse privado perante a Administração'],
        ] },
      ] },
      { titulo: 'Como diferenciar na prova', blocos: [
        { tipo: 'esquema', titulo: 'Pergunte, nesta ordem', nos: ['Ele já tinha o bem consigo por causa do cargo? → peculato', 'Ele impôs a vantagem? → concussão', 'Ele pediu, recebeu ou aceitou promessa? → corrupção passiva', 'Agiu por interesse ou sentimento pessoal, sem vantagem? → prevaricação', 'Foi tolerante com subordinado infrator? → condescendência criminosa'] },
        { tipo: 'exemplo', texto: 'Exemplo hipotético: o oficial de justiça diz que só cumpre o mandado se receber R$ 300,00. Ele EXIGE — concussão, consumada no momento da exigência.' },
      ] },
      { titulo: 'Penas: reclusão ou detenção?', blocos: [
        { tipo: 'texto', texto: 'Peculato doloso, concussão e corrupção passiva são punidos com reclusão. Prevaricação, condescendência, advocacia administrativa e peculato culposo, com detenção (ou multa, nas penas alternativas).' },
        { tipo: 'atencao', texto: 'Peculato culposo: a reparação do dano antes da sentença irrecorrível extingue a punibilidade; depois dela, reduz de metade a pena (art. 312, § 3º).' },
      ] },
    ],
    checks: ['c-pen-01', 'c-pen-05', 'c-pen-07', 'c-pen-03'],
    refs: [{ law: 'cp', art: '312' }, { law: 'cp', art: '316' }, { law: 'cp', art: '317' }, { law: 'cp', art: '319' }, { law: 'cp', art: '320' }, { law: 'cp', art: '321' }, { law: 'cp', art: '327' }],
  },
  {
    id: 'l-fe-publica', titulo: 'Crimes contra a fé pública', subtitulo: 'Falsidade material, ideológica e uso (CP, arts. 293 a 311-A)', topicos: ['penal-cp'], minutos: 2,
    slides: [
      { titulo: 'Fé pública', blocos: [
        { tipo: 'texto', texto: 'Fé pública é a confiança que a sociedade deposita em documentos, selos, sinais e certames oficiais. Os crimes deste capítulo punem quem frauda essa confiança.' },
        { tipo: 'tabela', cabecalho: ['Falsidade', 'O que é falso', 'Artigos'], linhas: [
          ['Material', 'A forma do documento (forjado ou alterado)', '297 e 298'],
          ['Ideológica', 'O conteúdo de documento formalmente verdadeiro', '299'],
          ['Uso', 'Apresentar papel falso como verdadeiro', '304'],
        ] },
      ] },
      { titulo: 'Outros tipos do edital', blocos: [
        { tipo: 'esquema', nos: ['Falsa identidade (307): atribuir-se ou atribuir a terceiro falsa identidade', 'Uso de documento de identidade alheio (308)', 'Fraudes em certames de interesse público (311-A): usar ou divulgar conteúdo sigiloso de concurso, avaliação ou exame'] },
        { tipo: 'exemplo', texto: 'Exemplo hipotético: o servidor certifica que intimou a parte, mas não intimou. O papel é autêntico; a declaração é falsa → falsidade ideológica, com aumento por ser funcionário que se prevalece do cargo.' },
      ] },
    ],
    checks: ['c-pen-09'],
    refs: [{ law: 'cp', art: '297' }, { law: 'cp', art: '299' }, { law: 'cp', art: '304' }, { law: 'cp', art: '311-A' }],
  },
  {
    id: 'l-particular-justica', titulo: 'Particular contra a Administração e crimes contra a Justiça', subtitulo: 'CP, arts. 328 a 347, 357 e 359', topicos: ['penal-cp'], minutos: 3,
    slides: [
      { titulo: 'Quando o autor é o particular', blocos: [
        { tipo: 'tabela', cabecalho: ['Crime', 'Conduta'], linhas: [
          ['Resistência (329)', 'Opor-se a ato legal com violência ou ameaça'],
          ['Desobediência (330)', 'Desobedecer a ordem legal de funcionário'],
          ['Desacato (331)', 'Desacatar funcionário no exercício da função ou em razão dela'],
          ['Tráfico de influência (332)', 'Solicitar vantagem a pretexto de influir em ato de funcionário'],
          ['Corrupção ativa (333)', 'Oferecer ou prometer vantagem indevida a funcionário'],
        ] },
      ] },
      { titulo: 'Contra a administração da justiça', blocos: [
        { tipo: 'tabela', cabecalho: ['Crime', 'Conduta'], linhas: [
          ['Denunciação caluniosa (339)', 'Dar causa a investigação/processo contra quem sabe inocente'],
          ['Comunicação falsa de crime (340)', 'Provocar ação da autoridade comunicando crime que sabe não ter ocorrido'],
          ['Falso testemunho (342)', 'Afirmação falsa, negar ou calar a verdade como testemunha, perito etc.'],
          ['Coação no curso do processo (344)', 'Usar violência ou grave ameaça para favorecer interesse em processo'],
          ['Exercício arbitrário (345)', 'Fazer justiça pelas próprias mãos'],
          ['Fraude processual (347)', 'Inovar artificiosamente o estado de lugar, coisa ou pessoa'],
          ['Exploração de prestígio (357)', 'Solicitar ou receber vantagem a pretexto de influir em juiz, jurado, MP etc.'],
        ] },
        { tipo: 'atencao', texto: 'Falso testemunho: a retratação antes da sentença no processo em que ocorreu o ilícito torna o fato não punível (art. 342, § 2º).' },
      ] },
    ],
    checks: ['c-pen-08', 'c-pen-10'],
    refs: [{ law: 'cp', art: '330' }, { law: 'cp', art: '331' }, { law: 'cp', art: '333' }, { law: 'cp', art: '339' }, { law: 'cp', art: '342' }],
  },
  {
    id: 'l-comunicacao-atos', titulo: 'Citação e intimação', subtitulo: 'Comunicação dos atos processuais no CPC e no CPP', topicos: ['pc-cpc', 'pp-cpp'], minutos: 2,
    slides: [
      { titulo: 'Duas ideias diferentes', blocos: [
        { tipo: 'tabela', cabecalho: ['', 'Citação', 'Intimação'], linhas: [
          ['Para quê', 'Integrar réu/executado/interessado ao processo', 'Dar ciência de atos e termos do processo'],
          ['Quando', 'No início da relação processual', 'A qualquer momento'],
          ['CPC', 'Art. 238', 'Art. 269'],
        ] },
        { tipo: 'lei', ref: { law: 'cpc', art: '238' } },
      ] },
      { titulo: 'No processo penal', blocos: [
        { tipo: 'esquema', nos: ['Regra: citação por mandado (art. 351)', 'Réu que se oculta: citação por hora certa (art. 362)', 'Réu não encontrado: citação por edital (art. 361)', 'Citado por edital, não comparece nem constitui advogado → suspensão do processo e da prescrição (art. 366)'] },
        { tipo: 'atencao', texto: 'Não existe presunção de veracidade pela revelia no processo penal.' },
      ] },
    ],
    checks: ['c-pc-01', 'c-pp-01', 'c-pp-02'],
    refs: [{ law: 'cpc', art: '238' }, { law: 'cpc', art: '269' }, { law: 'cpp', art: '351' }, { law: 'cpp', art: '366' }],
  },
  {
    id: 'l-juizados', titulo: 'Juizados Especiais', subtitulo: 'Lei nº 9.099/95 (cível e criminal) e Lei nº 12.153/09', topicos: ['pp-9099', 'pc-9099', 'pc-12153'], minutos: 3,
    slides: [
      { titulo: 'Juizado Especial Criminal', blocos: [
        { tipo: 'lei', ref: { law: 'l9099', art: '61' } },
        { tipo: 'esquema', titulo: 'Caminho da infração de menor potencial ofensivo', nos: ['Termo circunstanciado', 'Audiência preliminar', 'Composição dos danos civis (art. 74)', 'Transação penal (art. 76)', 'Denúncia oral e procedimento sumaríssimo'] },
      ] },
      { titulo: 'Dois benefícios que se confundem', blocos: [
        { tipo: 'tabela', cabecalho: ['', 'Transação penal', 'Suspensão condicional'], linhas: [
          ['Critério', 'Pena MÁXIMA ≤ 2 anos', 'Pena MÍNIMA ≤ 1 ano'],
          ['Momento', 'Antes da denúncia', 'Com a denúncia'],
          ['Base', 'Art. 76', 'Art. 89'],
        ] },
      ] },
      { titulo: 'Juizado Cível e da Fazenda Pública', blocos: [
        { tipo: 'tabela', cabecalho: ['', 'JEC (9.099)', 'JEFP (12.153)'], linhas: [
          ['Teto', '40 salários mínimos', '60 salários mínimos'],
          ['Réu', 'Particulares', 'Estados, DF, Territórios, Municípios e entes vinculados'],
          ['Advogado', 'Facultativo até 20 SM', 'Regras próprias e subsidiárias'],
          ['Fazenda', '—', 'Sem prazo diferenciado e sem reexame necessário'],
        ] },
      ] },
    ],
    checks: ['c-pp-03', 'c-pp-04', 'c-pc-06', 'c-pc-07'],
    refs: [{ law: 'l9099', art: '61' }, { law: 'l9099', art: '76' }, { law: 'l9099', art: '89' }, { law: 'l12153', art: '2' }],
  },
  {
    id: 'l-provimento-efp', titulo: 'Provimento, posse, exercício e vacância', subtitulo: 'Estatuto dos Funcionários Públicos de SP (Lei nº 10.261/68)', topicos: ['adm-efp'], minutos: 3,
    slides: [
      { titulo: 'Do concurso ao exercício', blocos: [
        { tipo: 'esquema', titulo: 'Linha do tempo', nos: ['Concurso público (art. 14)', 'Nomeação — forma de provimento (art. 11, I)', 'Posse em até 30 dias da publicação (art. 52)', 'Exercício em até 30 dias da posse (art. 60)'] },
        { tipo: 'lei', ref: { law: 'efp', art: '46' } },
        { tipo: 'lei', ref: { law: 'efp', art: '57' } },
      ] },
      { titulo: 'Formas de provimento', blocos: [
        { tipo: 'lei', ref: { law: 'efp', art: '11' } },
        { tipo: 'tabela', cabecalho: ['Forma', 'Quem volta / entra'], linhas: [
          ['Reintegração', 'Demitido, por decisão judicial transitada em julgado (com ressarcimento)'],
          ['Reversão', 'Aposentado (a pedido ou ex officio)'],
          ['Aproveitamento', 'Funcionário em disponibilidade'],
          ['Readmissão', 'Ex-funcionário demitido ou exonerado (sem ressarcimento)'],
        ] },
      ] },
      { titulo: 'Vacância', blocos: [
        { tipo: 'lei', ref: { law: 'efp', art: '86' } },
        { tipo: 'atencao', texto: 'Exoneração não é pena. Demissão é pena disciplinar e exige processo administrativo.' },
      ] },
    ],
    checks: ['c-adm-01', 'c-adm-02', 'c-adm-03', 'c-adm-07'],
    refs: [{ law: 'efp', art: '11' }, { law: 'efp', art: '46' }, { law: 'efp', art: '52' }, { law: 'efp', art: '57' }, { law: 'efp', art: '60' }, { law: 'efp', art: '86' }],
  },
  {
    id: 'l-disciplinar-efp', titulo: 'Regime disciplinar do servidor paulista', subtitulo: 'Deveres, proibições, penas e procedimentos (arts. 239 a 323)', topicos: ['adm-efp'], minutos: 3,
    slides: [
      { titulo: 'As penas disciplinares', blocos: [
        { tipo: 'lei', ref: { law: 'efp', art: '251' } },
        { tipo: 'tabela', cabecalho: ['Pena', 'Quando', 'Apuração'], linhas: [
          ['Repreensão', 'Indisciplina ou falta de cumprimento dos deveres (art. 253)', 'Sindicância'],
          ['Suspensão (até 90 dias)', 'Falta grave ou reincidência (art. 254)', 'Sindicância'],
          ['Demissão', 'Hipóteses do art. 256 (ex.: inassiduidade)', 'Processo administrativo'],
          ['Demissão a bem do serviço público', 'Hipóteses do art. 257 (ex.: crime contra a administração)', 'Processo administrativo'],
        ] },
      ] },
      { titulo: 'Prazos que mais caem', blocos: [
        { tipo: 'tabela', cabecalho: ['Ato', 'Prazo', 'Artigo'], linhas: [
          ['Apuração preliminar', '30 dias', '265, § 1º'],
          ['Instauração do processo (portaria)', '8 dias, improrrogável', '277'],
          ['Conclusão do processo', '90 dias da citação', '277'],
          ['Alegações finais', '7 dias', '292'],
          ['Relatório', '10 dias', '293'],
          ['Julgamento', '20 dias', '295'],
          ['Recurso', '30 dias', '312, § 1º'],
          ['Prescrição (repreensão, suspensão, multa)', '2 anos', '261, I'],
          ['Prescrição (demissão e cassação)', '5 anos', '261, II'],
        ] },
        { tipo: 'atencao', texto: 'Todos os prazos do Estatuto são contados em dias corridos (art. 323).' },
      ] },
      { titulo: 'Soluções consensuais', blocos: [
        { tipo: 'texto', texto: 'Os arts. 267-A a 267-P tratam de práticas autocompositivas, do Termo de Ajustamento de Conduta (TAC) e da suspensão condicional da sindicância. Segundo as notas da compilação oficial, o TAC foi acrescentado pela Lei Complementar nº 1.361/2021, e parte do capítulo recebeu nova redação da Lei Complementar nº 1.419/2024. Cumprido o TAC, extingue-se a punibilidade (art. 267-J).' },
        { tipo: 'lei', ref: { law: 'efp', art: '267-N' } },
      ] },
    ],
    checks: ['c-adm-04', 'c-adm-05', 'c-adm-06'],
    refs: [{ law: 'efp', art: '251' }, { law: 'efp', art: '261' }, { law: 'efp', art: '277' }, { law: 'efp', art: '323' }],
  },
  {
    id: 'l-adm-publica-cf', titulo: 'Administração Pública na Constituição', subtitulo: 'CF, arts. 37 a 41, e improbidade administrativa', topicos: ['const-cf', 'adm-lia'], minutos: 3,
    slides: [
      { titulo: 'Princípios expressos (LIMPE)', blocos: [
        { tipo: 'esquema', nos: ['Legalidade', 'Impessoalidade', 'Moralidade', 'Publicidade', 'Eficiência'] },
        { tipo: 'texto', texto: 'O caput do art. 37 vale para a administração direta e indireta de qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios.' },
      ] },
      { titulo: 'Concurso e estabilidade', blocos: [
        { tipo: 'tabela', cabecalho: ['Tema', 'Regra'], linhas: [
          ['Validade do concurso', 'Até 2 anos, prorrogável uma vez, por igual período (art. 37, III)'],
          ['Estabilidade', 'Após 3 anos de efetivo exercício (art. 41)'],
          ['Perda do cargo do estável', 'Sentença transitada em julgado, processo administrativo ou avaliação periódica (art. 41, § 1º)'],
        ] },
      ] },
      { titulo: 'Improbidade administrativa', blocos: [
        { tipo: 'texto', texto: 'A Lei nº 8.429/92, reformada pela Lei nº 14.230/2021, exige dolo para todo ato de improbidade. Há três grupos: enriquecimento ilícito (art. 9º), prejuízo ao erário (art. 10) e violação de princípios (art. 11).' },
        { tipo: 'atencao', texto: 'Prescrição da ação de improbidade: 8 anos (art. 23).' },
      ] },
    ],
    checks: ['c-cf-01', 'c-cf-02', 'c-cf-03', 'c-adm-08'],
    refs: [{ law: 'cf', art: '37' }, { law: 'cf', art: '41' }, { law: 'l8429', art: '1' }, { law: 'l8429', art: '23' }],
  },
  {
    id: 'l-direitos-fundamentais', titulo: 'Direitos e garantias fundamentais', subtitulo: 'CF, Título II — Capítulos I, II e III', topicos: ['const-cf'], minutos: 3,
    slides: [
      { titulo: 'O que o edital cobra', blocos: [
        { tipo: 'esquema', nos: ['Cap. I — Direitos e deveres individuais e coletivos (art. 5º)', 'Cap. II — Direitos sociais (arts. 6º a 11)', 'Cap. III — Nacionalidade (arts. 12 e 13)'] },
      ] },
      { titulo: 'Remédios constitucionais', blocos: [
        { tipo: 'tabela', cabecalho: ['Remédio', 'Protege', 'Art. 5º'], linhas: [
          ['Habeas corpus', 'Liberdade de locomoção', 'LXVIII'],
          ['Mandado de segurança', 'Direito líquido e certo não amparado por HC ou HD', 'LXIX'],
          ['Mandado de injunção', 'Exercício de direitos inviabilizado por falta de norma regulamentadora', 'LXXI'],
          ['Habeas data', 'Informações relativas à pessoa do impetrante', 'LXXII'],
          ['Ação popular', 'Patrimônio público, moralidade, meio ambiente, patrimônio histórico e cultural', 'LXXIII'],
        ] },
      ] },
      { titulo: 'Nacionalidade', blocos: [
        { tipo: 'texto', texto: 'Brasileiro nato é quem nasce no Brasil (salvo filhos de estrangeiros a serviço de seu país) ou se enquadra nas hipóteses do art. 12, I, "b" e "c". Alguns cargos são privativos de brasileiro nato (art. 12, § 3º), como Presidente da República e Ministro do STF.' },
      ] },
    ],
    checks: ['c-cf-04', 'c-cf-05'],
    refs: [{ law: 'cf', art: '5' }, { law: 'cf', art: '12' }],
  },
  {
    id: 'l-cpc-essencial', titulo: 'Imparcialidade, revelia e tutela provisória', subtitulo: 'Pontos essenciais do CPC no edital', topicos: ['pc-cpc'], minutos: 2,
    slides: [
      { titulo: 'Imparcialidade do juiz', blocos: [
        { tipo: 'tabela', cabecalho: ['', 'Impedimento (144)', 'Suspeição (145)'], linhas: [
          ['Tipo', 'Objetivo', 'Subjetivo'],
          ['Exemplo', 'Cônjuge advoga na causa', 'Amizade íntima com a parte'],
          ['Prazo para alegar', '15 dias do conhecimento (art. 146)', '15 dias do conhecimento (art. 146)'],
        ] },
      ] },
      { titulo: 'Revelia e tutela provisória', blocos: [
        { tipo: 'lei', ref: { law: 'cpc', art: '344' } },
        { tipo: 'lei', ref: { law: 'cpc', art: '294' } },
        { tipo: 'atencao', texto: 'Tutela da evidência dispensa perigo de dano (art. 311).' },
      ] },
    ],
    checks: ['c-pc-02', 'c-pc-03', 'c-pc-04', 'c-pc-05'],
    refs: [{ law: 'cpc', art: '144' }, { law: 'cpc', art: '145' }, { law: 'cpc', art: '344' }, { law: 'cpc', art: '294' }],
  },
  {
    id: 'l-interna', titulo: 'Teletrabalho e eproc no TJSP', subtitulo: 'Resoluções TJSP nº 850/2021 e nº 963/2025', topicos: ['int-850', 'int-963'], minutos: 2,
    slides: [
      { titulo: 'Teletrabalho', blocos: [
        { tipo: 'lei', ref: { law: 'res850', art: '1' } },
        { tipo: 'tabela', cabecalho: ['Regra', 'Artigo'], linhas: [
          ['Mesmos direitos do presencial, exceto auxílio-transporte', '3º'],
          ['Não pode gerar despesa ao Tribunal', '4º'],
          ['Equipamentos às expensas do servidor', '5º'],
          ['Facultativo, no interesse e a critério da Administração', '10'],
          ['Vedado a quem sofreu penalidade nos 2 anos anteriores', '11, II'],
        ] },
      ] },
      { titulo: 'Governança do eproc', blocos: [
        { tipo: 'lei', ref: { law: 'res963', art: '4' } },
        { tipo: 'esquema', nos: ['CGe — coordena a governança (art. 5º)', 'NGN — ótica negocial (art. 6º)', 'NGT — ótica tecnológica (art. 7º)', 'Comitê Interinstitucional — entidades externas (art. 8º)'] },
      ] },
    ],
    checks: ['c-int-01', 'c-int-02', 'c-int-03'],
    refs: [{ law: 'res850', art: '1' }, { law: 'res850', art: '3' }, { law: 'res963', art: '4' }],
  },
];
