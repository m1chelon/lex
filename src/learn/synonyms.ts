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
`;

function adjForms(w: string): string[] {
  // -o -> -a, -os, -as ; -e -> -es (comum de dois gêneros)
  if (w.endsWith('o')) return [w, w.slice(0, -1) + 'a', w + 's', w.slice(0, -1) + 'as'];
  if (w.endsWith('e')) return [w, w, w + 's', w + 's'];
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
