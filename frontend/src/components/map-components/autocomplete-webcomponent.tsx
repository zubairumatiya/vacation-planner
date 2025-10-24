import { useCallback, useState, useEffect } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import styles from "../../styles/Map.module.css";

interface Props {
  onPlaceSelect: (place: google.maps.places.Place | null) => void;
  searchButtonSubmit: boolean;
}

const apiURL = import.meta.env.VITE_API_URL;

export const AutocompleteWebComponent = ({
  onPlaceSelect,
  searchButtonSubmit,
}: Props) => {
  // Load the places library to ensure the web component is available
  useMapsLibrary("places");
  const [closureRef, setClosureRef] = useState<(() => void) | undefined>(
    undefined
  );
  const [suggestions, setSuggestions] = useState<
    { placePrediction?: PlacePrediction }[]
  >([]);

  const map = useMap();

  const autocompleteReq = async (input: string) => {
    try {
      const result = await fetch(`${apiURL}/autocomplete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `${input}`,
        }),
      });
      const data: SuggestionsResponse = await result.json();
      setSuggestions(data.suggestions);
    } catch {
      console.log("error making req to backend");
      return;
    }
  };

  // Handle the selection of a place from the autocomplete component
  // This fetches additional place details and adjusts the map view

  useEffect(() => {
    console.log("enter: ", closureRef);
    if (closureRef !== undefined) closureRef();
  }, [searchButtonSubmit]); // search button trigger

  const handlePlaceSelect = useCallback(
    async (place: google.maps.places.Place) => {
      try {
        // Fetch location and viewport data for the selected place
        await place.fetchFields({
          fields: ["displayName", "location", "viewport", "formattedAddress"],
        });
        // If the place has a viewport (area boundaries), adjust the map to show it
        console.log("PLACE", place.formattedAddress);

        const closureFn = () => {
          if (place.viewport) {
            map?.fitBounds(place.viewport);
          }
          onPlaceSelect(place);
        };

        return closureFn;
      } catch (error) {
        console.error("Error fetching place fields:", error);
        onPlaceSelect(null);
      }
    },
    [map, onPlaceSelect]
  );

  // Handle the gmp-select event, which returns a Place object, that contains only a place ID
  const handleGmpSelect = useCallback(
    async (event: GmpSelectEvent) => {
      console.log(event);
      const result = await handlePlaceSelect(event.place);
      setClosureRef(result);
    },
    [handlePlaceSelect]
  );

  const manualHandlingSelect = useCallback(
    async (event: GmpSelectEvent) => {
      const result = await handlePlaceSelect(event.place);
      setClosureRef(result);
    },
    [handlePlaceSelect]
  );

  // Note: This is a React 19 thing to be able to treat custom elements this way.
  //   In React before v19, you'd have to use a ref, or use the BasicPlaceAutocompleteElement
  //   constructor instead.
  return (
    <div className={styles.autocompleteContainer}>
      {/* 
        gmp-place-autocomplete is a Google Maps Web Component that provides a search box
        with automatic place suggestions as the user types.
        
        It supports two event types for backward compatibility:
        - ongmp-select: Used in alpha and future stable versions
        - ongmp-placeselect: Deprecated but still used in beta channel
      */}
      <div className={styles.suggestionListContainer}>
        <ul className={styles.suggestionUl}>
          {suggestions.map((v) => (
            <li key={v.placePrediction?.placeId}>
              {v.placePrediction?.text.text}
            </li>
          ))}
        </ul>
      </div>
      <gmp-basic-place-autocomplete
        disable-auto-viewport
        ongmp-select={handleGmpSelect}
        //onClick={manualHandlingSelect}
        aria-label="Search for a location"
      />
    </div>
  );
};

/**
 * Augments the React JSX namespace to add type definitions for the
 * Places UI Kit  web components. This provides
 * type-checking and autocompletion for their props, including custom
 * events, within JSX.
 */
