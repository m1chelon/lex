// Gerador de exercícios gramaticais de Língua Portuguesa.
// Cada regra monta, a cada vez, uma frase nova a partir de bancos de palavras, com lacuna ou
// alternativas e a explicação da regra. A chave do cartão (G:regra:semente) permite reproduzir o
// mesmo exercício na revisão espaçada; o desempenho por regra decide o que volta com mais frequência.
import { db } from '../data/db';
import type { Exercise } from './generators';
import { isDue } from './scheduler';
import { hashStr, rng, shuffle } from './text';

export type GramTopic = 'concordancia' | 'regencia' | 'pontuacao' | 'ortografia' | 'semantica';
export const GRAM_TOPICS: { id: GramTopic; title: string; detail: string }[] = [
  { id: 'concordancia', title: 'Concordância verbal e nominal', detail: 'Haver e fazer impessoais, voz passiva com "se", sujeito composto e casos especiais' },
  { id: 'regencia', title: 'Regência e crase', detail: 'Verbos que mudam de sentido com a preposição e casos obrigatórios e proibidos da crase' },
  { id: 'pontuacao', title: 'Pontuação e colocação pronominal', detail: 'Vírgula na oração e próclise, ênclise e mesóclise' },
  { id: 'ortografia', title: 'Ortografia e acentuação', detail: 'Novo Acordo, hífen, porquês e palavras que se confundem' },
  { id: 'semantica', title: 'Classes de palavras e semântica', detail: 'Conectores, coesão e sentido próprio e figurado' },
];

type Random = () => number;
interface Item { prompt: string; answer: string; distractors: string[]; why: string }
interface Rule { id: string; topic: GramTopic; title: string; make: (r: Random) => Item }

const pick = <T,>(r: Random, list: readonly T[]) => list[Math.floor(r() * list.length)];
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// ── Bancos ───────────────────────────────────────────────────────────────
const PLURAL_F = ['reclamações', 'testemunhas', 'certidões', 'petições', 'audiências', 'intimações'];
const PLURAL_M = ['recursos', 'processos', 'documentos', 'pedidos de vista', 'mandados', 'ofícios'];
const PLURAL = [...PLURAL_F, ...PLURAL_M];
const PLACES = ['no cartório', 'no protocolo', 'na vara cível', 'no fórum', 'na sala de audiências'];
const PEOPLE = [['o juiz', 'a promotora'], ['a escrevente', 'o oficial de justiça'], ['o perito', 'a assistente técnica'], ['a defensora', 'o advogado'], ['o diretor', 'a chefe de seção']];

// ── Concordância ─────────────────────────────────────────────────────────
const concordancia: Rule[] = [
  { id: 'haver-existir', topic: 'concordancia', title: 'Haver no sentido de existir', make: (r) => {
    const [when, right, wrong] = pick(r, [['Ontem', 'houve', 'houveram'], ['Hoje', 'há', 'hão'], ['Naquela época', 'havia', 'haviam'], ['Amanhã', 'haverá', 'haverão']] as const);
    return { prompt: `Complete conforme a norma-padrão: "${when}, ___ muitas ${pick(r, PLURAL_F)} ${pick(r, PLACES)}."`, answer: right,
      distractors: [wrong, when === 'Ontem' ? 'tiveram' : when === 'Hoje' ? 'têm' : when === 'Amanhã' ? 'terão' : 'tinham'],
      why: '"Haver" no sentido de existir ou acontecer é impessoal: não tem sujeito e fica sempre na 3ª pessoa do singular. "Ter" com esse sentido é coloquial.' };
  } },
  { id: 'haver-auxiliar', topic: 'concordancia', title: 'Haver impessoal com verbo auxiliar', make: (r) => {
    const [right, wrong] = pick(r, [['Deve', 'Devem'], ['Pode', 'Podem'], ['Costuma', 'Costumam'], ['Vai', 'Vão']] as const);
    return { prompt: `Complete: "___ haver ${pick(r, PLURAL)} ainda sem andamento."`, answer: right, distractors: [wrong, 'Hão de'],
      why: 'Na locução com "haver" impessoal, o auxiliar também fica no singular: "deve haver", "pode haver", "vai haver".' };
  } },
  { id: 'fazer-tempo', topic: 'concordancia', title: 'Fazer indicando tempo decorrido', make: (r) => {
    const n = pick(r, ['dois', 'três', 'cinco', 'dez']);
    const [frame, right, wrong, other] = pick(r, [
      [`___ ${n} anos que o processo tramita.`, 'Faz', 'Fazem', 'Fazem-se'],
      [`___ ${n} anos que o processo tramitava.`, 'Fazia', 'Faziam', 'Haviam'],
      [`Em junho, ___ ${n} anos que o processo tramita.`, 'fará', 'farão', 'haverão'],
    ] as const);
    return { prompt: `Complete: "${frame}"`, answer: right, distractors: [wrong, other],
      why: '"Fazer" indicando tempo decorrido (e "haver" com o mesmo sentido) é impessoal e fica no singular: "faz dois anos", "fazia meses".' };
  } },
  { id: 'existir-pessoal', topic: 'concordancia', title: 'Existir concorda com o sujeito', make: (r) => {
    const noun = pick(r, PLURAL);
    const [right, wrong] = pick(r, [['Existem', 'Existe'], ['Existiam', 'Existia'], ['Ocorreram', 'Ocorreu'], ['Restam', 'Resta']] as const);
    return { prompt: `Complete: "___ ${noun} pendentes de análise."`, answer: right, distractors: [wrong],
      why: `Ao contrário de "haver", os verbos "existir", "ocorrer" e "restar" são pessoais: concordam com o sujeito ("${noun}"), mesmo quando ele vem depois do verbo.` };
  } },
  { id: 'passiva-se', topic: 'concordancia', title: 'Voz passiva sintética (verbo + se)', make: (r) => {
    const [sing, plur, obj] = pick(r, [['Vende', 'Vendem', 'imóveis penhorados'], ['Aluga', 'Alugam', 'salas comerciais'], ['Digitaliza', 'Digitalizam', 'processos antigos'],
      ['Arquiva', 'Arquivam', 'autos findos'], ['Publica', 'Publicam', 'editais toda semana'], ['Corrige', 'Corrigem', 'provas de concurso'], ['Expede', 'Expedem', 'certidões on-line']] as const);
    return { prompt: `Complete: "___-se ${obj}."`, answer: plur, distractors: [sing],
      why: `Com verbo transitivo direto, o "se" é partícula apassivadora: "${obj}" é o sujeito (equivale a "${obj.split(' ')[0]} são ...") e o verbo vai ao plural.` };
  } },
  { id: 'indeterminacao-se', topic: 'concordancia', title: 'Índice de indeterminação do sujeito', make: (r) => {
    const [sing, plur, rest] = pick(r, [['Precisa', 'Precisam', 'de estagiários no cartório'], ['Trata', 'Tratam', 'de casos urgentes'], ['Necessita', 'Necessitam', 'de novos servidores'],
      ['Assiste', 'Assistem', 'a audiências públicas'], ['Confia', 'Confiam', 'em servidores experientes'], ['Obedece', 'Obedecem', 'às normas internas']] as const);
    return { prompt: `Complete: "___-se ${rest}."`, answer: sing, distractors: [plur],
      why: 'Com verbo transitivo indireto (ou intransitivo), o "se" indetermina o sujeito e o verbo fica no singular. O termo preposicionado é objeto indireto, e não sujeito.' };
  } },
  { id: 'sujeito-composto', topic: 'concordancia', title: 'Sujeito composto anteposto', make: (r) => {
    const [a, b] = pick(r, PEOPLE);
    const [right, wrong] = pick(r, [['compareceram', 'compareceu'], ['assinaram', 'assinou'], ['chegaram', 'chegou'], ['votaram', 'votou']] as const);
    return { prompt: `Complete: "${cap(a)} e ${b} ___ à sessão."`, answer: right, distractors: [wrong],
      why: 'Sujeito composto anteposto ao verbo leva o verbo ao plural. (Se vier depois do verbo, admite-se também a concordância com o núcleo mais próximo.)' };
  } },
  { id: 'mais-de-um', topic: 'concordancia', title: '"Mais de um" e "mais de dois"', make: (r) => {
    const [noun, nouns, s, p] = pick(r, [['candidato', 'candidatos', 'faltou', 'faltaram'], ['servidor', 'servidores', 'respondeu', 'responderam'], ['jurado', 'jurados', 'atendeu', 'atenderam']] as const);
    const two = r() < 0.5;
    return { prompt: `Complete: "Mais de ${two ? 'dois' : 'um'} ${two ? nouns : noun} ___ à convocação."`, answer: two ? p : s, distractors: [two ? s : p],
      why: '"Mais de um" pede o verbo no singular; "mais de dois", "mais de dez" etc. levam o verbo ao plural, concordando com o numeral.' };
  } },
  { id: 'e-proibido', topic: 'concordancia', title: '"É proibido", "é necessário", "é bom"', make: (r) => {
    const [adjM, adjF, noun] = pick(r, [['proibido', 'proibida', 'entrada'], ['necessário', 'necessária', 'paciência'], ['bom', 'boa', 'água'], ['permitido', 'permitida', 'saída']] as const);
    const art = r() < 0.5;
    return { prompt: `Complete: "É ___ ${art ? 'a ' : ''}${noun}${noun === 'entrada' || noun === 'saída' ? ' de pessoas estranhas' : ''}."`,
      answer: art ? adjF : adjM, distractors: [art ? adjM : adjF],
      why: 'Sem artigo ou determinante, a expressão fica invariável ("É proibido entrada"). Com o substantivo determinado, o adjetivo concorda com ele ("É proibida a entrada").' };
  } },
  { id: 'anexo-obrigado', topic: 'concordancia', title: 'Anexo, incluso, quite e obrigado', make: (r) => {
    const variant = pick(r, ['anexo', 'quite', 'obrigado', 'incluso'] as const);
    if (variant === 'obrigado') {
      const fem = r() < 0.5;
      return { prompt: `Complete: "${fem ? 'A servidora' : 'O servidor'} agradeceu: — Muito ___."`, answer: fem ? 'obrigada' : 'obrigado', distractors: [fem ? 'obrigado' : 'obrigada'],
        why: '"Obrigado" é adjetivo e concorda com quem agradece: a mulher diz "obrigada"; o homem, "obrigado".' };
    }
    if (variant === 'quite') return { prompt: 'Complete: "Os réus estão ___ com a Justiça Eleitoral."', answer: 'quites', distractors: ['quite'],
      why: '"Quite" é adjetivo e vai ao plural: "estão quites".' };
    const [verb, noun, form, wrong, other] = pick(r, [['Seguem', 'as certidões solicitadas', 'anexas', 'anexo', 'anexos'], ['Seguem', 'os documentos solicitados', 'anexos', 'anexo', 'anexas'],
      ['Segue', 'a procuração solicitada', 'anexa', 'anexo', 'anexas'], ['Seguem', 'as guias de recolhimento', 'inclusas', 'incluso', 'inclusos']] as const);
    return { prompt: `Complete: "${verb} ___ ${noun}."`, answer: form, distractors: [wrong, other],
      why: '"Anexo" e "incluso" são adjetivos e concordam com o substantivo. A locução "em anexo" é que fica invariável.' };
  } },
  { id: 'meio-bastante', topic: 'concordancia', title: 'Meio, bastante e menos', make: (r) => {
    const v = pick(r, ['meio', 'bastante', 'menos'] as const);
    if (v === 'meio') return { prompt: `Complete: "A ${pick(r, ['testemunha', 'servidora', 'juíza'])} estava ___ nervosa."`, answer: 'meio', distractors: ['meia'],
      why: 'Antes de adjetivo, "meio" é advérbio (= um pouco) e não varia. Varia só quando significa "metade": "meia hora".' };
    if (v === 'bastante') return { prompt: `Complete: "Havia ___ ${pick(r, PLURAL)} na pauta."`, answer: 'bastantes', distractors: ['bastante'],
      why: 'Junto a substantivo, "bastante" é pronome indefinido (= muitos) e concorda: "bastantes processos". Junto a adjetivo ou verbo, é advérbio e não varia.' };
    return { prompt: `Complete: "Compareceram ___ ${pick(r, ['pessoas', 'testemunhas', 'partes'])} do que o esperado."`, answer: 'menos', distractors: ['menas'],
      why: '"Menos" é invariável. A forma "menas" não existe na norma-padrão.' };
  } },
  { id: 'ser-horas', topic: 'concordancia', title: 'Verbo ser com horas e datas', make: (r) => {
    const h = pick(r, ['uma', 'duas', 'três', 'meio-dia', 'onze']);
    const plural = h === 'duas' || h === 'três' || h === 'onze';
    return { prompt: `Complete: "___ ${h}${h === 'meio-dia' ? ' e meia' : h === 'uma' ? ' hora' : ' horas'} quando a sessão terminou."`, answer: plural ? 'Eram' : 'Era', distractors: [plural ? 'Era' : 'Eram'],
      why: 'Na indicação de horas, o verbo "ser" concorda com o numeral: "era uma hora", "era meio-dia e meia", "eram duas horas".' };
  } },
];

// ── Regência e crase ─────────────────────────────────────────────────────
const VERBS: { id: string; verb: string; frames: [string, string, string[]][]; why: string }[] = [
  { id: 'assistir', verb: 'assistir (ver)', frames: [['Todos assistiram ___ julgamento.', 'ao', ['o', 'no']], ['Os estudantes assistiram ___ sessão do júri.', 'à', ['a', 'na']]],
    why: 'No sentido de ver, presenciar, "assistir" é transitivo indireto e rege a preposição "a". No sentido de ajudar, é transitivo direto ("o médico assistiu o paciente").' },
  { id: 'visar', verb: 'visar (objetivar)', frames: [['O edital visa ___ seleção dos melhores candidatos.', 'à', ['a', 'na']], ['A reforma visa ___ interesse público.', 'ao', ['o', 'no']]],
    why: 'No sentido de ter como objetivo, "visar" rege a preposição "a". No sentido de mirar ou de dar visto, é transitivo direto ("visou o alvo", "visou o cheque").' },
  { id: 'aspirar', verb: 'aspirar (desejar)', frames: [['O servidor aspira ___ cargo de chefia.', 'ao', ['o', 'pelo']], ['Muitos aspiram ___ promoção na carreira.', 'à', ['a', 'pela']]],
    why: 'No sentido de desejar, "aspirar" rege "a". No sentido de respirar ou sorver, é transitivo direto ("aspirar o ar").' },
  { id: 'obedecer', verb: 'obedecer', frames: [['Todos devem obedecer ___ regimento.', 'ao', ['o', 'no']], ['O réu não obedeceu ___ ordem judicial.', 'à', ['a', 'na']]],
    why: '"Obedecer" e "desobedecer" são transitivos indiretos e regem a preposição "a".' },
  { id: 'chegar', verb: 'chegar e ir', frames: [['Os autos chegaram ___ tribunal ontem.', 'ao', ['no', 'em o']], ['Fomos ___ secretaria pela manhã.', 'à', ['na', 'em a']]],
    why: 'Verbos de movimento ("ir", "chegar", "voltar") regem a preposição "a" na indicação de destino. "Chegar no" e "ir na" são formas coloquiais.' },
  { id: 'proceder', verb: 'proceder (realizar)', frames: [['O juiz procedeu ___ leitura da sentença.', 'à', ['a', 'na']], ['A comissão procedeu ___ exame dos documentos.', 'ao', ['o', 'no']]],
    why: 'No sentido de dar início, realizar, "proceder" é transitivo indireto e rege "a". Não confundir com "preceder" (vir antes).' },
  { id: 'pagar', verb: 'pagar e perdoar', frames: [['O tribunal pagou ___ servidores os valores atrasados.', 'aos', ['os', 'pelos']], ['O credor perdoou a dívida ___ devedor.', 'ao', ['o', 'pelo']]],
    why: '"Pagar" e "perdoar" têm objeto direto de coisa e objeto indireto de pessoa: paga-se algo a alguém; perdoa-se algo a alguém.' },
  { id: 'esquecer', verb: 'esquecer e lembrar', frames: [['Esqueci-me ___ horário da audiência.', 'do', ['o', 'no']], ['Lembrei-me ___ prazo a tempo.', 'do', ['o', 'no']]],
    why: 'Pronominais ("esquecer-se", "lembrar-se"), os verbos regem "de". Sem o pronome, são transitivos diretos: "esqueci o horário", "lembrei o prazo".' },
  { id: 'preferir', verb: 'preferir', frames: [['Prefiro trabalhar ___ ficar parado.', 'a', ['do que', 'que']], ['O réu preferiu o acordo ___ julgamento.', 'ao', ['do que o', 'que o']]],
    why: '"Preferir" rege "a" (prefere-se uma coisa a outra) e dispensa "mais", "antes" e "do que".' },
  { id: 'agradar', verb: 'agradar (satisfazer)', frames: [['A decisão não agradou ___ partes.', 'às', ['as', 'nas']], ['O novo sistema agradou ___ servidores.', 'aos', ['os', 'nos']]],
    why: 'No sentido de satisfazer, "agradar" é transitivo indireto e rege "a". No sentido de acariciar, é transitivo direto.' },
];

const CRASE_TARGETS: [string[], string, string, string[], string][] = [
  [['Refiro-me', 'Entreguei o ofício', 'Dirigi a pergunta'], 'diretora do fórum', 'à', ['a', 'ao'], 'substantivo feminino com artigo: preposição "a" + artigo "a" = à'],
  [['Fiz referência', 'Fiquei atento', 'Apresentei objeção'], 'decisão do relator', 'à', ['a', 'ao'], 'substantivo feminino com artigo: preposição "a" + artigo "a" = à'],
  [['Refiro-me', 'Entreguei o ofício', 'Dirigi a pergunta'], 'juiz da vara', 'ao', ['à', 'a'], 'palavra masculina: não há crase, e sim "ao" (preposição + artigo masculino)'],
  [['Comecei', 'Voltei', 'Passei'], 'estudar com calma', 'a', ['à', 'ao'], 'não há crase antes de verbo'],
  [['Refiro-me', 'Entreguei o ofício', 'Dirigi a pergunta'], 'ela', 'a', ['à', 'àquela'], 'não há crase antes de pronome pessoal'],
  [['Refiro-me', 'Fiz referência', 'Fiz objeção'], 'esta proposta', 'a', ['à', 'àquela'], 'não há crase antes de "esta" e "essa", que não admitem artigo'],
  [['Refiro-me', 'Fiz referência', 'Fiz objeção'], 'aquela proposta', 'àquela', ['aquela', 'a aquela'], 'a preposição "a" se funde ao "a" inicial de "aquela"'],
  [['Encaminho o pedido', 'Dirijo-me', 'Informo'], 'Vossa Excelência', 'a', ['à', 'ao'], 'não há crase antes de pronome de tratamento (exceto "senhora", "senhorita" e "dona")'],
  [['Refiro-me', 'Entreguei os folhetos', 'Dirigi a pergunta'], 'pessoas que não conheço', 'a', ['à', 'às'], '"a" no singular diante de palavra no plural é só preposição: não há crase'],
  [['Entreguei o ofício', 'Agradeci', 'Dirigi a pergunta'], 'senhora que me atendeu', 'à', ['a', 'ao'], '"senhora" admite artigo: há crase'],
];

const regencia: Rule[] = [
  ...VERBS.map((v): Rule => ({ id: `reg-${v.id}`, topic: 'regencia', title: `Regência de ${v.verb}`, make: (r) => {
    const [sentence, answer, distractors] = pick(r, v.frames);
    return { prompt: `Complete conforme a norma-padrão: "${sentence}"`, answer, distractors, why: v.why };
  } })),
  { id: 'crase-refiro', topic: 'regencia', title: 'Crase: quando ocorre e quando é proibida', make: (r) => {
    const [leads, target, answer, distractors, reason] = pick(r, CRASE_TARGETS);
    return { prompt: `Complete: "${pick(r, leads)} ___ ${target}."`, answer, distractors, why: `O termo anterior exige a preposição "a"; aqui, ${reason}.` };
  } },
  { id: 'crase-horas', topic: 'regencia', title: 'Crase na indicação de horas', make: (r) => {
    const v = pick(r, ['às', 'à uma', 'desde as', 'das-às', 'de-a'] as const);
    if (v === 'à uma') return { prompt: 'Complete: "A audiência começará ___ hora da tarde."', answer: 'à uma', distractors: ['a uma', 'há uma'],
      why: 'Na indicação de hora determinada há crase: "à uma hora", "às duas horas".' };
    if (v === 'desde as') return { prompt: 'Complete: "Aguardo o resultado desde ___ 8h."', answer: 'as', distractors: ['às', 'há'],
      why: 'Depois de outra preposição ("desde", "para", "entre", "após") não há crase: "desde as 8h", "entre as 9h e as 10h".' };
    if (v === 'das-às') return { prompt: 'Complete: "O atendimento vai das 9h ___ 17h."', answer: 'às', distractors: ['as', 'a'],
      why: 'Com "das... às" há artigo nos dois termos, e portanto crase no segundo. Com "de... a" não há artigo: "de 9h a 17h".' };
    if (v === 'de-a') return { prompt: 'Complete: "O atendimento vai de 9h ___ 17h."', answer: 'a', distractors: ['às', 'as'],
      why: 'Com "de... a" não há artigo; logo, não há crase: "de 9h a 17h".' };
    return { prompt: `Complete: "A sessão começa ___ ${pick(r, ['duas', 'três', 'quatorze', 'dezoito'])} horas."`, answer: 'às', distractors: ['as', 'a'],
      why: 'Na indicação de hora exata há crase: "às duas horas".' };
  } },
  { id: 'crase-locucoes', topic: 'regencia', title: 'Crase em locuções', make: (r) => {
    const [sentence, answer, why] = pick(r, [
      ['Os servidores saíram ___ pressas.', 'às', 'Locução adverbial feminina leva acento grave: às pressas, à noite, às vezes.'],
      ['Comprou o equipamento ___ vista.', 'à', 'Locução adverbial feminina leva acento grave: à vista, à vontade.'],
      ['Pagou as custas ___ prazo.', 'a', 'Não há crase antes de palavra masculina: a prazo, a pé, a cavalo.'],
      ['Foi ao fórum ___ pé.', 'a', 'Não há crase antes de palavra masculina: a pé.'],
      ['Ficaram frente ___ frente na acareação.', 'a', 'Em expressões com palavras repetidas não há crase: frente a frente, cara a cara, gota a gota.'],
      ['Preparou um bife ___ milanesa.', 'à', 'Na expressão "à moda de", ainda que implícita, há crase: bife à milanesa.'],
      ['Os peritos ficaram ___ distância de dez metros.', 'à', 'Com distância especificada, há crase: à distância de dez metros.'],
    ] as const);
    return { prompt: `Complete: "${sentence}"`, answer, distractors: answer === 'às' ? ['as', 'a'] : answer === 'à' ? ['a', 'há'] : ['à', 'há'], why };
  } },
  { id: 'crase-lugares', topic: 'regencia', title: 'Crase com nomes de lugar', make: (r) => {
    const [place, answer] = pick(r, [['Brasília', 'a'], ['Campo Grande', 'a'], ['Curitiba', 'a'], ['Bahia', 'à'], ['Argentina', 'à'], ['França', 'à'], ['Europa', 'à']] as const);
    return { prompt: `Complete: "No próximo mês, irei ___ ${place}."`, answer, distractors: [answer === 'à' ? 'a' : 'à', 'há'],
      why: `Dica: troque "ir" por "voltar". Quem volta "${answer === 'à' ? 'da' : 'de'} ${place}" vai "${answer} ${place}": só há crase se o lugar admitir artigo.` };
  } },
];

// ── Pontuação e colocação pronominal ─────────────────────────────────────
const SUBJECTS = ['Os servidores do cartório da 2ª Vara Cível', 'A comissão responsável pelo concurso', 'Os candidatos aprovados na primeira fase', 'O oficial de justiça designado para a diligência'];
// [singular, plural, complemento]
const PREDICATES: [string, string, string][] = [['aprovou', 'aprovaram', 'a nova escala de trabalho'], ['publicou', 'publicaram', 'o resultado final'], ['recebeu', 'receberam', 'a convocação por e-mail'], ['assinou', 'assinaram', 'o termo de compromisso']];

const VERB_FORMS = [
  { past: 'enviaram', sing: 'enviou', inf: 'enviar' }, { past: 'entregaram', sing: 'entregou', inf: 'entregar' }, { past: 'comunicaram', sing: 'comunicou', inf: 'comunicar' },
  { past: 'apresentaram', sing: 'apresentou', inf: 'apresentar' }, { past: 'encaminharam', sing: 'encaminhou', inf: 'encaminhar' },
];
const PRONOUNS = ['me', 'nos', 'lhe'];
const ATTRACTORS: [string, string][] = [
  ['Não', 'palavra negativa'], ['Nunca', 'palavra negativa'], ['Ninguém', 'pronome indefinido'], ['Já', 'advérbio sem vírgula'],
  ['Talvez', 'advérbio'], ['Sempre', 'advérbio sem vírgula'], ['Alguém', 'pronome indefinido'],
];

const pontuacao: Rule[] = [
  { id: 'virgula-sujeito', topic: 'pontuacao', title: 'Vírgula entre sujeito e verbo', make: (r) => {
    const subject = pick(r, SUBJECTS);
    const [sing, plur, object] = pick(r, PREDICATES);
    const verb = subject.startsWith('Os ') ? plur : sing;
    const words = subject.split(' ');
    const cut = Math.max(1, Math.floor(words.length / 2));
    return { prompt: 'Assinale a frase pontuada de acordo com a norma-padrão.', answer: `${subject} ${verb} ${object}.`,
      distractors: [`${subject}, ${verb} ${object}.`, `${subject} ${verb}, ${object}.`, `${words.slice(0, cut).join(' ')}, ${words.slice(cut).join(' ')} ${verb} ${object}.`],
      why: 'Não se separa por vírgula o sujeito do verbo, nem o verbo de seu complemento — por mais longo que seja o sujeito.' };
  } },
  { id: 'virgula-vocativo', topic: 'pontuacao', title: 'Vírgula no vocativo', make: (r) => {
    const [name, rest] = pick(r, [['Doutora', 'pode assinar o termo?'], ['Senhores jurados', 'ouçam a acusação.'], ['Pedro', 'traga os autos.'], ['Excelência', 'peço a palavra.']] as const);
    return { prompt: 'Assinale a frase corretamente pontuada.', answer: `${name}, ${rest}`, distractors: [`${name} ${rest}`, `${name}: ${rest}`],
      why: 'O vocativo — termo com que se chama o interlocutor — é sempre isolado por vírgula.' };
  } },
  { id: 'virgula-explicativa', topic: 'pontuacao', title: 'Vírgulas na oração adjetiva explicativa', make: (r) => {
    const [ante, clause, end] = pick(r, [
      ['O Tribunal de Justiça de São Paulo', 'que é o maior do país', 'abriu concurso.'],
      ['A Constituição de 1988', 'que completou mais de três décadas', 'garante o contraditório.'],
      ['Campo Grande', 'que é a capital de Mato Grosso do Sul', 'sediará o evento.'],
    ] as const);
    return { prompt: 'Assinale a frase pontuada de acordo com a norma-padrão.', answer: `${ante}, ${clause}, ${end}`,
      distractors: [`${ante} ${clause} ${end}`, `${ante}, ${clause} ${end}`, `${ante} ${clause}, ${end}`],
      why: 'Quando o antecedente já é único e determinado (nome próprio), a oração adjetiva é explicativa e fica entre vírgulas — as duas.' };
  } },
  { id: 'virgula-adversativa', topic: 'pontuacao', title: 'Conjunção deslocada entre vírgulas', make: (r) => {
    const [subj, rest] = pick(r, [['O réu', 'não compareceu à audiência.'], ['A defesa', 'apresentou o recurso fora do prazo.'], ['O sistema', 'voltou a funcionar à tarde.']] as const);
    const conj = pick(r, ['porém', 'contudo', 'todavia', 'entretanto', 'portanto']);
    return { prompt: 'Assinale a pontuação correta.', answer: `${subj}, ${conj}, ${rest}`, distractors: [`${subj} ${conj}, ${rest}`, `${subj}, ${conj} ${rest}`, `${subj} ${conj} ${rest}`],
      why: 'Conjunção adversativa ou conclusiva deslocada para o meio da oração fica entre vírgulas.' };
  } },
  { id: 'virgula-adjunto', topic: 'pontuacao', title: 'Adjunto adverbial e oração deslocados', make: (r) => {
    const [front, rest] = pick(r, [['Encerrada a instrução', 'as partes apresentaram alegações finais.'], ['Quando o juiz chegou', 'a sessão foi aberta.'],
      ['Durante a audiência de conciliação', 'as partes chegaram a um acordo.'], ['Se o prazo não for cumprido', 'o pedido será indeferido.']] as const);
    return { prompt: 'Assinale a pontuação correta.', answer: `${front}, ${rest}`, distractors: [`${front} ${rest}`, `${front}; ${rest}`, `${front}: ${rest}`],
      why: 'Adjunto adverbial longo ou oração adverbial antepostos à oração principal são separados por vírgula.' };
  } },
  { id: 'colocacao-atrator', topic: 'pontuacao', title: 'Próclise com palavra atrativa', make: (r) => {
    const v = pick(r, VERB_FORMS), p = pick(r, PRONOUNS), [word, kind] = pick(r, ATTRACTORS);
    const rest = 'os documentos';
    const verb = word === 'Ninguém' || word === 'Alguém' ? v.sing : v.past;
    return { prompt: 'Assinale a colocação pronominal de acordo com a norma-padrão.', answer: `${word} ${p} ${verb} ${rest}.`,
      distractors: [`${word} ${verb}-${p} ${rest}.`, `${word} ${verb} ${p} ${rest}.`],
      why: `"${word}" (${kind}) atrai o pronome para antes do verbo: próclise.` };
  } },
  { id: 'colocacao-inicio', topic: 'pontuacao', title: 'Ênclise no início do período', make: (r) => {
    const v = pick(r, VERB_FORMS), p = pick(r, PRONOUNS);
    return { prompt: 'Assinale a colocação pronominal de acordo com a norma-padrão.', answer: `${cap(v.past)}-${p} os documentos ontem.`,
      distractors: [`${cap(p)} ${v.past} os documentos ontem.`, `${cap(v.past)} ${p} os documentos ontem.`],
      why: 'A norma-padrão não admite iniciar o período com pronome oblíquo átono. Sem palavra atrativa, usa-se a ênclise.' };
  } },
  { id: 'colocacao-mesoclise', topic: 'pontuacao', title: 'Mesóclise no futuro', make: (r) => {
    const v = pick(r, VERB_FORMS), p = pick(r, PRONOUNS);
    const fut = `${v.inf}ei`;
    const attracted = r() < 0.4;
    if (attracted) return { prompt: 'Assinale a colocação pronominal de acordo com a norma-padrão.', answer: `Não ${p} ${fut} os documentos amanhã.`,
      distractors: [`Não ${v.inf}-${p}-ei os documentos amanhã.`, `Não ${fut}-${p} os documentos amanhã.`],
      why: 'Com palavra atrativa ("não"), prevalece a próclise mesmo no futuro.' };
    return { prompt: 'Assinale a colocação pronominal de acordo com a norma-padrão.', answer: `${cap(v.inf)}-${p}-ei os documentos amanhã.`,
      distractors: [`${cap(fut)}-${p} os documentos amanhã.`, `${cap(p)} ${fut} os documentos amanhã.`],
      why: 'Com o verbo no futuro do presente ou do pretérito, no início do período e sem palavra atrativa, usa-se a mesóclise. A ênclise ao futuro é proibida.' };
  } },
  { id: 'colocacao-participio', topic: 'pontuacao', title: 'Pronome em locução com particípio', make: (r) => {
    const [aux, part] = pick(r, [['tinha', 'dado'], ['havia', 'enviado'], ['tinha', 'entregado'], ['havia', 'comunicado']] as const);
    const p = pick(r, ['me', 'lhe', 'nos']);
    return { prompt: 'Assinale a colocação pronominal correta.', answer: `O cartório ${aux}-${p} ${part} a notícia.`,
      distractors: [`O cartório ${aux} ${part}-${p} a notícia.`, `O cartório ${aux} ${part} ${p} a notícia.`],
      why: 'Nunca há ênclise ao particípio. O pronome se liga ao verbo auxiliar.' };
  } },
];

// ── Ortografia e acentuação ──────────────────────────────────────────────
const HYPHEN: [string, string[], string][] = [
  ['anti-inflamatório', ['antiinflamatório', 'anti inflamatório'], 'Prefixo terminado na mesma vogal que inicia a palavra seguinte: hífen (anti-inflamatório, micro-ondas).'],
  ['micro-ondas', ['microondas', 'micro ondas'], 'Prefixo terminado na mesma vogal que inicia a palavra seguinte: hífen.'],
  ['autoestima', ['auto-estima', 'auto estima'], 'Prefixo terminado em vogal diferente da vogal inicial da palavra seguinte: junta-se sem hífen.'],
  ['infraestrutura', ['infra-estrutura', 'infra estrutura'], 'Prefixo terminado em vogal diferente da vogal inicial: sem hífen.'],
  ['antissocial', ['anti-social', 'antisocial'], 'Prefixo em vogal + palavra iniciada por "s" ou "r": junta-se e dobra-se a consoante.'],
  ['contrarregra', ['contra-regra', 'contraregra'], 'Prefixo em vogal + palavra iniciada por "r": junta-se e dobra-se o "r".'],
  ['ultrassom', ['ultra-som', 'ultrasom'], 'Prefixo em vogal + palavra iniciada por "s": junta-se e dobra-se o "s".'],
  ['super-homem', ['superhomem', 'super homem'], 'Palavra iniciada por "h": hífen (super-homem, pré-história).'],
  ['inter-regional', ['interregional', 'inter regional'], 'Prefixo terminado em "r" + palavra iniciada por "r": hífen.'],
  ['sub-base', ['subbase', 'sub base'], 'Prefixo terminado em "b" + palavra iniciada por "b": hífen.'],
  ['coautor', ['co-autor', 'co autor'], 'O prefixo "co" junta-se sem hífen, mesmo diante de "o": coautor, coordenar, coobrigação.'],
  ['ex-presidente', ['expresidente', 'ex presidente'], '"Ex" (no sentido de anterior), "vice", "pós", "pré" e "pró" tônicos pedem hífen.'],
  ['vice-presidente', ['vicepresidente', 'vice presidente'], '"Vice" sempre pede hífen.'],
  ['pós-graduação', ['posgraduação', 'pós graduação'], '"Pós", "pré" e "pró" tônicos pedem hífen.'],
  ['semicírculo', ['semi-círculo', 'semi círculo'], 'Prefixo terminado em vogal diferente da vogal inicial: sem hífen.'],
  ['minissaia', ['mini-saia', 'minisaia'], 'Prefixo em vogal + palavra iniciada por "s": junta-se e dobra-se o "s".'],
  ['mal-humorado', ['malhumorado', 'mau-humorado'], '"Mal" pede hífen antes de vogal, "h" ou "l".'],
  ['dia a dia', ['dia-a-dia', 'diaadia'], 'Locuções perderam o hífen no Novo Acordo: dia a dia, fim de semana, pé de moleque.'],
];
const ACCENT: [string, string[], string, string?][] = [
  ['ideia', ['idéia'], 'O Novo Acordo eliminou o acento dos ditongos abertos "ei" e "oi" em paroxítonas: ideia, assembleia, heroico, jiboia.'],
  ['assembleia', ['assembléia'], 'Ditongo aberto "ei" em paroxítona não é mais acentuado.'],
  ['heroico', ['heróico'], 'Ditongo aberto "oi" em paroxítona não é mais acentuado (mas "herói", oxítona, mantém o acento).'],
  ['voo', ['vôo'], 'Caiu o acento do hiato "oo": voo, enjoo, perdoo.'],
  ['enjoo', ['enjôo'], 'Caiu o acento do hiato "oo".'],
  ['leem', ['lêem'], 'Caiu o acento de "eem" dos verbos crer, dar, ler e ver: creem, deem, leem, veem.', 'Os jurados ___ os autos com atenção.'],
  ['veem', ['vêem'], 'Caiu o acento de "eem": veem, leem, creem, deem.', 'Os servidores ___ o problema todos os dias.'],
  ['feiura', ['feiúra'], 'Não se acentua "i" ou "u" tônicos depois de ditongo em paroxítona: feiura, baiuca.'],
  ['herói', ['heroi'], 'Oxítonas com ditongo aberto "ói", "éi", "éu" continuam acentuadas: herói, papéis, chapéu.'],
  ['têm', ['tem'], 'No plural, "ter" e "vir" levam acento circunflexo: ele tem, eles têm; ele vem, eles vêm.', 'Os réus ___ direito à ampla defesa.'],
  ['pôde', ['pode'], '"Pôde" (pretérito) mantém o acento diferencial em relação a "pode" (presente).', 'Ontem o perito não ___ comparecer.'],
  ['saúde', ['saude'], '"I" e "u" tônicos em hiato, sozinhos na sílaba, são acentuados: saúde, juízes, baú.'],
  ['pôr', ['por'], 'O verbo "pôr" mantém o acento diferencial em relação à preposição "por".', 'O servidor vai ___ os autos em ordem.'],
];
const PARONYMS: [string, string, string[], string][] = [
  ['O réu agiu ___ ao mentir para o juiz.', 'mal', ['mau'], '"Mal" é advérbio (oposto de "bem"); "mau" é adjetivo (oposto de "bom").'],
  ['Foi um ___ negócio para as partes.', 'mau', ['mal'], '"Mau" é adjetivo (oposto de "bom") e acompanha substantivo.'],
  ['O processo tramita ___ três anos.', 'há', ['a', 'à'], 'Para tempo decorrido usa-se "há" (= faz).'],
  ['A audiência será daqui ___ três dias.', 'a', ['há', 'à'], 'Para tempo futuro usa-se a preposição "a".'],
  ['O juiz falou ___ das provas.', 'acerca', ['a cerca', 'há cerca'], '"Acerca de" = a respeito de. "Há cerca de" indica tempo decorrido aproximado.'],
  ['___ você vai com tanta pressa?', 'Aonde', ['Onde', 'Donde'], '"Aonde" é usado com verbos de movimento (ir a). "Onde" indica lugar fixo.'],
  ['Estudou muito ___ de ser aprovado.', 'a fim', ['afim', 'à fim'], '"A fim de" indica finalidade; "afim" significa semelhante, que tem afinidade.'],
  ['Estude, ___ será reprovado.', 'senão', ['se não', 'sinão'], '"Senão" junto = caso contrário, a não ser. "Se não" separado = caso não.'],
  ['A ___ do Tribunal do Júri começou às 13h.', 'sessão', ['seção', 'cessão'], '"Sessão" = reunião; "seção" = setor; "cessão" = ato de ceder.'],
  ['A petição foi entregue na ___ de protocolo.', 'seção', ['sessão', 'cessão'], '"Seção" (ou secção) = setor, divisão.'],
  ['Não conheço a lei, ___ o regimento.', 'tampouco', ['tão pouco', 'tampoco'], '"Tampouco" = também não. "Tão pouco" = muito pouco.'],
  ['___ de recorrer, a parte aceitou o acordo.', 'Em vez', ['Ao invés', 'Invés'], '"Em vez de" = no lugar de. "Ao invés de" = ao contrário de, e só cabe entre ideias opostas (subir × descer). Recorrer e aceitar acordo não são opostos.'],
];

const PORQUES: [string, string, string[], string][] = [
  ['___ o réu faltou à audiência?', 'Por que', ['Porque', 'Por quê', 'Porquê'], 'Em pergunta, separado e sem acento: "por que" (= por qual razão).'],
  ['O réu faltou ___?', 'por quê', ['por que', 'porque', 'porquê'], 'No fim da frase, antes de pontuação, "quê" é tônico e leva acento: "por quê?".'],
  ['O réu faltou ___ estava doente.', 'porque', ['por que', 'por quê', 'porquê'], 'Na resposta ou explicação, junto e sem acento: "porque" (= pois, uma vez que).'],
  ['Ninguém entendeu o ___ da decisão.', 'porquê', ['por que', 'porque', 'por quê'], 'Substantivado (com artigo), junto e com acento: "o porquê" (= o motivo).'],
  ['Este é o motivo ___ recorri da sentença.', 'por que', ['porque', 'por quê', 'porquê'], 'Equivalente a "pelo qual", separado e sem acento.'],
  ['Não sei ___ o processo foi arquivado.', 'por que', ['porque', 'por quê', 'porquê'], 'Pergunta indireta (= por qual razão): separado e sem acento.'],
];

const ortografia: Rule[] = [
  { id: 'porques', topic: 'ortografia', title: 'Emprego dos porquês', make: (r) => {
    const [s, answer, distractors, why] = pick(r, PORQUES);
    return { prompt: `Complete: "${s}"`, answer, distractors, why };
  } },
  { id: 'hifen', topic: 'ortografia', title: 'Hífen no Novo Acordo', make: (r) => {
    const [answer, distractors, why] = pick(r, HYPHEN);
    return { prompt: 'Assinale a grafia correta segundo o Novo Acordo Ortográfico.', answer, distractors, why };
  } },
  { id: 'acentuacao', topic: 'ortografia', title: 'Acentuação após o Novo Acordo', make: (r) => {
    const [answer, distractors, why, sentence] = pick(r, ACCENT);
    return { prompt: sentence ? `Complete: "${sentence}"` : 'Assinale a grafia correta segundo o Novo Acordo Ortográfico.', answer, distractors, why };
  } },
  { id: 'paronimos', topic: 'ortografia', title: 'Palavras que se confundem', make: (r) => {
    const [s, answer, distractors, why] = pick(r, PARONYMS);
    return { prompt: `Complete: "${s}"`, answer, distractors, why };
  } },
];

// ── Classes de palavras e semântica ──────────────────────────────────────
const RELATIONS = {
  concessão: ['embora', 'ainda que', 'conquanto', 'mesmo que'],
  causa: ['porque', 'já que', 'visto que', 'uma vez que'],
  conclusão: ['portanto', 'logo', 'por isso', 'por conseguinte'],
  oposição: ['mas', 'porém', 'contudo', 'todavia', 'no entanto'],
  condição: ['se', 'caso', 'desde que', 'contanto que'],
  finalidade: ['para que', 'a fim de que'],
  proporção: ['à medida que', 'à proporção que'],
} as const;
type Relation = keyof typeof RELATIONS;

// Cada frase indica as relações que, no lugar do conector certo, tornam o texto incoerente.
const CONNECTOR_FRAMES: { rel: Relation; text: string; wrong: Relation[] }[] = [
  { rel: 'oposição', text: 'O réu tinha bons antecedentes; ___, foi condenado.', wrong: ['conclusão'] },
  { rel: 'oposição', text: 'O prazo era curto; ___, a defesa conseguiu cumpri-lo.', wrong: ['conclusão'] },
  { rel: 'conclusão', text: 'A prova pericial confirmou a autoria; ___, o pedido foi julgado procedente.', wrong: ['oposição'] },
  { rel: 'conclusão', text: 'O recurso foi interposto fora do prazo; ___, não será conhecido.', wrong: ['oposição'] },
  { rel: 'concessão', text: '___ tivesse bons antecedentes, o réu foi condenado.', wrong: ['condição', 'finalidade'] },
  { rel: 'concessão', text: '___ o prazo fosse curto, a defesa conseguiu cumpri-lo.', wrong: ['condição', 'finalidade'] },
  { rel: 'condição', text: '___ o prazo não seja cumprido, o pedido será indeferido.', wrong: ['finalidade', 'concessão'] },
  { rel: 'finalidade', text: 'Juntou os documentos ___ o processo andasse mais rápido.', wrong: ['concessão', 'condição'] },
  { rel: 'causa', text: 'O pedido foi negado ___ faltavam documentos essenciais.', wrong: ['concessão', 'finalidade'] },
  { rel: 'proporção', text: '___ o prazo se aproximava, aumentava a ansiedade dos candidatos.', wrong: ['concessão', 'condição'] },
];

const FIGURATIVE: [string, string, string[]][] = [
  ['pesado', 'O clima na audiência ficou pesado depois do depoimento.', ['A caixa com os autos estava pesada.', 'O cofre do fórum é muito pesado.', 'Levaram um pacote pesado ao protocolo.']],
  ['frio', 'O juiz recebeu as partes com um tratamento frio.', ['O dia amanheceu frio em Campo Grande.', 'A água do bebedouro estava fria.', 'O ar-condicionado deixou a sala fria.']],
  ['porta', 'O concurso foi a porta de entrada para a carreira.', ['A porta da sala de audiências estava fechada.', 'Trocaram a porta do cartório.', 'O segurança abriu a porta do fórum.']],
  ['chave', 'O depoimento foi a chave para esclarecer o crime.', ['Perdi a chave do armário.', 'A chave do arquivo ficou com o diretor.', 'Guardaram a chave na gaveta.']],
  ['afogado', 'O servidor está afogado em processos atrasados.', ['O banhista quase morreu afogado.', 'Os bombeiros resgataram um homem afogado.', 'O laudo indicou que a vítima morreu afogada.']],
];

const COHESION: [string, string][] = [['o perito', 'a testemunha'], ['o juiz', 'o promotor'], ['a defensora', 'a advogada'], ['o recurso', 'a apelação']];

const semantica: Rule[] = [
  { id: 'conector-escolha', topic: 'semantica', title: 'Conectores e relações de sentido', make: (r) => {
    const frame = pick(r, CONNECTOR_FRAMES);
    const right = pick(r, RELATIONS[frame.rel]);
    const first = frame.text.startsWith('___');
    const distractors = frame.wrong.flatMap((rel) => shuffle([...RELATIONS[rel]], r).slice(0, frame.wrong.length === 1 ? 3 : 2)).slice(0, 4);
    const shape = (word: string) => first ? cap(word) : word;
    const explain: Record<Relation, string> = {
      concessão: 'A concessão apresenta um fato contrário que não impede o principal.', oposição: 'As adversativas contrapõem ideias.',
      conclusão: 'As conclusivas introduzem consequência lógica do que foi dito.', condição: 'A condicional apresenta a hipótese de que depende o fato principal.',
      finalidade: 'A final indica o objetivo da ação.', causa: 'A causal apresenta o motivo.', proporção: 'A proporcional indica fatos que variam juntos.',
    };
    return { prompt: `Assinale o conector que completa a frase com coerência: "${frame.text}"`, answer: shape(right), distractors: distractors.map(shape),
      why: `A relação entre as ideias é de ${frame.rel}, expressa por "${right}". ${explain[frame.rel]}` };
  } },
  { id: 'conector-valor', topic: 'semantica', title: 'Valor semântico do conector', make: (r) => {
    const frame = pick(r, CONNECTOR_FRAMES);
    const right = pick(r, RELATIONS[frame.rel]);
    const filled = frame.text.replace('___', frame.text.startsWith('___') ? cap(right) : right);
    const distractors = shuffle((Object.keys(RELATIONS) as Relation[]).filter((rel) => rel !== frame.rel), r).slice(0, 3);
    return { prompt: `Em "${filled}", o conector "${right}" expressa ideia de`, answer: frame.rel, distractors,
      why: `"${right}" pertence ao grupo de conectores de ${frame.rel}: ${RELATIONS[frame.rel].join(', ')}.` };
  } },
  { id: 'conector-sinonimo', topic: 'semantica', title: 'Troca de conector sem mudar o sentido', make: (r) => {
    const rel = pick(r, ['oposição', 'conclusão', 'causa', 'concessão'] as const);
    const [a, b] = shuffle([...RELATIONS[rel]], r);
    const others = shuffle((Object.keys(RELATIONS) as Relation[]).filter((x) => x !== rel), r).slice(0, 3).map((x) => pick(r, RELATIONS[x]));
    return { prompt: `Qual conector pode substituir "${a}" sem alterar a relação de sentido?`, answer: b, distractors: others,
      why: `"${a}" e "${b}" expressam ${rel}. Atenção: "porquanto" é causal, "conquanto" é concessivo e "portanto" é conclusivo.` };
  } },
  { id: 'figurado', topic: 'semantica', title: 'Sentido próprio e figurado', make: (r) => {
    const [word, fig, literal] = pick(r, FIGURATIVE);
    return { prompt: `Em qual frase a palavra "${word}" está em sentido figurado (conotativo)?`, answer: fig, distractors: shuffle(literal, r),
      why: 'No sentido figurado, a palavra ganha significado novo pelo contexto (por exemplo, por semelhança). Nas demais frases, ela tem o sentido próprio, literal.' };
  } },
  { id: 'coesao-este-aquele', topic: 'semantica', title: 'Coesão: este e aquele', make: (r) => {
    const [a, b] = pick(r, COHESION);
    const near = r() < 0.5;
    const pron = near ? (b.startsWith('a ') ? 'Esta' : 'Este') : (a.startsWith('a ') ? 'Aquela' : 'Aquele');
    return { prompt: `Leia: "${cap(a)} e ${b} participaram da audiência. ${pron} falou primeiro." O pronome "${pron}" retoma`, answer: `"${near ? b : a}"`,
      distractors: [`"${near ? a : b}"`, 'os dois termos', 'a audiência'],
      why: 'Em referência a dois termos, "este/esta" retoma o mais próximo (o último citado); "aquele/aquela", o mais distante (o primeiro).' };
  } },
];

export const GRAM_RULES: Rule[] = [...concordancia, ...regencia, ...pontuacao, ...ortografia, ...semantica];
const ruleById = new Map(GRAM_RULES.map((rule) => [rule.id, rule]));

/** Exercício reproduzível a partir da chave G:regra:semente. */
export function grammarExercise(key: string): Exercise | null {
  const [, ruleId, seed] = key.split(':');
  const rule = ruleById.get(ruleId);
  if (!rule || !seed) return null;
  const r = rng(`${ruleId}:${seed}`);
  const item = rule.make(r);
  const seen = new Set([item.answer.toLowerCase()]);
  const distractors = item.distractors.filter((d) => !seen.has(d.toLowerCase()) && (seen.add(d.toLowerCase()), true));
  const options = shuffle([
    { id: 'ok', text: item.answer, correct: true, why: item.why },
    ...distractors.map((text, i) => ({ id: `d${i}`, text, correct: false })),
  ], r);
  const topic = GRAM_TOPICS.find(({ id }) => id === rule.topic)!;
  return {
    key, kind: 'doctrine', family: 'interpretacao', dim: 'conceitual', prompt: item.prompt, stem: [], options,
    answer: item.answer, expectedMs: 25_000, stage: 1, where: rule.title,
    doctrine: { courseId: 'portugues', module: `${topic.title} · ${rule.title}`, source: 'Gerador gramatical do LEX', pages: '' },
  };
}

export const isGrammarKey = (key: string) => key.startsWith('G:');

/** Desempenho por regra: base da escolha das próximas questões e do painel por tema. */
export async function grammarStats() {
  const reviews = await db.reviews.where('cardId').startsWith('G:').toArray();
  const byRule = new Map<string, { right: number; wrong: number; last?: boolean }>();
  for (const row of reviews.sort((a, b) => a.at - b.at)) {
    const rule = row.cardId.split(':')[1];
    const entry = byRule.get(rule) ?? { right: 0, wrong: 0 };
    if (row.correct) entry.right++; else entry.wrong++;
    entry.last = row.correct;
    byRule.set(rule, entry);
  }
  const topics = GRAM_TOPICS.map((topic) => {
    const rules = GRAM_RULES.filter((rule) => rule.topic === topic.id);
    const right = rules.reduce((n, rule) => n + (byRule.get(rule.id)?.right ?? 0), 0);
    const wrong = rules.reduce((n, rule) => n + (byRule.get(rule.id)?.wrong ?? 0), 0);
    return { ...topic, rules: rules.length, right, wrong, weakest: rules.filter((rule) => byRule.get(rule.id)?.last === false).map((rule) => rule.title) };
  });
  return { byRule, topics };
}

export const GRAMMAR_BATCH = 12;

/**
 * Monta uma rodada: primeiro as revisões vencidas e os erros recentes (mesma frase, para fixar),
 * depois regras novas ou com pior desempenho, alternando os temas.
 */
export async function buildGrammarSession(topic: GramTopic | undefined, seed: string, size = GRAMMAR_BATCH): Promise<Exercise[]> {
  const random = rng(`gramatica:${seed}`);
  const rules = GRAM_RULES.filter((rule) => !topic || rule.topic === topic);
  const allowed = new Set(rules.map(({ id }) => id));
  const [cards, { byRule }] = await Promise.all([db.cards.where('id').startsWith('G:').toArray(), grammarStats()]);
  const now = new Date();
  const items: Exercise[] = [];
  const used = new Set<string>();
  const push = (key: string) => {
    const exercise = grammarExercise(key);
    if (exercise && !used.has(key) && allowed.has(key.split(':')[1])) { used.add(key); items.push(exercise); }
  };
  // Revisões vencidas e erros mais recentes (até metade da rodada).
  const latest = new Map<string, boolean>();
  for (const row of await db.reviews.where('cardId').startsWith('G:').toArray()) latest.set(row.cardId, row.correct);
  const retry = [...cards.filter((card) => isDue(card.fsrs, now)).map(({ id }) => id), ...[...latest].filter(([, ok]) => !ok).map(([id]) => id)];
  for (const key of shuffle([...new Set(retry)], random)) { if (items.length >= Math.floor(size / 2)) break; push(key); }
  // Regras ordenadas por necessidade: nunca vistas e com mais erros primeiro.
  const score = (id: string) => { const s = byRule.get(id); if (!s) return 3 + random(); return s.wrong * 2 - s.right + (s.last === false ? 3 : 0) + random(); };
  const ranked = [...rules].sort((a, b) => score(b.id) - score(a.id));
  const queues = new Map<GramTopic, Rule[]>();
  for (const rule of ranked) queues.set(rule.topic, [...queues.get(rule.topic) ?? [], rule]);
  let round = 0;
  while (items.length < size && round < 50) {
    for (const queue of queues.values()) {
      if (items.length >= size) break;
      const rule = queue[round % queue.length];
      if (rule) push(`G:${rule.id}:${hashStr(`${seed}:${round}:${rule.id}`)}`);
    }
    round++;
  }
  return items;
}
