import React, {
  memo,
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { AutocompleteWebComponent } from "./autocomplete-webcomponent";
import styles from "../../styles/Map.module.css";
import autocompleteIcon from "../../assets/icons/autocomplete-icon.svg";
import clearIcon from "../../assets/icons/clear-icon.svg";
import { useMap } from "@vis.gl/react-google-maps";

export const SearchBar = memo(function SearchBar({
  placeType,
  setPlaceType,
  setLocationName,
  locationName,
  searchDisabled,
  setSubmitButtonTrigger,
  setViewport,
}: SearchBarProps) {
  const placeTypeOptions: PlaceTypeOption[] = useMemo(
    () => [
      { value: "restaurant", label: "Restaurants" },
      { value: "cafe", label: "Cafes" },
      { value: "museum", label: "Museums" },
      { value: "lodging", label: "Lodging" },
      { value: "spa", label: "Spas" },
      { value: "beach", label: "Beaches" },
      { value: "scenicSpot", label: "Scenic areas" },
      { value: "clothingStore", label: "Clothing stores" },
      { value: "transportationService", label: "Transportation" },
      { value: "hikingArea", label: "Hiking" },
      { value: "park", label: "Parks" },
      { value: "amusementPark", label: "Amusement parks" },
      { value: "touristAttraction", label: "Popular tourism" },
    ],
    [],
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const [hideSuggestions, setHideSuggestions] = useState<boolean>(true);

  const [closure, setClosure] = useState<(() => void) | undefined>(undefined);
  const map = useMap();

  const [inputValue, setInputValue] = useState<string>(locationName);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const [resetInput, setResetInput] = useState<boolean>(true);

  const [placeTypeValue, setPlaceTypeValue] = useState<PlaceType>(placeType);

  const placeTypeRef = useRef<PlaceType>(placeType);

  const [localSearchDisabled, setLocalSearchDisabled] =
    useState<boolean>(false);
  const [holdName, setHoldName] = useState<string>(locationName);

  const autocompleteRef = useRef<{
    handleKeyDown: (key: string) => void;
  }>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setHideSuggestions(true);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    placeTypeRef.current = placeTypeValue;
    if (placeType !== placeTypeValue || locationName !== holdName) {
      setLocalSearchDisabled(false);
    } else {
      setLocalSearchDisabled(true);
    }
  }, [placeTypeValue, holdName]);

  const handlePlaceTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setPlaceTypeValue(event.target.value as PlaceType);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmitValues = useCallback(
    (_id: string, name: string, vp: Viewport) => {
      setResetInput(true);
      setHoldName(name);
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(vp.low.latitude, vp.low.longitude),
        new google.maps.LatLng(vp.high.latitude, vp.high.longitude),
      );
      const holdValues = () => {
        setLocationName(name);
        setViewport(vp);
        map?.fitBounds(bounds);
        setPlaceType(placeTypeRef.current);
        setLocalSearchDisabled(true);
        console.log("enter");
      };

      setClosure(() => holdValues);
    },
    [map],
  );

  return (
    <div
      className={styles.autocompleteWrapper}
      role="search"
      aria-label="Location search"
    >
      <label className={styles.label} htmlFor="place-type-select">
        Find
      </label>
      <select
        id="place-type-select"
        value={placeTypeValue}
        onChange={handlePlaceTypeChange}
        className={styles.select}
      >
        {placeTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className={styles.span}>near</span>
      <div ref={wrapperRef} className={styles.searchAndAutoContainer}>
        <div
          className={`${styles.searchContainer} ${
            isFocused ? styles.focusRing : ""
          }`}
          tabIndex={0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onClick={() => searchInputRef.current?.focus()}
        >
          <div className={styles.acIconContainer}>
            <img
              className={styles.acIcon}
              src={autocompleteIcon}
              alt="autocompleteIcon"
            />
          </div>
          <input
            ref={searchInputRef}
            className={styles.searchInput}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (resetInput) {
                setInputValue("");
                setResetInput(false);
              }
              setHideSuggestions(false);
            }}
            placeholder="city, town, etc"
            aria-autocomplete="list"
            autoComplete="off"
            role="combobox"
            aria-expanded="false"
            aria-haspopup="listbox"
            aria-label="Search For a Place"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (
                e.key === "ArrowUp" ||
                e.key === "ArrowDown" ||
                e.key === "Enter"
              ) {
                e.preventDefault();
              }
              autocompleteRef.current?.handleKeyDown(e.key);
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
          />
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => setInputValue("")}
          >
            <img
              className={styles.clearButtonIcon}
              src={clearIcon}
              alt="clearIcon"
            />
          </button>
        </div>
        <div className={styles.autoWrapper}>
          {!hideSuggestions && (
            <AutocompleteWebComponent
              ref={autocompleteRef}
              inputValue={inputValue}
              setInputVal={setInputValue}
              setHideSuggestions={setHideSuggestions}
              storeValues={handleSubmitValues}
            />
          )}
        </div>
      </div>
      <button
        type="button"
        className={styles.submitButton}
        disabled={(searchDisabled && localSearchDisabled) || holdName === ""}
        onClick={() => {
          setSubmitButtonTrigger((prev) => !prev);
          if (closure) closure();
          setHoldName(inputValue);
        }}
      >
        Submit
      </button>
    </div>
  );
});
