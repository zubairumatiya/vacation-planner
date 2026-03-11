import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  type SetStateAction,
  useContext,
} from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import styles from "../../styles/Map.module.css";
import { AuthContext } from "../../context/AuthContext";
import { useParams } from "react-router-dom";
import refreshFn from "../../utils/refreshFn";

interface Props {
  inputValue: string;
  setInputVal: React.Dispatch<SetStateAction<string>>;
  setHideSuggestions: React.Dispatch<SetStateAction<boolean>>;
  storeValues?: (id: string, name: string, vp: Viewport) => void;
  tripIdProp?: string;
  skipEO?: boolean;
}

const apiURL = import.meta.env.VITE_API_URL;

export const AutocompleteWebComponent = forwardRef(
  (
    {
      inputValue,
      setInputVal,
      setHideSuggestions,
      storeValues,
      tripIdProp,
      skipEO,
    }: Props,
    ref
  ) => {
    const auth = useContext(AuthContext);
    const token = auth?.token;
    const login = auth?.login;
    const logout = auth?.logout;
    const refreshInFlightRef = auth?.refreshInFlightRef;
    const tripId = useParams().tripId ?? tripIdProp;
    const sEO = skipEO === true ? true : undefined;
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
      const autocompleteReq = async (input: string) => {
        try {
          const result = await fetch(`${apiURL}/autocomplete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              query: `${input}`,
              tripId,
              skipEO: sEO,
            }),
          });
          if (!result.ok) {
            if (result.status === 401) {
              const resData = (await result.json()) as ApiErrorResponse;
              if (resData.error === "JwtError") {
                if (logout) {
                  await logout();
                }
                return;
              }
              if (refreshInFlightRef == null) {
                console.error("Auth flight ref not set");
                return;
              }
              const continueReq: { token: string | null; err: boolean } =
                await refreshFn(apiURL, refreshInFlightRef);
              if (!continueReq.err) {
                if (login && continueReq.token) {
                  login(String(continueReq.token));
                }
                const retryReq = await fetch(`${apiURL}/autocomplete`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${continueReq.token}`,
                  },
                  body: JSON.stringify({
                    query: `${input}`,
                    tripId,
                    skipEO: sEO,
                  }),
                });
                if (!retryReq.ok) {
                  alert("Trouble completing request, please try again");
                } else if (retryReq.ok) {
                  const data: SuggestionsResponse = await retryReq.json();
                  if (!data.suggestions) {
                    data.suggestions = [];
                  }
                  setSuggestions(data.suggestions);
                }
              } else if (continueReq.err) {
                if (logout) {
                  await logout();
                }
                return;
              }
            } else {
              throw new Error(`Error: ${result.status}`);
            }
          } else {
            const data: SuggestionsResponse = await result.json();
            if (!data.suggestions) {
              data.suggestions = [];
            }
            setSuggestions(data.suggestions);
          }
        } catch {
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tripId,
            skipEO: sEO,
          }),
        }
      );
      if (!result.ok) {
        if (result.status === 401) {
          const resData = (await result.json()) as ApiErrorResponse;
          if (resData.error === "JwtError") {
            if (logout) {
              await logout();
            }
            return;
          }
          if (refreshInFlightRef == null) {
            console.error("Auth flight ref not set");
            return;
          }
          const continueReq: { token: string | null; err: boolean } =
            await refreshFn(apiURL, refreshInFlightRef);
          if (!continueReq.err) {
            if (login && continueReq.token) {
              login(String(continueReq.token));
            }
            const retryReq = await fetch(
              `${apiURL}/details/${element.placePrediction?.placeId}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${continueReq.token}`,
                },
                body: JSON.stringify({
                  tripId,
                  skipEO: sEO,
                }),
              }
            );
            if (!retryReq.ok) {
              alert("Trouble completing request, please try again");
            } else if (retryReq.ok) {
              const data = (await retryReq.json()) as PlaceDetailsResponse;
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
            }
          } else if (continueReq.err) {
            if (logout) {
              await logout();
            }
            return;
          }
        } else {
          throw new Error(`Error: ${result.status}`);
        }
      } else {
        const data = (await result.json()) as PlaceDetailsResponse;
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
      }
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
