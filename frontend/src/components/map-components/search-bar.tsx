import React, { memo, useMemo, useState, useRef } from "react";
import { AutocompleteWebComponent } from "./autocomplete-webcomponent";
import styles from "../../styles/Map.module.css";
import autocompleteIcon from "../../assets/autocomplete-icon.svg";
import clearIcon from "../../assets/clear-icon.svg";

export const SearchBar = memo(function SearchBar({
  placeType,
  setPlaceType,
  setLocationId,
  setLocationName,
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

  const [submitButtonTrigger, setSubmitButtonTrigger] =
    useState<boolean>(false);

  const [inputValue, setInputValue] = useState<string>("");

  const handlePlaceTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setPlaceType(event.target.value as PlaceType);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

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
        value={placeType}
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
          aria-autocomplete="list"
          autoComplete="off"
          role="combobox"
          aria-expanded="false"
          aria-haspopup="listbox"
          aria-label="Search For a Place"
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
      <AutocompleteWebComponent
        searchButtonSubmit={submitButtonTrigger}
        onPlaceSelect={(place) => {
          setLocationId(place?.id ?? undefined);
          setLocationName(place?.formattedAddress ?? null);
        }}
      />
      <button
        type="button"
        onClick={() => setSubmitButtonTrigger((prev) => !prev)}
      >
        Submit
      </button>
    </div>
  );
});
