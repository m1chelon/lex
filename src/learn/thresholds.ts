import { fold } from './text';

const cardinals = new Map([
  ['um', 1], ['uma', 1], ['dois', 2], ['duas', 2], ['três', 3], ['quatro', 4], ['cinco', 5],
  ['seis', 6], ['sete', 7], ['oito', 8], ['nove', 9], ['dez', 10], ['onze', 11], ['doze', 12],
  ['treze', 13], ['quatorze', 14], ['catorze', 14], ['quinze', 15], ['dezesseis', 16],
  ['dezessete', 17], ['dezoito', 18], ['dezenove', 19], ['vinte', 20], ['trinta', 30],
  ['quarenta', 40], ['cinquenta', 50], ['sessenta', 60], ['setenta', 70], ['oitenta', 80],
  ['noventa', 90], ['cem', 100], ['cento', 100], ['duzentos', 200], ['trezentos', 300],
  ['quatrocentos', 400], ['quinhentos', 500], ['seiscentos', 600], ['setecentos', 700],
  ['oitocentos', 800], ['novecentos', 900],
] as const);
const foldedCardinals = new Map([...cardinals].map(([word, value]) => [fold(word), value]));
const writtenPart = [...cardinals.keys()].join('|').replace('cinquenta', 'cinq[uü]enta');
const written = `(?:${writtenPart})(?:\\s+e\\s+(?:${writtenPart})){0,2}`;
const numberStart = '(?<![\\p{L}\\p{N}.,/%-])';
const complete = '(?![\\p{L}\\p{N}])';
const digits = '\\d{1,4}(?:,\\d{1,2})?';
const cardinal = `(?<number>${digits}|${written})(?<gloss>\\s*\\(${written}\\))?`;
const percent = new RegExp(`${numberStart}(?:(?<digits>${digits})(?<symbol>\\s*%)(?<gloss>\\s*\\([^()\\n]+\\s+por\\s+cento\\))?|(?<words>${written})\\s+por\\s+cento)${complete}`, 'giu');
const duration = new RegExp(`${numberStart}${cardinal}\\s+(?<unit>dias?|horas?|mês|meses|anos?|minutos?|sessões|sessão)(?<qualifier>\\s+(?:úteis|útil|corridos?|consecutivos?|ininterruptos?))?${complete}`, 'giu');
const rangeStart = new RegExp(`${numberStart}${cardinal}\\s+(?:a|até)\\s+$`, 'iu');
const count = new RegExp(`${numberStart}${cardinal}(?<relation>\\s+(?:ou\\s+mais|ou\\s+menos))?(?=\\s+(?:pessoas?|integrantes?|participantes?|agentes?|servidor(?:es|as?)?(?:\\(as?\\))?|membros?|testemunhas?|candidatos?|eleitores?|deputados?|senadores?|vereadores?|magistrados?|votos?|parcelas?|infrações?|vagas?|sessões|turmas?|assinaturas?)${complete})`, 'giu');
const wage = new RegExp(`${numberStart}${cardinal}(?<unit>\\s+(?:salários?[ -]mínimos?|vezes (?:o|do) salário[ -]mínimo))${complete}`, 'giu');
const bareLimit = new RegExp(`\\b(?:no\\s+mínimo|no\\s+máximo|(?:limite|mínimo|máximo|total)\\s+de)\\s+${cardinal}(?=\\s*(?:[,.](?!\\d)|[;)]|$))`, 'giu');
const money = /(?<![\p{L}\p{N}])(?<prefix>R\$\s*)(?<number>\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:,\d{2})?)(?!\d|[.,]\d)(?<gloss>\s*\([^()\n]*(?:reais?|centavos?)\))?/giu;
const fractionForms = [
  [1, 10, 'um décimo'], [1, 8, 'um oitavo'], [1, 6, 'um sexto'], [1, 5, 'um quinto'],
  [1, 4, 'um quarto'], [1, 3, 'um terço'], [2, 5, 'dois quintos'], [1, 2, 'um meio'],
  [3, 5, 'três quintos'], [2, 3, 'dois terços'], [3, 4, 'três quartos'], [4, 5, 'quatro quintos'],
] as const;
const fractionWords = `(?:${fractionForms.map((entry) => entry[2]).join('|')}|(?:a\\s+)?metade)`;
const fraction = new RegExp(`${numberStart}(?:(?<numerator>\\d{1,2})\\s*\/\\s*(?<denominator>\\d{1,2})(?<gloss>\\s*\\(${fractionWords}\\))?|(?<words>${fractionWords}))${complete}(?!\\s*[/ºª\\d])`, 'giu');

type AmountKind = 'percentual' | 'fracao' | 'quantidade' | 'prazo' | 'valor';
export interface LegalAmount {
  kind: AmountKind;
  text: string;
  start: number;
  value: number;
  group: string;
  min?: number;
  max?: number;
  exclusiveMax?: boolean;
  format: (value: number) => string | undefined;
}

function parseNumber(text: string) {
  if (/^\d/.test(text)) return Number(text.replace(/\./g, '').replace(',', '.'));
  const parts = fold(text).split(/\s+e\s+/).map((word) => foldedCardinals.get(word));
  return parts.every((part) => part !== undefined) ? parts.reduce<number>((sum, part) => sum + part!, 0) : NaN;
}

function spellNumber(value: number, feminine = false): string | undefined {
  if (value === 0) return 'zero';
  if (value === 1) return feminine ? 'uma' : 'um';
  if (value === 2) return feminine ? 'duas' : 'dois';
  if (value < 1 || value >= 1_000_000_000 || !Number.isInteger(value)) return undefined;
  if (value >= 1_000) {
    const base = value >= 1_000_000 ? 1_000_000 : 1_000;
    const head = Math.floor(value / base);
    const rest = value % base;
    const word = base === 1_000_000 ? (head === 1 ? 'um milhão' : spellNumber(head) + ' milhões')
      : head === 1 ? 'mil' : spellNumber(head, feminine) + ' mil';
    return rest ? word + (rest < 100 || rest % 100 === 0 ? ' e ' : ' ') + spellNumber(rest, feminine) : word;
  }
  const hundreds = Math.floor(value / 100) * 100;
  const remainder = value - hundreds;
  const tens = remainder > 20 ? Math.floor(remainder / 10) * 10 : 0;
  const parts = [hundreds, tens, remainder - tens].filter(Boolean);
  return parts.map((part) => {
    if (part === 100 && remainder) return 'cento';
    const word = [...cardinals].find(([, n]) => n === part)?.[0];
    if (feminine && part <= 2) return part === 1 ? 'uma' : 'duas';
    return feminine && part >= 200 ? word?.replace(/os$/, 'as') : word;
  }).join(' e ');
}

const glossSpacing = (gloss: string) => gloss.slice(0, gloss.indexOf('('));
const numberString = (value: number) => String(value).replace('.', ',');
function inSourceFormat(value: number, number: string, gloss?: string, feminine = false) {
  if (/^\d/.test(number) && !gloss) return numberString(value);
  const words = spellNumber(value, feminine);
  if (!words) return undefined;
  return gloss ? `${numberString(value)}${glossSpacing(gloss)}(${words})` : words;
}

const durationUnits = [['dia', 'dias'], ['hora', 'horas'], ['mês', 'meses'], ['ano', 'anos'], ['minuto', 'minutos'], ['sessão', 'sessões']] as const;
const moneyFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const moneyCentsFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function findLegalAmounts(text: string): LegalAmount[] {
  const out: LegalAmount[] = [];
  for (const match of text.matchAll(percent)) {
    const { digits, words, symbol, gloss } = match.groups!;
    const value = parseNumber(digits ?? words);
    out.push({ kind: 'percentual', text: match[0], start: match.index, value, group: 'percentual', max: value <= 100 ? 100 : value * 2,
      format: (v) => {
        if (digits && !gloss) return numberString(v) + symbol;
        const [whole, decimal] = numberString(v).split(',');
        const spelled = decimal
          ? spellNumber(Number(whole)) + ' vírgula ' + [...decimal].map((digit) => spellNumber(Number(digit))).join(' ')
          : spellNumber(v);
        if (!spelled) return undefined;
        return digits ? `${numberString(v)}${symbol}${glossSpacing(gloss)}(${spelled} por cento)` : `${spelled} por cento`;
      } });
  }
  for (const match of text.matchAll(fraction)) {
    const { numerator, denominator, words, gloss } = match.groups!;
    // Em "pela metade" ou "à metade", a contração fora da lacuna veta a troca por "um terço".
    const prefix = text.slice(Math.max(0, match.index - 45), match.index);
    if (/\b(?:pela|na|da)\s+$|à\s+$/iu.test(prefix)) continue;
    if (numerator && /\b(?:n[º°.]?|art(?:igo)?\.?|resolução|portaria|lei|decreto)\s*$/iu.test(prefix)) continue;
    const known = fractionForms.find((entry) => fold(entry[2]) === fold(words ?? ''));
    const value = numerator ? Number(numerator) / Number(denominator) : known ? known[0] / known[1] : 1 / 2;
    if (!(value > 0 && value < 1)) continue;
    out.push({ kind: 'fracao', text: match[0], start: match.index, value, group: 'fracao',
      format: (v) => {
        const form = fractionForms.find(([n, d]) => n / d === v);
        if (!form) return undefined;
        const [n, d, writtenForm] = form;
        if (!numerator) return v === 1 / 2 ? 'metade' : writtenForm;
        return `${n}/${d}${gloss ? `${glossSpacing(gloss)}(${writtenForm})` : ''}`;
      } });
  }
  for (const match of text.matchAll(duration)) {
    const { number, gloss, unit, qualifier = '' } = match.groups!;
    const base = durationUnits.find((pair) => pair.some((choice) => fold(choice) === fold(unit)))!;
    const value = parseNumber(number);
    const lookback = Math.max(0, match.index - 100);
    const range = rangeStart.exec(text.slice(lookback, match.index));
    const low = range ? parseNumber(range.groups!.number) : NaN;
    const hasLowerBound = Number.isFinite(low) && low < value;
    // "Computar-se-ão 2 (dois) dias úteis" é distinto de "2 (dois) dias"; mantenha o qualificador.
    const singularQualifier = qualifier.replace(/úteis$/iu, 'útil').replace(/s$/iu, '');
    const pluralQualifier = /útil$/iu.test(qualifier) ? qualifier.replace(/útil$/iu, 'úteis')
      : qualifier && !qualifier.endsWith('s') ? qualifier + 's' : qualifier;
    const group = `prazo:${base[0]}${fold(pluralQualifier)}`;
    const feminine = base[0] === 'hora' || base[0] === 'sessão';
    if (range && hasLowerBound) {
      const { number: lower, gloss: lowerGloss } = range.groups!;
      out.push({ kind: 'prazo', text: lower + (lowerGloss ?? ''), start: lookback + range.index, value: low, group,
        max: value, exclusiveMax: true, format: (v) => inSourceFormat(v, lower, lowerGloss, feminine) });
    }
    out.push({ kind: 'prazo', text: match[0], start: match.index, value, group, min: hasLowerBound ? low : undefined,
      format: (v) => {
        const formatted = inSourceFormat(v, number, gloss, feminine);
        return formatted && `${formatted} ${v === 1 ? base[0] + singularQualifier : base[1] + pluralQualifier}`;
      } });
  }
  for (const match of text.matchAll(count)) {
    const { number, gloss, relation = '' } = match.groups!;
    const value = parseNumber(number);
    const following = text.slice(match.index + match[0].length);
    if (value < 2 && !relation && !gloss) continue;
    if (value === 1 && !relation) continue;
    // Evita, por exemplo, "1 testemunhas" quando o restante do trecho está no plural.
    const min = !relation && value > 1 ? 1 : undefined;
    const feminine = /^\s+(?:pessoa|testemunha|parcela|infraç|vaga|turma|assinatura|sess)/iu.test(following);
    out.push({ kind: 'quantidade', text: match[0], start: match.index, value, group: 'quantidade', min,
      format: (v) => {
        const formatted = inSourceFormat(v, number, gloss, feminine);
        return formatted && formatted + relation;
      } });
  }
  for (const match of text.matchAll(bareLimit)) {
    const { number, gloss } = match.groups!;
    const threshold = number + (gloss ?? '');
    out.push({ kind: 'quantidade', text: threshold, start: match.index + match[0].length - threshold.length,
      value: parseNumber(number), group: 'quantidade', format: (v) => inSourceFormat(v, number, gloss) });
  }
  for (const match of text.matchAll(wage)) {
    const { number, gloss, unit } = match.groups!;
    const times = /^\s+vezes\b/u.test(unit);
    out.push({ kind: 'valor', text: match[0], start: match.index, value: parseNumber(number), group: 'salarios-minimos',
      min: times ? 1 : undefined, format: (v) => {
        const numeral = inSourceFormat(v, number, gloss);
        if (!numeral || !Number.isInteger(v)) return undefined;
        const unitText = times ? unit : unit.replace(/salários?/iu, v === 1 ? 'salário' : 'salários')
          .replace(/mínimos?/iu, v === 1 ? 'mínimo' : 'mínimos');
        return numeral + unitText;
      } });
  }
  for (const match of text.matchAll(money)) {
    const { prefix, number, gloss } = match.groups!;
    const formatter = number.includes(',') ? moneyCentsFormat : moneyFormat;
    out.push({ kind: 'valor', text: match[0], start: match.index, value: parseNumber(number), group: 'reais',
      format: (v) => {
        const formatted = prefix + formatter.format(v);
        if (!gloss) return formatted;
        const whole = Math.floor(v);
        const cents = Math.round((v - whole) * 100);
        const spelling = spellNumber(whole);
        if (!spelling) return undefined;
        const reais = whole === 1 ? 'um real' : spelling + (whole % 1_000_000 === 0 && whole > 0 ? ' de reais' : ' reais');
        const centavos = cents === 1 ? 'um centavo' : spellNumber(cents) + ' centavos';
        const words = whole && cents ? reais + ' e ' + centavos : whole ? reais : centavos;
        return `${formatted}${glossSpacing(gloss)}(${words})`;
      } });
  }
  // Elimina subtrechos sobrepostos, como "três sessões" já interpretado como prazo.
  const ordered = out.filter(({ value }) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a.start - b.start || b.text.length - a.text.length);
  const result: LegalAmount[] = [];
  for (const amount of ordered) {
    const previous = result.at(-1);
    if (previous && previous.start + previous.text.length > amount.start) continue;
    if (previous?.group === amount.group && /^\s+(?:a|até)\s+$/iu.test(text.slice(previous.start + previous.text.length, amount.start))) {
      previous.max = amount.value;
      previous.exclusiveMax = true;
      amount.min = previous.value;
    }
    result.push(amount);
  }
  return result;
}

export function amountAlternatives(amount: LegalAmount, fromLaw: readonly number[] = []): string[] {
  const { value, kind, min = 0, max = Infinity } = amount;
  const step = kind === 'percentual' ? value >= 20 ? 5 : Number.isInteger(value) ? 1 : value >= 1 ? 0.5 : 0.1
    : kind === 'valor' ? Math.max(0.01, 10 ** Math.floor(Math.log10(value) - 1)) : value > 10 ? (value <= 20 ? 2 : 5) : 1;
  const nearby = Array.from({ length: 8 }, (_, i) => {
    const delta = (Math.floor(i / 2) + 1) * step * (i % 2 ? 1 : -1);
    return Number((value + delta).toFixed(2));
  });
  const byDistance = (a: number, b: number) => Math.abs(a - value) - Math.abs(b - value) || a - b;
  const distance = kind === 'percentual' ? Math.max(step * 2, value * .35) : Math.max(step * 2, value / 2);
  const observed = [...fromLaw].filter((v) => v !== value && v > min && v <= max && Math.abs(v - value) <= distance)
    .sort(byDistance);
  const candidates = kind === 'fracao' ? fractionForms.map(([n, d]) => n / d).sort(byDistance)
    : kind === 'quantidade' ? nearby
      : [...observed.slice(0, kind === 'prazo' ? 2 : 1), ...nearby];
  return [...new Set(candidates)].flatMap((candidate) => {
    if (candidate === value || candidate <= min || candidate > max || (amount.exclusiveMax && candidate === max)) return [];
    const formatted = amount.format(candidate);
    return formatted ? [formatted] : [];
  });
}
