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
          if (!result.ok) throw new Error(`Error: ${result.status}`);
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
      if (!result.ok) throw new Error(`Error: ${result.status}`);
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

    return (
      <div className={styles.autocompleteContainer}>
        {suggestions.length > 0 && (
          <div className={styles.suggestionListContainer}>
            <ul className={styles.suggestionUl} onClick={handlePlaceClick}>
              {suggestions.map((v, i) => (
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
                      {v.placePrediction?.structuredFormat?.secondaryText?.text}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
);

AutocompleteWebComponent.displayName = "AutocompleteWebComponent";
