import React, { memo, useMemo } from "react";
import { AutocompleteWebComponent } from "./autocomplete-webcomponent";
import styles from "../../styles/Map.module.css";

export const SearchBar = memo(function SearchBar({
  placeType,
  setPlaceType,
  setLocationId,
}: SearchBarProps) {
  const placeTypeOptions: PlaceTypeOption[] = useMemo(
    () => [
      { value: "restaurant", label: "Restaurants" },
      { value: "cafe", label: "Cafes" },
      { value: "museum", label: "Museums" },
    ],
    []
  );

  const handlePlaceTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setPlaceType(event.target.value as PlaceType);
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
      <AutocompleteWebComponent
        onPlaceSelect={(place) => setLocationId(place?.id ?? null)}
      />
    </div>
  );
});
