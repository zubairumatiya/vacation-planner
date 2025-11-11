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
import autocompleteIcon from "../../assets/autocomplete-icon.svg";
import clearIcon from "../../assets/clear-icon.svg";
import { useMap } from "@vis.gl/react-google-maps";

export const SearchBar = memo(function SearchBar({
  placeType,
  setPlaceType,
  setLocationId,
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
    ],
    []
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

  const [localSearchDisabled, setLocalSearchDisabled] = useState<boolean>(true);

  const [holdName, setHoldName] = useState<string>("-1-2A-ad-54");

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
      // getting an annoying bug rn. locationName and holdName are not equal until we select a new location, so we can keep selecting the same placetype and it will register as new params. This started because I realized if someone is planning a location and they want to look at restaurants they would not have been able to because of how i set it up, they would basically have to make 2 requests to do that. So im trying to let someone search initially and then store the values.
      setLocalSearchDisabled(false);
    } else {
      setLocalSearchDisabled(true);
    }
  }, [placeTypeValue, holdName]);

  const handlePlaceTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setPlaceTypeValue(event.target.value as PlaceType);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmitValues = useCallback(
    (id: string, name: string, vp: Viewport) => {
      setResetInput(true);
      setHoldName(name);
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(vp.low.latitude, vp.low.longitude),
        new google.maps.LatLng(vp.high.latitude, vp.high.longitude)
      );
      const holdValues = () => {
        setLocationId(id);
        setLocationName(name);
        setViewport(vp);
        map?.fitBounds(bounds);
        setPlaceType(placeTypeRef.current);
        setLocalSearchDisabled(true);
        console.log("enter");
      };

      setClosure(() => holdValues);
    },
    [map]
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
        disabled={(searchDisabled && localSearchDisabled) || holdName === ""}
        onClick={() => {
          setSubmitButtonTrigger((prev) => !prev);
          if (closure) closure();
          setLocalSearchDisabled(true);
        }}
      >
        Submit
      </button>
    </div>
  );
});
