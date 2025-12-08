// src/types/google-maps-webcomponents.d.ts

export {}; // ensures it's a module

declare global {
  type PlacePrediction = {
    place: string;
    placeId: string;
    text: {
      text: string;
      matches: { startOffset: number; endOffset: number }[];
    };
    structuredFormat: {
      mainText: {
        text: string;
        matches: { startOffset: number; endOffset: number }[];
      };
      secondaryText: {
        text: string;
        matches: { startOffset: number; endOffset: number }[];
      };
    };
    types: string[];
  };

  type Vp = {
    south: number;
    west: number;
    north: number;
    east: number;
  };

  type Point = {
    lat: number;
    lng: number;
  };

  type SuggestionsResponse = {
    suggestions: {
      placePrediction?: PlacePrediction;
    }[];
  };

  type Viewport = {
    low: { latitude: number; longitude: number };
    high: { latitude: number; longitude: number };
  };

  type PlaceType = "restaurant" | "cafe" | "museum";

  interface GmpSelectEvent {
    place: google.maps.places.Place;
  }

  interface GmpBasicPlaceAutocomplete
    extends React.HTMLAttributes<HTMLElement> {
    "ongmp-select"?: (event: GmpSelectEvent) => void;
  }

  interface PlaceDetailsMarkerProps {
    place: google.maps.places.Place;
    selected: boolean;
    onClick: (placeId: string | undefined) => void;
    detailsSize: "FULL";
  }

  interface PlaceSearchProps {
    onPlaceSelect: (place: google.maps.places.Place.id | undefined) => void;
    setPlaces: (markers: google.maps.places.Place[]) => void;
    locationName: string | null;
    placeType: string | null;
    setSearchDisabled: (boolean: boolean) => void;
    submitButtonTrigger: boolean;
    viewport;
    list: Item[];
    handleSubmitItem: WantToSeeListProps["handleSubmitItem"];
    handleDeleteItem: WantToSeeListProps["handleDeleteItem"];
  }

  type PlaceSearchElement = HTMLElement & {
    readonly places: google.maps.places.Place[];
  };

  type PlaceNearbySearchRequestElement = HTMLElement & {
    locationRestriction: { center: google.maps.LatLng; radius: number };
    includedPrimaryTypes?: Array<string>;
    maxResultCount: number;
    rankPreference: string;
    pageSize: number;
  };

  type PlaceTextSearchRequestElement = HTMLElement & {
    locationRestriction: { center: google.maps.LatLng; radius: number };
    locationBias: { center: google.maps.LatLng; radius: number };
    textQuery: string;
    readonly places: google.maps.places.Place[];
  };

  interface PlacesTextSearchResponseEventDetail {
    results: google.maps.places.Place[];
    status: google.maps.places.PlacesServiceStatus;
  }

  type PlacesTextSearchResponseEvent =
    CustomEvent<PlacesTextSearchResponseEventDetail>;

  interface GmpPlaceSearchAttributes
    // @ts-expect-error PlaceSearchElement not in official types yet
    extends React.HTMLAttributes<google.maps.places.PlaceSearchElement> {
    selectable?: boolean;
    "truncation-preferred"?: boolean;
    orientation?: "HORIZONTAL" | "VERTICAL";
  }

  interface GmpPlaceNearbySearchRequestAttributes
    // @ts-expect-error PlaceSearchElement not in official types yet
    extends React.HTMLAttributes<google.maps.places.PlaceNearbySearchRequestElement> {
    "location-restriction"?: string;
    "included-primary-types"?: string;
    "max-result-count"?: number;
    "rank-preference"?: string;
    "page-size"?: number;
  }

  interface GmpPlaceTextSearchRequestAttributes
    extends React.HTMLAttributes<google.maps.places.PlaceTextSearchRequestElement> {
    "location-bias"?: string;
    "text-query"?: string;
  }

  interface SearchBarProps {
    setLocationId: (placeId: string | undefined) => void;
    placeType: PlaceType;
    setPlaceType: (placeType: PlaceType) => void;
    setLocationName: (placeDisplayName: string) => void;
    locationName: string;
    searchDisabled: boolean;
    setSubmitButtonTrigger: React.Dispatch<React.SetStateAction<boolean>>;
    setViewport: React.Dispatch<React.SetStateAction<Viewport | null>>;
  }

  interface PlaceTypeOption {
    value: PlaceType;
    label: string;
  }
}

declare module "react/jsx-runtime" {
  export namespace JSX {
    interface IntrinsicElements {
      "gmp-basic-place-autocomplete": React.DetailedHTMLProps<
        GmpBasicPlaceAutocomplete,
        HTMLElement
      >;
      "gmp-place-details": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { size?: "FULL" | "COMPACT" },
        HTMLElement
      >;
      "gmp-place-details-compact": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { size?: "FULL" | "COMPACT" },
        HTMLElement
      >;
      "gmp-place-details-place-request": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { place: string },
        HTMLElement
      >;
      "gmp-place-all-content": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      "gmp-place-search": React.DetailedHTMLProps<
        GmpPlaceSearchAttributes,
        // @ts-expect-error PlaceSearchElement not in official types yet
        google.maps.places.PlaceSearchElement
      >;
      "gmp-place-nearby-search-request": React.DetailedHTMLProps<
        GmpPlaceNearbySearchRequestAttributes,
        // @ts-expect-error TODO not in official types yet
        google.maps.places.PlaceNearbySearchRequestElement
      >;
      "gmp-place-text-search-request": React.DetailedHTMLProps<
        GmpPlaceTextSearchRequestAttributes,
        google.maps.places.PlaceTextSearchRequestElement
      >;
    }
  }
}
