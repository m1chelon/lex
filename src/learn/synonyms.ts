// Alternativas de institutos e categorias jurídicas usadas nas questões de lei seca.
import { fold } from './text';

const RAW = `
poderá|deverá|haverá de|terá de
poderão|deverão|haverão de|terão de
pode|deve|há de|tem de
podem|devem|hão de|têm de
soberania|autonomia|supremacia|independência
sentença|decisão|acórdão|despacho
decisão|sentença|acórdão|despacho
decisões|sentenças|acórdãos|despachos
citação|intimação|notificação|convocação
intimação|citação|notificação|cientificação
representação|queixa|denúncia|requisição
denúncia|queixa|representação|requisição
queixa|denúncia|representação|requisição
mandato|mandado|encargo|cargo
mandado|mandato|ordem|determinação
culpa|dolo|imprudência|negligência
dolo|culpa|fraude|má-fé
impedimento|suspeição|incompatibilidade|incapacidade
suspeição|impedimento|incompatibilidade|parcialidade
penhora|arresto|sequestro|depósito
arresto|penhora|sequestro|bloqueio
guarda|tutela|curatela|custódia
tutela|curatela|guarda|proteção
curatela|tutela|guarda|interdição
herança|espólio|legado|sucessão
legado|herança|doação|espólio
embargos|recursos|agravos|apelações
acusado|réu|indiciado|investigado
réu|acusado|indiciado|investigado
indiciado|acusado|investigado|suspeito
condenado|sentenciado|apenado|réu
vítima|ofendido|lesado|prejudicado
ofendido|vítima|lesado|prejudicado
advogado|defensor|procurador|patrono
defensor|advogado|procurador|curador
curador|tutor|guardião|representante
relator|revisor|presidente|julgador
honorários|custas|emolumentos|despesas
custas|honorários|emolumentos|taxas
nulidade|anulabilidade|ineficácia|invalidade
domicílio|residência|moradia|endereço
residência|domicílio|moradia|habitação
escrivão|escrevente|oficial de justiça|chefe de secretaria
perito|assistente técnico|avaliador|intérprete
relatório|parecer|voto|laudo
competência|atribuição|jurisdição|alçada
jurisdição|competência|atribuição|circunscrição
tribunal|juízo|corte|colegiado
autos|processo|feito|procedimento
credores|devedores|fiadores|avalistas
juros|correção monetária|encargos|multa
testemunhas|declarantes|informantes|peritos
testamento|codicilo|legado|inventário
terceiro|estranho|outrem|interessado
cônjuge|companheiro|convivente|consorte
mínimo|máximo|menor|maior
máximo|mínimo|maior|menor
*provisório|definitivo|temporário|precário
*exclusivo|privativo|concorrente|comum
*doloso|culposo|preterdoloso|involuntário
*gratuito|oneroso|remunerado|custeado
*facultativo|obrigatório|discricionário|vinculado
*absoluto|relativo|parcial|condicionado
*ordinário|extraordinário|especial|sumário
*originário|derivado|decorrente|superveniente
*principal|acessório|secundário|subsidiário
*direto|indireto|mediato|reflexo
*imediato|mediato|diferido|posterior
*voluntário|compulsório|espontâneo|involuntário
*solidário|subsidiário|conjunto|proporcional
*móvel|imóvel|fungível|consumível
*pessoal|real|patrimonial|individual
*penal|civil|administrativo|processual
*federal|estadual|municipal|distrital
*regular|irregular|eventual|ordinário
*anterior|posterior|prévio|ulterior
*integral|parcial|total|proporcional
dois|três|quatro|cinco
duas|três|quatro|cinco
seis|oito|dez|doze
quinze|vinte|trinta|sessenta
noventa|sessenta|cento e vinte|cento e oitenta
terço|quarto|quinto|sexto
metade|dobro|triplo|terço
*falsificado|adulterado|alterado|forjado
*falso|falsificado|adulterado|inidôneo
*alterado|adulterado|modificado|falsificado
*fabricado|produzido|confeccionado|reproduzido
*destinado|reservado|vinculado|afetado
*público|oficial|estatal|governamental
*particular|privado|pessoal|individual
*verdadeiro|autêntico|legítimo|original
*autêntico|verdadeiro|legítimo|original
*legítimo|legal|lícito|regular
*ilícito|ilegal|ilegítimo|irregular
*indevido|ilegal|irregular|ilegítimo
*suprimido|ocultado|destruído|inutilizado
*destruído|inutilizado|danificado|suprimido
*ocultado|suprimido|subtraído|desviado
*subtraído|desviado|apropriado|ocultado
*desviado|subtraído|apropriado|aplicado
*apreendido|arrecadado|confiscado|sequestrado
*emitido|expedido|lavrado|editado
*expedido|emitido|lavrado|publicado
*lavrado|expedido|emitido|registrado
*registrado|averbado|inscrito|anotado
*inscrito|registrado|cadastrado|matriculado
*declarado|atestado|certificado|afirmado
*certificado|atestado|declarado|autenticado
*assinado|subscrito|firmado|rubricado
*fixado|estabelecido|arbitrado|determinado
*arbitrado|fixado|estipulado|estimado
*previsto|estabelecido|disciplinado|regulado
*cominado|aplicado|imposto|previsto
*aplicado|imposto|cominado|executado
*imposto|aplicado|exigido|cominado
*praticado|cometido|executado|realizado
*cometido|praticado|consumado|tentado
*consumado|tentado|exaurido|praticado
*tentado|consumado|frustrado|interrompido
*nomeado|designado|indicado|investido
*designado|nomeado|indicado|convocado
*investido|empossado|nomeado|designado
*demitido|exonerado|dispensado|destituído
*exonerado|demitido|dispensado|destituído
*destituído|exonerado|afastado|demitido
*afastado|suspenso|licenciado|removido
*suspenso|afastado|interrompido|sobrestado
*removido|redistribuído|transferido|relotado
*aposentado|exonerado|disponível|licenciado
*efetivo|estável|vitalício|comissionado
*estável|efetivo|vitalício|permanente
*vitalício|estável|efetivo|inamovível
*remunerado|retribuído|gratificado|indenizado
*nulo|anulável|ineficaz|inexistente
*anulável|nulo|ineficaz|rescindível
*ineficaz|nulo|anulável|inválido
*válido|eficaz|vigente|perfeito
*vigente|válido|eficaz|aplicável
*revogado|derrogado|ab-rogado|suspenso
*intimado|citado|notificado|cientificado
*citado|intimado|notificado|convocado
*notificado|intimado|citado|comunicado
*preso|detido|recolhido|custodiado
*condenado|sentenciado|apenado|pronunciado
*pronunciado|impronunciado|absolvido|condenado
*absolvido|impronunciado|condenado|despronunciado
*processado|julgado|condenado|denunciado
*julgado|decidido|apreciado|sentenciado
*proferido|prolatado|publicado|lavrado
*interposto|oposto|apresentado|protocolado
*oposto|interposto|apresentado|ajuizado
*ajuizado|proposto|distribuído|interposto
*proposto|ajuizado|oferecido|apresentado
*oferecido|apresentado|proposto|deduzido
*requerido|pedido|postulado|solicitado
*deferido|indeferido|homologado|concedido
*indeferido|deferido|rejeitado|denegado
*concedido|deferido|outorgado|conferido
*conferido|atribuído|outorgado|concedido
*atribuído|conferido|outorgado|delegado
*delegado|avocado|atribuído|transferido
*avocado|delegado|reservado|transferido
*vedado|proibido|defeso|impedido
*proibido|vedado|defeso|restrito
*permitido|facultado|autorizado|admitido
*facultado|permitido|assegurado|autorizado
*assegurado|garantido|reconhecido|facultado
*garantido|assegurado|reconhecido|protegido
*reconhecido|declarado|assegurado|admitido
*admitido|aceito|permitido|recebido
*exigido|requerido|imposto|demandado
*obrigado|compelido|sujeito|vinculado
*sujeito|submetido|subordinado|vinculado
*subordinado|vinculado|submetido|sujeito
*vinculado|subordinado|adstrito|afetado
*escrito|verbal|expresso|tácito
*expresso|tácito|implícito|presumido
*tácito|expresso|implícito|presumido
*presumido|tácito|implícito|ficto
*manifesto|evidente|notório|inequívoco
*grave|gravíssimo|leve|relevante
*leve|grave|culposo|simples
*simples|qualificado|privilegiado|agravado
*qualificado|privilegiado|agravado|majorado
*privilegiado|qualificado|atenuado|minorado
*agravado|qualificado|majorado|aumentado
*aumentado|majorado|agravado|elevado
*diminuído|reduzido|atenuado|minorado
*reduzido|diminuído|atenuado|minorado
*superior|inferior|igual|equivalente
*inferior|superior|igual|equivalente
*igual|equivalente|proporcional|idêntico
*prévio|posterior|ulterior|concomitante
*eletrônico|digital|físico|virtual
*útil|corrido|contínuo|consecutivo
*corrido|útil|contínuo|consecutivo
*civil|penal|criminal|administrativo
*criminal|penal|civil|disciplinar
*disciplinar|administrativo|funcional|criminal
*funcional|disciplinar|administrativo|hierárquico
*hierárquico|funcional|disciplinar|administrativo
*fiscal|tributário|financeiro|orçamentário
*tributário|fiscal|financeiro|orçamentário
*judicial|extrajudicial|administrativo|arbitral
*extrajudicial|judicial|administrativo|cartorário
*nacional|federal|estadual|internacional
*estrangeiro|nacional|naturalizado|apátrida
*menor|incapaz|adolescente|inimputável
*inimputável|semi-imputável|incapaz|imputável
*incapaz|inimputável|relativamente incapaz|interdito
*doente|enfermo|incapacitado|deficiente
*idoso|deficiente|incapaz|vulnerável
*vulnerável|incapaz|hipossuficiente|idoso
*urgente|imediato|prioritário|preferencial
*preferencial|prioritário|exclusivo|subsidiário
*coletivo|difuso|individual homogêneo|comum
*difuso|coletivo|individual|transindividual
*secreto|sigiloso|reservado|confidencial
*sigiloso|secreto|reservado|restrito
*gratuito|oneroso|remunerado|subsidiado
funcionário|servidor|agente|empregado
funcionários|servidores|agentes|empregados
servidor|funcionário|agente|empregado
servidores|funcionários|agentes|empregados
agente|servidor|funcionário|preposto
cargo|função|emprego|posto
função|cargo|emprego|encargo
emprego|cargo|função|ofício
cargos|funções|empregos|postos
funções|cargos|empregos|encargos
selo|sinal|carimbo|timbre
sinal|selo|marca|símbolo
marca|sinal|selo|insígnia
carimbo|selo|timbre|chancela
documento|papel|título|instrumento
papel|documento|título|formulário
título|documento|papel|certificado
certidão|atestado|certificado|declaração
atestado|certidão|certificado|declaração
certificado|atestado|certidão|diploma
moeda|cédula|papel-moeda|título
cédula|moeda|nota|bilhete
vantagem|benefício|proveito|lucro
proveito|vantagem|benefício|lucro
dinheiro|valor|bem|numerário
valor|dinheiro|bem|quantia
bem|valor|coisa|patrimônio
coisa|bem|objeto|valor
patrimônio|acervo|bem|erário
erário|tesouro|patrimônio|fazenda
fazenda|erário|tesouro|fisco
violência|grave ameaça|coação|constrangimento
ameaça|coação|violência|intimidação
coação|ameaça|violência|constrangimento
fraude|ardil|artifício|engano
erro|engano|equívoco|ignorância
omissão|ação|abstenção|negligência
ação|omissão|conduta|atuação
conduta|ação|comportamento|prática
crime|delito|contravenção|infração
crimes|delitos|contravenções|infrações
contravenção|crime|delito|infração
infração|crime|delito|contravenção
pena|sanção|medida|penalidade
penas|sanções|medidas|penalidades
multa|pena|sanção|indenização
reclusão|detenção|prisão simples|prisão
detenção|reclusão|prisão simples|prisão
prisão|detenção|reclusão|custódia
inquérito|processo|procedimento|sindicância
sindicância|processo administrativo|inquérito|apuração
processo|procedimento|inquérito|feito
procedimento|processo|rito|expediente
prazo|termo|período|lapso
termo|prazo|marco|limite
audiência|sessão|reunião|assembleia
sessão|audiência|reunião|assembleia
recurso|apelação|agravo|embargos
apelação|agravo|recurso|embargos
agravo|apelação|recurso|reclamação
ação|demanda|pretensão|pedido
pedido|requerimento|petição|pretensão
requerimento|pedido|petição|solicitação
petição|requerimento|pedido|representação
prova|indício|evidência|elemento
provas|indícios|evidências|elementos
indícios|provas|elementos|vestígios
juiz|magistrado|julgador|desembargador
magistrado|juiz|julgador|membro
promotor|procurador|defensor|curador
Ministério Público|Defensoria Pública|autoridade policial|Poder Judiciário
autoridade|agente|servidor|órgão
órgão|entidade|repartição|unidade
entidade|órgão|ente|instituição
União|Estados|Municípios|Distrito Federal
lei|decreto|regulamento|norma
lei complementar|lei ordinária|decreto|resolução
decreto|lei|regulamento|portaria
regimento|regulamento|estatuto|resolução
Constituição|lei|estatuto|código
direito|garantia|prerrogativa|faculdade
direitos|garantias|prerrogativas|deveres
dever|obrigação|ônus|encargo
deveres|obrigações|ônus|encargos
obrigação|dever|ônus|responsabilidade
responsabilidade|obrigação|dever|culpa
remuneração|vencimento|subsídio|salário
vencimento|remuneração|subsídio|provento
subsídio|remuneração|vencimento|provento
proventos|vencimentos|subsídios|pensões
vencimentos|proventos|subsídios|salários
licença|afastamento|férias|dispensa
férias|licença|afastamento|recesso
estágio probatório|estabilidade|efetivo exercício|posse
posse|exercício|nomeação|investidura
exercício|posse|nomeação|investidura
nomeação|posse|investidura|designação
demissão|exoneração|destituição|cassação
exoneração|demissão|dispensa|destituição
cassação|demissão|destituição|suspensão
advertência|suspensão|repreensão|demissão
suspensão|advertência|demissão|multa
repreensão|advertência|suspensão|censura
*postal|fiscal|bancário|comercial
cartão|título|documento|boleto
professor|médico|magistrado|pesquisador
informações|dados|documentos|registros
dados|informações|registros|documentos
registros|assentamentos|cadastros|arquivos
`;

function adjForms(w: string): string[] {
  // -o -> -a, -os, -as ; -e -> -es (comum de dois gêneros)
  if (w.endsWith('o')) return [w, w.slice(0, -1) + 'a', w + 's', w.slice(0, -1) + 'as'];
  if (w.endsWith('e')) return [w, w, w + 's', w + 's'];
  if (w.endsWith('vel')) return [w, w, w.slice(0, -2) + 'eis', w.slice(0, -2) + 'eis'];
  if (w.endsWith('al')) return [w, w, w.slice(0, -2) + 'ais', w.slice(0, -2) + 'ais'];
  if (w.endsWith('ar')) return [w, w, w + 'es', w + 'es'];
  return [w, w, w, w];
}

const contrasts = new Map<string, string[]>();
for (const line of RAW.trim().split('\n')) {
  const adjective = line.startsWith('*');
  const words = (adjective ? line.slice(1) : line).split('|');
  const forms = words.map(adjForms);
  const groups = adjective ? [0, 1, 2, 3].map((index) => [...new Set(forms.map((form) => form[index]))]) : [words];
  for (const group of groups) for (const word of group) {
    const key = fold(word);
    if (!contrasts.has(key)) contrasts.set(key, group.filter((other) => fold(other) !== key));
  }
}

export const legalContrastsOf = (word: string): readonly string[] => contrasts.get(fold(word)) ?? [];
