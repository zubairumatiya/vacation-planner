import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  type SetStateAction,
} from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import styles from "../../styles/Map.module.css";

interface Props {
  inputValue: string;
  setInputVal: React.Dispatch<SetStateAction<string>>;
  setHideSuggestions: React.Dispatch<SetStateAction<boolean>>;
  storeValues?: (id: string, name: string, vp: Viewport) => void;
}

const apiURL = import.meta.env.VITE_API_URL;

export const AutocompleteWebComponent = forwardRef(
  (
    { inputValue, setInputVal, setHideSuggestions, storeValues }: Props,
    ref
  ) => {
    const handleKeyDown = (e: string) => {
      if (!e) return;
      if (suggestions.length < 0 && focusedSelection === -1) return;
      let next = focusedSelection;
      if (e === "ArrowDown") {
        if (focusedSelection === suggestions.length - 1) {
          next = 0;
        } else {
          next = focusedSelection + 1;
        }
      } else if (e === "ArrowUp") {
        if (focusedSelection === 0) {
          next = suggestions.length - 1;
        } else {
          next = focusedSelection - 1;
        }
      }
      if (focusedSelection !== next) setFocusedSelection(next);

      if (e === "Enter") {
        if (focusedSelection !== -1) {
          handlePlaceClick(undefined, focusedSelection);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      handleKeyDown,
    }));
    // Load the places library to ensure the web component is available
    useMapsLibrary("places");

    const [suggestions, setSuggestions] = useState<
      { placePrediction?: PlacePrediction }[]
    >([]);

    const [focusedSelection, setFocusedSelection] = useState<number>(-1);

    useEffect(() => {
      if (!inputValue) {
        setSuggestions([]);
        return;
      }
      console.log(inputValue);
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
          if (!data.suggestions) {
            data.suggestions = [];
          }
          setSuggestions(data.suggestions);
        } catch {
          console.log("error making req to backend");
          return;
        }
      };
      autocompleteReq(inputValue);
    }, [inputValue]);

    // Handle the selection of a place from the autocomplete component
    // This fetches additional place details and adjusts the map view
    /*
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
          //onPlaceSelect(place);
        };

        return closureFn;
      } catch (error) {
        console.error("Error fetching place fields:", error);
        //onPlaceSelect(null);
      }
    },
    [map]
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
*/
    const handlePlaceClick = async (
      e?: React.MouseEvent<HTMLUListElement>,
      keyboardSelection?: number
    ) => {
      // will have to make a call to place details to get place viewport
      // will have to get rid of suggestions on blur but still hold the text value in the search bar
      let index =
        (e?.target as HTMLElement)?.closest("li")?.dataset.index ??
        keyboardSelection;
      if (!index) {
        index = 0;
      }
      const element = suggestions[Number(index)];
      const result = await fetch(
        `${apiURL}/details/${element.placePrediction?.placeId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await result.json();
      if (storeValues) {
        storeValues(
          element.placePrediction!.placeId,
          element.placePrediction?.text.text ?? "",
          data.viewport
        );
      }
      setInputVal(element.placePrediction?.text.text ?? "");
      setHideSuggestions(true);
      setSuggestions([]);
      setFocusedSelection(-1);
    };

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
        {suggestions.length > 0 && (
          <div className={styles.suggestionListContainer}>
            <ul className={styles.suggestionUl} onClick={handlePlaceClick}>
              {suggestions.map(
                (
                  v,
                  i // v.structuredFormat.mainText.text   AND     v.structuredFormat.secondaryText.text
                ) => (
                  <li
                    key={v.placePrediction?.placeId}
                    data-location={v.placePrediction?.text.text}
                    data-index={i}
                    id={v.placePrediction?.placeId}
                    className={
                      focusedSelection === i
                        ? styles.focusedSuggestion
                        : undefined
                    }
                  >
                    <div className={styles.liRow}>
                      <span className={styles.mainSuggestionText}>
                        {v.placePrediction?.structuredFormat?.mainText?.text}
                      </span>
                      <span className={styles.secondarySuggestionText}>
                        {
                          v.placePrediction?.structuredFormat?.secondaryText
                            ?.text
                        }
                      </span>
                    </div>
                  </li>
                )
              )}
            </ul>
          </div>
        )}
        {/*

          <gmp-basic-place-autocomplete
          disable-auto-viewport
          ongmp-select={handleGmpSelect}
          //onClick={manualHandlingSelect}
          aria-label="Search for a location"
          />
        */}
      </div>
    );
  }
);

AutocompleteWebComponent.displayName = "AutocompleteWebComponent";

/**
 * Augments the React JSX namespace to add type definitions for the
 * Places UI Kit  web components. This provides
 * type-checking and autocompletion for their props, including custom
 * events, within JSX.
 */
