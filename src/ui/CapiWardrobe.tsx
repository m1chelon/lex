import { liveQuery } from 'dexie';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '../data/db';
import { CAPI_WARDROBE_KEY, normalizeWardrobe } from '../learn/capiShop';

const emptyWardrobe = normalizeWardrobe(null);
const WardrobeContext = createContext(emptyWardrobe);

export function CapiWardrobe({ children }: { children: ReactNode }) {
  const [wardrobe, setWardrobe] = useState(emptyWardrobe);
  useEffect(() => {
    const subscription = liveQuery(() => db.kv.get(CAPI_WARDROBE_KEY)).subscribe({
      next: (row) => setWardrobe(normalizeWardrobe(row?.value)),
      error: () => setWardrobe(emptyWardrobe),
    });
    return () => subscription.unsubscribe();
  }, []);
  return <WardrobeContext.Provider value={wardrobe}>{children}</WardrobeContext.Provider>;
}

export const useCapiWardrobe = () => useContext(WardrobeContext);
