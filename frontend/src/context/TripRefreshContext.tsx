import { createContext } from "react";

interface TripRefreshContextType {
  refreshTrips?: () => void;
}

export const TripRefreshContext = createContext<TripRefreshContextType>({});
