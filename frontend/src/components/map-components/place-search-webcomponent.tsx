import { useEffect, useState, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import styles from "../../styles/Map.module.css";

const apiURL = import.meta.env.VITE_API_URL;

export const PlaceSearchWebComponent = ({
  //FOR NEXT TIME: let's get cards set up that are scrollable and selectable with a page button
  onPlaceSelect,
  setPlaces,
  locationId,
  locationName,
  placeType,
}: PlaceSearchProps) => {
  const ratingRef = useRef<HTMLSelectElement>(null);
  const reviewCountRef = useRef<HTMLSelectElement>(null);
  const [newParams, setNewParams] = useState<boolean>(false);
  const [disabled, setDisabled] = useState<boolean>(true);
  const [results, setResults] = useState<google.maps.places.Place[]>([]);
  const [rememberFilter, setRememberFilter] = useState({
    rating: "",
    reviews: "",
  });

  // on change of filters resubmit, on next button send new request()
  useEffect(() => {
    async function getPlaces() {
      try {
        const res = await fetch(`${apiURL}/map`); // can add in the request body the number of stars (minRating)
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log(data.places.length);
        console.log(reviewCountRef?.current?.value);
        if (ratingRef.current && reviewCountRef.current) {
          setRememberFilter({
            rating: ratingRef?.current?.value,
            reviews: reviewCountRef?.current?.value,
          });
        }
        setResults(data.places);
        setPlaces(data.places);
      } catch (err) {
        console.error("Error fetching places:", err);
      }
    }

    getPlaces();
  }, [newParams]);

  const checkDifferentSelection = () => {
    if (
      rememberFilter.rating !== ratingRef?.current?.value ||
      rememberFilter.reviews !== reviewCountRef?.current?.value
    ) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  };

  // Return the Google Maps Place List Web Component
  // This component is rendered as a custom HTML element (Web Component) provided by Google
  return (
    <>
      <div className={styles.filterContainer}>
        <p>Filters</p>
        <label htmlFor="mininmum-rating" className={styles.filterLabel}>
          Min. Rating:
        </label>
        <select
          name="min-rating"
          id="min-rating"
          className={styles.select}
          ref={ratingRef}
          onChange={checkDifferentSelection}
        >
          <option value="none">-</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
        </select>
        <label htmlFor="number-of-reviews" className={styles.filterLabel}>
          # of Reviews:
        </label>
        <select
          name="min-reviews"
          id="min-reviews"
          className={styles.select}
          ref={reviewCountRef}
          onChange={checkDifferentSelection}
        >
          <option value="none">-</option>
          <option value="1000">1000</option>
          <option value="500">500</option>
          <option value="250">250</option>
          <option value="100">100</option>
        </select>
        <div>
          <button
            type="button"
            onClick={() => {
              setNewParams((prev) => !prev);
            }}
            disabled={disabled}
          >
            Submit
          </button>
        </div>
      </div>
      <div className={styles.placesContainer}>
        {results.map((place) => {
          //const photoUrl =
          //  place.photos?.[0]?.getUrl() ?? "https://via.placeholder.com/80";

          return (
            <div
              key={place.id}
              className={styles.placeCard}
              onClick={() => {
                onPlaceSelect(place);
              }}
            >
              {/*<img
              src={photoUrl}
              alt={place.name}
              className={styles.placePhoto}
            />*/}
              <div className={styles.placeDetails}>
                <h3 className={styles.placeName}>
                  {place?.displayName?.text ?? "undefined"}
                </h3>
                <div className={styles.placeRating}>
                  ⭐ {place.rating ?? "—"}{" "}
                  <span className={styles.ratingCount}>
                    ({place.userRatingCount ?? 0})
                  </span>
                </div>
                <div className={styles.placeAddress}>
                  {place.formattedAddress}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

/**
 * Augments the React JSX namespace to add type definitions for the
 * Places UI Kit  web components. This provides
 * type-checking and autocompletion for their props, including custom
 * events, within JSX.
 */
