// src/types/google-maps-webcomponents.d.ts

import type * as React from "react"; // <-- add this

export {}; // ensures it's a module

declare global {
  interface WantToSeeListProps {
    loadSecond: () => void;
  }
  interface GmpSelectEvent {
    place: google.maps.places.Place;
  }

  interface GmpBasicPlaceAutocomplete
    extends React.HTMLAttributes<HTMLElement> {
    "ongmp-select"?: (event: GmpSelectEvent) => void;
  }

  namespace JSX {
    interface IntrinsicElements {
      "gmp-basic-place-autocomplete": React.DetailedHTMLProps<
        GmpBasicPlaceAutocomplete,
        HTMLElement
      >;
      "gmp-place-details": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          size?: "FULL" | "COMPACT";
        },
        HTMLElement
      >;
      "gmp-place-details-compact": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          size?: "FULL" | "COMPACT";
        },
        HTMLElement
      >;
      "gmp-place-details-place-request": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          place: string;
        },
        HTMLElement
      >;
      "gmp-place-all-content": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
