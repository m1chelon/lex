import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import {
  CAPI_CATALOG, CAPI_COLLECTIONS, CAPI_GROUPS, CAPI_ITEMS, CAPI_LEGACY_ITEMS, DEFAULT_CAPI_LOOK, PREMIUM_PRICE_CENTS, catalogSearchKey,
  type CapiCollection, type CapiGender, type CapiItem,
} from '../content/capiCatalog';
import { capiItemStatus, equipCapiItem, getCapiShop, setCapiGender, withCapiItem, type CapiShopState } from '../learn/capiShop';
import { ICheck, ILock, ISearch, ISparkle } from '../ui/icons';
import { CapiItemThumb } from '../ui/CapiWardrobeArt';
import { Mascot, type CapiPose } from '../ui/Mascot';
import { PageHeader, Segmented, Sheet, toast } from '../ui/primitives';
import { haptic } from '../ui/settings';

const BATCH = 18;
const number = new Intl.NumberFormat('pt-BR');
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const price = (cents: number) => money.format(cents / 100);
const genders: { id: CapiGender; label: string }[] = [{ id: 'masculino', label: 'O Capi' }, { id: 'feminino', label: 'A Capi' }];

const presets: { title: string; pose: CapiPose; label: string; names: string[] }[] = [
  { title: 'O Dançarino do Luar', pose: 'dance', label: 'Pose de dança', names: ['Fedora do Luar', 'Luva Estelar', 'Sapato Oxford preto'] },
  { title: 'O Grande Estadista', pose: 'speech', label: 'Pose de discurso', names: ['Cartola do Presidente', 'Casaco do Estadista', 'Relógio do Viajante'] },
  { title: 'A Pioneira', pose: 'adventure', label: 'Pose de aventura', names: ['Conjunto da Aviadora', 'Óculos aviador', 'Bota Chelsea de couro'] },
  { title: 'O Grande Orador', pose: 'oratory', label: 'Pose de oratória', names: ['Toga do Orador Romano', 'Sandálias geta', 'Pergaminho'] },
];

type View = 'catalogo' | 'armario';

function ItemPrice({ item, state }: { item: CapiItem; state: CapiShopState }) {
  const status = capiItemStatus(item, state);
  if (state.wardrobe.equipped[item.slot] === item.id) return <><ICheck size={14} /> Em uso</>;
  if (status === 'owned') return 'No guarda-roupa';
  if (item.unlock.kind === 'premium') return price(item.unlock.priceCents);
  if (item.unlock.kind === 'xp') return <>{number.format(item.unlock.amount)} XP</>;
  return null;
}

function ItemPreview({ item, state, busy, onEquip }: {
  item: CapiItem; state: CapiShopState; busy: boolean; onEquip: (remove?: boolean) => void;
}) {
  const { wardrobe, xp } = state;
  const status = capiItemStatus(item, state);
  const wearing = wardrobe.equipped[item.slot] === item.id;
  const { unlock } = item;
  return <div className="capi-product">
    <div className="capi-stage capi-stage-product">
      <Mascot size={240} preview={withCapiItem(wardrobe.equipped, item.slot, item.id)} still />
    </div>
    <div className="stack capi-product-copy">
      <h2 className="page-title">{item.name}</h2>
      <p className="small muted">{item.collection === 'legacy' ? 'Guarda-roupa' : CAPI_COLLECTIONS[item.collection]}{wearing ? ' · Em uso' : ''}</p>
      {status === 'premium' && unlock.kind === 'premium' && <div className="capi-product-details">
        <strong>{price(unlock.priceCents)}</strong>
        <p className="small muted">Compras em breve</p>
      </div>}
      {status === 'locked' && unlock.kind === 'xp' && <div className="capi-product-details">
        <span className="small muted">Faltam {number.format(unlock.amount - xp)} XP para desbloquear.</span>
        <progress value={xp} max={unlock.amount} aria-label="Progresso para desbloquear" />
      </div>}
      {wearing && item.id !== DEFAULT_CAPI_LOOK.suit && <button className="btn btn-quiet" onClick={() => onEquip(true)} disabled={busy}>Retirar peça</button>}
      {!wearing && (status === 'owned' || status === 'available') && <button className="btn btn-primary" onClick={() => onEquip()} disabled={busy}>
        {busy ? 'Salvando…' : status === 'owned' ? 'Equipar' : 'Desbloquear e equipar'}
      </button>}
    </div>
  </div>;
}

export function CapiShop() {
  const [state, setState] = useState<CapiShopState>();
  const [view, setView] = useState<View>('catalogo');
  const [collection, setCollection] = useState<CapiCollection | 'all'>('xp');
  const [group, setGroup] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(BATCH);
  const [selected, setSelected] = useState<CapiItem | null>(null);
  const [preset, setPreset] = useState<(typeof presets)[number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, retry] = useState(0);

  useEffect(() => {
    const subscription = liveQuery(getCapiShop).subscribe({
      next: (next) => { setState(next); setFailed(false); },
      error: () => setFailed(true),
    });
    return () => subscription.unsubscribe();
  }, [attempt]);

  const equipped = state?.wardrobe.equipped ?? DEFAULT_CAPI_LOOK;
  const clothes = Object.values(equipped).flatMap((id) => id ? [CAPI_ITEMS[id]] : []);
  const term = catalogSearchKey(query.trim());
  const candidates = state && view === 'armario'
    ? [...CAPI_CATALOG, ...CAPI_LEGACY_ITEMS].filter((item) => capiItemStatus(item, state) === 'owned')
    : CAPI_CATALOG.filter((item) => collection === 'all' || item.collection === collection);
  const items = candidates.filter((item) => (!group || view === 'armario' || item.group === group)
    && catalogSearchKey(item.name).includes(term));
  const groups = CAPI_GROUPS.filter((entry) => collection === 'all' || collection === entry.collection);

  const equip = async (remove?: boolean) => {
    if (!selected || busy || failed) return;
    setBusy(true);
    try {
      await equipCapiItem(selected.slot, remove ? null : selected.id);
      setSelected(null);
      haptic('ok');
      toast(remove ? 'Peça retirada' : `${selected.name} em uso`);
    } catch {
      toast('Não foi possível salvar a peça. Confira seu XP e tente novamente.');
    } finally { setBusy(false); }
  };

  const changeGender = (gender: CapiGender) => {
    void setCapiGender(gender).catch(() => toast('Não foi possível atualizar o Capi.'));
  };
  let presetOutfit = DEFAULT_CAPI_LOOK;
  if (preset) {
    for (const name of preset.names) {
      const item = Object.values(CAPI_ITEMS).find((entry) => entry.name === name);
      if (item) presetOutfit = withCapiItem(presetOutfit, item.slot, item.id);
    }
  }

  return <div className="stack capi-shop">
    <PageHeader title="Loja do Capi" right={state && <div className="capi-wallet" role="status">
      <ISparkle size={16} /><strong>{number.format(state.xp)}</strong><span>XP</span>
    </div>} />
    {!state && <p className="small muted" role="status">{failed ? 'Não foi possível abrir o guarda-roupa.' : 'Abrindo o guarda-roupa…'}</p>}
    {failed && <button className="btn btn-quiet" onClick={() => { setFailed(false); retry(attempt + 1); }}>Tentar novamente</button>}
    {state && <div className="capi-shop-grid">
      <aside className="capi-fitting" aria-label="Seu Capi">
        <div className="capi-stage capi-stage-profile"><Mascot size={240} still /></div>
        <div className="capi-fitting-copy">
          <h2 className="title-m">Seu Capi</h2>
          <Segmented label="Gênero do Capi" value={state.wardrobe.gender} options={genders} onChange={changeGender} />
          <ul className="capi-worn" aria-label="Visual equipado">
            {clothes.map((item) => <li key={item.id}><button onClick={() => setSelected(item)}>{item.name}</button></li>)}
          </ul>
        </div>
      </aside>
      <section className="stack capi-catalog" aria-label="Itens da loja">
        <Segmented<View> label="Área da loja" value={view} options={[{ id: 'catalogo', label: 'Catálogo' }, { id: 'armario', label: 'Guarda-roupa' }]}
          onChange={(next) => { setView(next); setGroup(''); setQuery(''); setLimit(BATCH); }} />
        {view === 'catalogo' && <div className="capi-filters">
          <label>Coleção<select name="collection" value={collection} onChange={(event) => { setCollection(event.target.value as typeof collection); setGroup(''); setLimit(BATCH); }}>
            <option value="all">Todas as coleções</option>
            {Object.entries(CAPI_COLLECTIONS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select></label>
          <label>Categoria<select name="category" value={group} onChange={(event) => { setGroup(event.target.value); setLimit(BATCH); }}>
            <option value="">Todas as categorias</option>
            {groups.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select></label>
        </div>}
        <label className="search-field glass"><ISearch size={18} /><input type="search" name="item" autoComplete="off" enterKeyHint="search"
          aria-label="Buscar item" placeholder="Buscar item…" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(BATCH); }} /></label>
        {view === 'catalogo' && collection !== 'xp' && collection !== 'all' && <p className="capi-shop-note"><ILock size={16} /> Compras em breve. Peças a {price(PREMIUM_PRICE_CENTS)} cada.</p>}
        {view === 'catalogo' && collection === 'xp' && <p className="capi-shop-note">Alcance o XP indicado para desbloquear as peças gratuitamente.</p>}
        {view === 'catalogo' && collection === 'icons' && !group && !query && <details className="capi-presets">
          <summary>Combinações com poses</summary>
          <div>{presets.map((entry) => <button key={entry.title} className="chip" onClick={() => setPreset(entry)}>{entry.title}</button>)}</div>
        </details>}
        <p className="small muted capi-count" role="status">{number.format(items.length)} {items.length === 1 ? 'item' : 'itens'}</p>
        {items.length > 0 ? <ul className="capi-items">
          {items.slice(0, limit).map((item) => {
            const status = capiItemStatus(item, state);
            return <li key={item.id}>
              <button className="capi-option" data-item-id={item.id} onClick={() => { haptic('soft'); setSelected(item); }}>
                <span className="capi-item-art"><CapiItemThumb item={item} /></span>
                <span className="capi-item-label"><strong>{item.name}</strong><small><ItemPrice item={item} state={state} /></small></span>
                {(status === 'locked' || status === 'premium') && <ILock size={15} className="capi-item-lock" />}
              </button>
            </li>;
          })}
        </ul> : <p className="empty">Nenhum item encontrado.</p>}
        {items.length > limit && <button className="btn btn-quiet capi-show-more" onClick={() => setLimit(limit + BATCH)}>Mostrar mais itens</button>}
      </section>
    </div>}
    {state && <Sheet open={!!selected} label={selected?.name ?? ''} onClose={() => { if (!busy) setSelected(null); }}>
      {selected && <ItemPreview item={selected} state={state} busy={busy} onEquip={(remove) => void equip(remove)} />}
    </Sheet>}
    <Sheet open={!!preset} label={preset?.title ?? ''} onClose={() => setPreset(null)}>
      {preset && <div className="capi-product">
        <div className="capi-stage capi-stage-product"><Mascot key={preset.title} size={240} preview={presetOutfit} posePreview={preset.pose} /></div>
        <div className="stack capi-product-copy">
          <h2 className="page-title">{preset.title}</h2>
          <p className="small muted">{preset.label}</p>
          <p>{preset.names.join(' · ')}</p>
        </div>
      </div>}
    </Sheet>
  </div>;
}
