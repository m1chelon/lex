// Sinônimos jurídicos usados como DISTRATORES em lacunas de literalidade.
// Todas as opções fazem sentido; só acerta quem memorizou a palavra EXATA da lei.
// Cada grupo reúne palavras intercambiáveis na MESMA flexão (gênero/número/tempo).
// Grupos marcados com '*' são adjetivos/particípios em -o: geram -a, -os, -as.
const RAW = `
*vedado|proibido|defeso|permitido
*permitido|autorizado|facultado|admitido
*assegurado|garantido|resguardado|preservado
*obrigatório|compulsório|imperativo|cogente
*necessário|indispensável|imprescindível|essencial
*fundamentado|motivado|justificado|arrazoado
*respectivo|correspondente|pertinente|próprio
*público|estatal|oficial|governamental
*nulo|inválido|ineficaz|írrito
*prévio|antecedente|preliminar|anterior
*expresso|explícito|textual|formal
*competente|habilitado|apto|legitimado
*escrito|redigido|documentado|registrado
compete|cabe|incumbe|cumpre
competirá|caberá|incumbirá|cumprirá
competem|cabem|incumbem|cumprem
determinará|ordenará|mandará|decidirá
determinar|ordenar|mandar|decidir
instaurará|abrirá|iniciará|deflagrará
instaurar|abrir|iniciar|deflagrar
comunicará|informará|notificará|cientificará
comunicar|informar|notificar|cientificar
encaminhará|remeterá|enviará|transmitirá
encaminhados|remetidos|enviados|transmitidos
apresentar|oferecer|juntar|protocolar
apresentará|oferecerá|juntará|protocolará
requerer|pedir|solicitar|postular
requerida|pedida|solicitada|postulada
observará|respeitará|cumprirá|atenderá
observado|respeitado|cumprido|atendido
observados|respeitados|cumpridos|atendidos
expedir|emitir|lavrar|elaborar
expedido|emitido|lavrado|elaborado
expedida|emitida|lavrada|elaborada
designará|nomeará|indicará|escolherá
praticar|realizar|executar|efetuar
praticado|realizado|executado|efetuado
praticada|realizada|executada|efetuada
exigir|cobrar|reclamar|demandar
receber|aceitar|acolher|obter
retardar|atrasar|protelar|procrastinar
omitir|calar|silenciar|ocultar
assumir|ocupar|adotar|tomar
suspender|sobrestar|paralisar|interromper
suspenso|sobrestado|paralisado|interrompido
prorrogado|estendido|dilatado|ampliado
prorrogar|estender|dilatar|ampliar
prazo|período|lapso|interregno
prazos|períodos|lapsos|interregnos
requerimento|pedido|pleito|rogo
petição|solicitação|postulação|demanda
decisão|deliberação|resolução|determinação
despacho|pronunciamento|provimento|ato
autoridade|chefia|direção|administração
servidor|funcionário|agente|empregado
servidores|funcionários|agentes|empregados
processo|procedimento|feito|expediente
processos|procedimentos|feitos|expedientes
recurso|apelo|reclamo|inconformismo
juiz|magistrado|julgador|juízo
penalidade|sanção|punição|reprimenda
penalidades|sanções|punições|reprimendas
infração|falta|transgressão|irregularidade
dano|prejuízo|gravame|agravo
danos|prejuízos|gravames|agravos
ressarcimento|reembolso|reparo|pagamento
vencimento|salário|soldo|provento
remuneração|retribuição|contraprestação|gratificação
cargo|posto|ofício|emprego
função|atribuição|incumbência|tarefa
funções|atribuições|incumbências|tarefas
documento|instrumento|papel|título
documentos|instrumentos|papéis|títulos
registro|assento|apontamento|lançamento
intimação|notificação|cientificação|comunicação
ciência|conhecimento|notícia|informação
imediatamente|prontamente|incontinenti|celeremente
expressamente|explicitamente|textualmente|formalmente
exclusivamente|unicamente|somente|apenas
salvo|exceto
conforme|segundo|consoante|como
manifestamente|evidentemente|claramente|notoriamente
indevidamente|irregularmente|ilegalmente|injustificadamente
vantagem|benesse|regalia|prerrogativa
interesse|proveito|benefício|favor
conduta|atuação|postura|ação
crime|delito|ilícito|atentado
crimes|delitos|ilícitos|atentados
certidão|declaração|atestação|certificação
mandado|alvará|ofício|comando
audiência|sessão|reunião|assentada
prova|evidência|demonstração|comprovação
provas|evidências|demonstrações|comprovações
grave|sério|relevante|severo
graves|sérios|relevantes|severos
legal|lícito|legítimo|regular
ilegal|ilícito|ilegítimo|irregular
eleitor|votante|cidadão|alistando
eleitores|votantes|cidadãos|alistandos
candidato|postulante|concorrente|pretendente
candidatos|postulantes|concorrentes|pretendentes
partido|agremiação|legenda|sigla
propaganda|publicidade|divulgação|promoção
contrato|ajuste|pacto|convênio
contratos|ajustes|pactos|convênios
obrigação|dever|encargo|ônus
obrigações|deveres|encargos|ônus
credor|mutuante|cessionário|beneficiário
devedor|obrigado|mutuário|inadimplente
bem|patrimônio|ativo|haver
bens|patrimônios|ativos|haveres
pessoa|indivíduo|sujeito|cidadão
juntamente|conjuntamente|simultaneamente|concomitantemente
anualmente|periodicamente|regularmente|ordinariamente
semestralmente|trimestralmente|bimestralmente|mensalmente
reclusão|detenção|prisão simples|prisão
multa|reclusão|detenção|prisão simples
repreensão|advertência|censura|suspensão
# --- verbos modais (pegadinha clássica: poderá × deverá) ---
!poderá|deverá|haverá de|terá de
!poderão|deverão|haverão de|terão de
!pode|deve|há de|tem de
!podem|devem|hão de|têm de
podendo|devendo|cabendo|competindo
terá|possuirá|gozará|disporá
ficará|permanecerá|estará|restará
havendo|existindo|ocorrendo|verificando-se
exercer|desempenhar|praticar|exercitar
promover|propor|ajuizar|intentar
# --- substantivos gerais ---
direito|prerrogativa|faculdade|garantia
direitos|prerrogativas|faculdades|garantias
execução|efetivação|implementação|consecução
cumprimento|observância|atendimento|acatamento
valor|montante|importância|quantia
valores|montantes|importâncias|quantias
serviço|atividade|tarefa|função
serviços|atividades|tarefas|funções
exercício|desempenho|cumprimento|prática
órgão|entidade|ente|repartição
órgãos|entidades|entes|repartições
fato|evento|acontecimento|ocorrência
fatos|eventos|acontecimentos|ocorrências
condições|requisitos|pressupostos|exigências
objeto|finalidade|propósito|escopo
pessoas|indivíduos|cidadãos|sujeitos
hipótese|situação|circunstância|ocasião
hipóteses|situações|circunstâncias|ocasiões
natureza|índole|espécie|caráter
causa|motivo|razão|fundamento
responsabilidade|obrigação|encargo|dever
medida|providência|diligência|iniciativa
medidas|providências|diligências|iniciativas
prestação|fornecimento|oferta|entrega
despesas|gastos|custos|dispêndios
relação|vínculo|ligação|liame
realização|efetivação|consecução|concretização
local|lugar|sítio|localidade
acordo|ajuste|pacto|convênio
efeito|resultado|consequência|repercussão
efeitos|resultados|consequências|repercussões
aplicação|incidência|emprego|utilização
normas|regras|preceitos|disposições
segurança|proteção|tutela|salvaguarda
autorização|permissão|licença|consentimento
membros|integrantes|componentes|participantes
informações|dados|esclarecimentos|elementos
liberdade|autonomia|independência|livre-arbítrio
preço|custo|valor|montante
apuração|averiguação|investigação|verificação
proposta|oferta|sugestão|projeto
concessão|outorga|deferimento|atribuição
publicação|divulgação|veiculação|difusão
indenização|reparação|ressarcimento|compensação
prática|cometimento|realização|perpetração
apresentação|exibição|juntada|entrega
acesso|ingresso|entrada|admissão
participação|envolvimento|colaboração|contribuição
alienação|venda|cessão|transmissão
transferência|remoção|transmissão|deslocamento
proteção|amparo|resguardo|defesa
perda|privação|supressão|extinção
inscrição|registro|cadastro|matrícula
morte|óbito|falecimento|perecimento
tratamento|cuidado|atendimento|assistência
extinção|cessação|término|encerramento
motivo|razão|fundamento|justificativa
durante|no curso de|ao longo de|no decorrer de
perante|diante de|junto a|em face de
contra|em face de|em desfavor de|em detrimento de
após|depois de|em seguida a|posteriormente a
sempre|invariavelmente|necessariamente|constantemente
inclusive|até mesmo|igualmente|também
*contrário|oposto|diverso|adverso
*especial|específico|singular|peculiar
*superior|maior|excedente|acima
*inferior|menor|abaixo|aquém
*inicial|preliminar|originário|primeiro
*responsável|encarregado|incumbido|competente
*judicial|jurisdicional|forense|processual
*previsto|estabelecido|definido|fixado|disciplinado
# --- pegadinhas de prova: sentido jurídico DIFERENTE ---
!soberania|autonomia|supremacia|independência
!sentença|decisão|acórdão|despacho
!decisão|sentença|acórdão|despacho
!decisões|sentenças|acórdãos|despachos
!citação|intimação|notificação|convocação
!intimação|citação|notificação|cientificação
!representação|queixa|denúncia|requisição
!denúncia|queixa|representação|requisição
!queixa|denúncia|representação|requisição
!mandato|mandado|encargo|cargo
!mandado|mandato|ordem|determinação
!culpa|dolo|imprudência|negligência
!dolo|culpa|fraude|má-fé
!impedimento|suspeição|incompatibilidade|incapacidade
!suspeição|impedimento|incompatibilidade|parcialidade
!penhora|arresto|sequestro|depósito
!arresto|penhora|sequestro|bloqueio
!guarda|tutela|curatela|custódia
!tutela|curatela|guarda|proteção
!curatela|tutela|guarda|interdição
!herança|espólio|legado|sucessão
!legado|herança|doação|espólio
!embargos|recursos|agravos|apelações
!acusado|réu|indiciado|investigado
!réu|acusado|indiciado|investigado
!indiciado|acusado|investigado|suspeito
!condenado|sentenciado|apenado|réu
!vítima|ofendido|lesado|prejudicado
!ofendido|vítima|lesado|prejudicado
!advogado|defensor|procurador|patrono
!defensor|advogado|procurador|curador
!curador|tutor|guardião|representante
!relator|revisor|presidente|julgador
!honorários|custas|emolumentos|despesas
!custas|honorários|emolumentos|taxas
!nulidade|anulabilidade|ineficácia|invalidade
!domicílio|residência|moradia|endereço
!residência|domicílio|moradia|habitação
!escrivão|escrevente|oficial de justiça|chefe de secretaria
!perito|assistente técnico|avaliador|intérprete
!relatório|parecer|voto|laudo
!competência|atribuição|jurisdição|alçada
!jurisdição|competência|atribuição|circunscrição
!tribunal|juízo|corte|colegiado
!autos|processo|feito|procedimento
!credores|devedores|fiadores|avalistas
!juros|correção monetária|encargos|multa
!testemunhas|declarantes|informantes|peritos
!testamento|codicilo|legado|inventário
!terceiro|estranho|outrem|interessado
!cônjuge|companheiro|convivente|consorte
!mínimo|máximo|menor|maior
!máximo|mínimo|maior|menor
# --- adjetivos que as bancas trocam ---
!*provisório|definitivo|temporário|precário
!*exclusivo|privativo|concorrente|comum
!*doloso|culposo|preterdoloso|involuntário
!*gratuito|oneroso|remunerado|custeado
!*facultativo|obrigatório|discricionário|vinculado
!*absoluto|relativo|parcial|condicionado
!*ordinário|extraordinário|especial|sumário
!*originário|derivado|decorrente|superveniente
!*principal|acessório|secundário|subsidiário
!*direto|indireto|mediato|reflexo
!*imediato|mediato|diferido|posterior
!*voluntário|compulsório|espontâneo|involuntário
!*solidário|subsidiário|conjunto|proporcional
!*móvel|imóvel|fungível|consumível
!*pessoal|real|patrimonial|individual
!*penal|civil|administrativo|processual
!*federal|estadual|municipal|distrital
!*regular|irregular|eventual|ordinário
!*anterior|posterior|prévio|ulterior
!*integral|parcial|total|proporcional
# --- números por extenso (objetivos) ---
!dois|três|quatro|cinco
!duas|três|quatro|cinco
!seis|oito|dez|doze
!quinze|vinte|trinta|sessenta
!noventa|sessenta|cento e vinte|cento e oitenta
!terço|quarto|quinto|sexto
!metade|dobro|triplo|terço
posse|detenção|propriedade|domínio
alguém|outrem|ninguém
vantagem|benefício|proveito|benesse
`;

// Homógrafos que quase sempre são OUTRA classe no texto legal ("à defesa dos interesses"):
// podem aparecer como distrator, mas nunca viram alvo nem puxam o grupo.
const NOT_TARGET = new Set(['defesa', 'defesas']);

function adjForms(w: string): string[] {
  // -o -> -a, -os, -as ; -e -> -es (comum de dois gêneros)
  if (w.endsWith('o')) return [w, w.slice(0, -1) + 'a', w + 's', w.slice(0, -1) + 'as'];
  if (w.endsWith('e')) return [w, w, w + 's', w + 's'];
  return [w, w, w, w];
}

const groups: string[][] = [];
/** Grupos marcados com '!': as palavras NÃO são sinônimas — têm sentido jurídico diferente (pegadinha de banca). */
const trapGroups = new Set<string[]>();
for (let line of RAW.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))) {
  const trap = line.startsWith('!');
  if (trap) line = line.slice(1);
  if (line.startsWith('*')) {
    const ws = line.slice(1).split('|');
    const forms = ws.map(adjForms);
    for (let k = 0; k < 4; k++) { const g = [...new Set(forms.map((f) => f[k]))]; groups.push(g); if (trap) trapGroups.add(g); }
  } else { const g = line.split('|'); groups.push(g); if (trap) trapGroups.add(g); }
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const index = new Map<string, string[]>();
for (const g of groups) for (const w of g) if (!index.has(fold(w)) && !NOT_TARGET.has(fold(w))) index.set(fold(w), g);

/** Sinônimos (mesma flexão) da palavra, sem ela mesma. */
export function synonymsOf(word: string): string[] {
  const g = index.get(fold(word));
  if (!g) return [];
  return g.filter((x) => fold(x) !== fold(word));
}
export const hasSynonyms = (word: string) => index.has(fold(word));
/** As alternativas são "pegadinhas" (sentido jurídico diferente), não sinônimos perfeitos. */
export const isTrapWord = (word: string) => { const g = index.get(fold(word)); return !!g && trapGroups.has(g); };
export const SYNONYM_WORDS = [...index.keys()];
