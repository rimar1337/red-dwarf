import React, { createContext, useContext, useCallback } from "react";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

type PersistentValue = {
  value: string;
  time: number;
};

type PersistentStoreContextType = {
  get: (key: string) => Promise<PersistentValue | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

const PersistentStoreContext = createContext<PersistentStoreContextType | null>(
  null,
);

export const PersistentStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const get = useCallback(
    async (key: string): Promise<PersistentValue | null> => {
      if (typeof window === "undefined") return null;
      const raw = await idbGet(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as PersistentValue;
      } catch {
        return null;
      }
    },
    [],
  );

  const set = useCallback(async (key: string, value: string) => {
    if (typeof window === "undefined") return;
    const entry: PersistentValue = { value, time: Date.now() };
    await idbSet(key, JSON.stringify(entry));
  }, []);

  const remove = useCallback(async (key: string) => {
    if (typeof window === "undefined") return;
    await idbDel(key);
  }, []);

  return (
    <PersistentStoreContext.Provider value={{ get, set, remove }}>
      {children}
    </PersistentStoreContext.Provider>
  );
};

export const usePersistentStore = (): PersistentStoreContextType => {
  const context = useContext(PersistentStoreContext);
  if (!context)
    throw new Error(
      "usePersistentStore must be used within a PersistentStoreProvider",
    );
  return context;
};
