const STATES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
} as const;

export type UF = keyof typeof STATES;
export type WeatherLocation = { on: boolean; lat?: number; lon?: number; city?: string; uf?: UF };

const normalize = (name: string) => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const lookup = new Map(Object.entries(STATES).flatMap(([code, name]) => [
  [normalize(name), code as UF], [code.toLowerCase(), code as UF],
]));

export function ufOf(value?: string): UF | undefined {
  return typeof value === 'string' ? lookup.get(normalize(value).replace(/^br-/, '')) : undefined;
}

export function locationLabel({ city, uf, lat }: WeatherLocation) {
  return city || (uf ? STATES[uf] : lat !== undefined ? 'Localização do dispositivo' : '');
}

const IBGE_CODES: Record<string, UF> = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
  21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
  31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS',
  50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
};

type Ring = [number, number][];
type Boundary = {
  properties?: { codarea?: string | number };
  geometry?: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };
};

function insideRing(ring: Ring, lat: number, lon: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i];
    const [lastX, lastY] = ring[j];
    if ((y > lat) !== (lastY > lat) && lon < x + (lastX - x) * (lat - y) / (lastY - y)) inside = !inside;
  }
  return inside;
}

export function stateAt(features: Boundary[], lat: number, lon: number) {
  for (const { geometry, properties } of features) {
    const uf = IBGE_CODES[String(properties?.codarea)];
    if (!geometry || !uf) continue;
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    if (polygons.some(([outline, ...holes]) => outline && insideRing(outline, lat, lon)
      && !holes.some((hole) => insideRing(hole, lat, lon)))) return uf;
  }
}

let boundaries: Promise<Boundary[]> | undefined;

/** Consulta a malha do IBGE; o cruzamento com a posição acontece no próprio dispositivo. */
export async function stateFromGps(lat: number, lon: number) {
  if (lat < -34 || lat > 6 || lon < -74 || lon > -32) return undefined;
  boundaries ??= fetch('https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=minima&formato=application%2Fvnd.geo%2Bjson', {
    signal: AbortSignal.timeout(8000),
  }).then(async (response) => {
    if (!response.ok) throw new Error('Malha do IBGE indisponível');
    const data = await response.json();
    if (!Array.isArray(data.features)) throw new Error('Malha do IBGE inválida');
    return data.features as Boundary[];
  }).catch((error: unknown) => { boundaries = undefined; throw error; });
  return stateAt(await boundaries, lat, lon);
}
