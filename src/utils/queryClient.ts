import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 24, // 24 days
      // todo: the proper fix is to make UPR and other components safe during refetches
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

export const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
});
