import { createContext, useCallback, useRef } from "react";

interface TripRefreshContextType {
  refreshTrips?: () => void;
  registerRefresh: (fn: () => void) => void;
  unregisterRefresh: () => void;
}

export function useTripRefreshProvider(): TripRefreshContextType {
  const fnRef = useRef<(() => void) | null>(null);

  const refreshTrips = useCallback(() => {
    fnRef.current?.();
  }, []);

  const registerRefresh = useCallback((fn: () => void) => {
    fnRef.current = fn;
  }, []);

  const unregisterRefresh = useCallback(() => {
    fnRef.current = null;
  }, []);

  return { refreshTrips, registerRefresh, unregisterRefresh };
}

export const TripRefreshContext = createContext<TripRefreshContextType>({
  registerRefresh: () => {},
  unregisterRefresh: () => {},
});
