interface Place {
  /** The resource name for the place, in the form “places/PLACE_ID” */
  name?: string;

  /** Unique identifier for the place. Form: PLACE_ID */
  id?: string;

  /** Human-readable display name (if requested) */
  displayName?: { text: string; languageCode: string };

  /** Full address (if requested) */
  formattedAddress?: string;

  /** Short formatted address (if requested) */
  shortFormattedAddress?: string;

  /** Location of the place: latitude/longitude */
  location?: {
    lat: number;
    lng: number;
  };

  /** Place types/categories (if requested) */
  types?: string[];

  rating?: number;

  userRatingCount?: number;

  /** A token to fetch the next page of results (only appears on the response root, not each place) */
  // nextPageToken is on the parent response object, not inside each Place item
}

interface TextSearchResponse {
  places: Place[];
  nextPageToken?: string;
}
