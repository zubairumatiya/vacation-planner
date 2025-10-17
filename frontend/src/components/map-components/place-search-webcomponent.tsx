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
  const [holdNPT, setHoldNPT] = useState<string>("");
  const [pageCount, setPageCount] = useState<number>(1);
  const [loadingNext, setLoadingNext] = useState<boolean>(true);
  const [newPageTrigger, setNewPageTrigger] = useState<boolean>(false);
  const [currentPageMax, setCurrentPageMax] = useState<number>(0);

  // on change of filters resubmit, on next button send new request()
  useEffect(() => {
    async function getPlaces() {
      setLoadingNext(true);
      try {
        if (!ratingRef.current || !reviewCountRef.current) return;
        console.log(ratingRef.current.value);
        const res = await fetch(`${apiURL}/map`, {
          method: "POST",
          body: JSON.stringify({
            ratingFilter: ratingRef.current.value,
            reviewFilter: reviewCountRef.current.value,
            nextPageToken: holdNPT,
          }),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        setRememberFilter({
          rating: ratingRef?.current?.value,
          reviews: reviewCountRef?.current?.value,
        });
        setHoldNPT(data.nextPageToken);
        const pagesAdded = Math.ceil(data.places.length / 10);
        setCurrentPageMax((prev) => prev + pagesAdded);
        setResults((prev) => [...prev, ...data.places]); // this might hold old results even when we search a new place

        setPlaces(data.places.slice(0, 10)); // do we want all of the pins on the map? it might slow maps otherwise we'll need separate handlers for page back and page next

        setLoadingNext(false);
      } catch (err) {
        console.error("Error fetching places:", err);
      }
    }

    getPlaces();
  }, [newParams, newPageTrigger]);

  const checkDifferentSelection = () => {
    if (
      rememberFilter.rating !== ratingRef?.current?.value ||
      rememberFilter.reviews !== reviewCountRef?.current?.value // hmm will this remember it properly or will it reset when i make api call?
    ) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  };

  const handlePrevPage = (e: React.MouseEvent) => {
    e.preventDefault();
    setPageCount((prev) => prev - 1);
    setPlaces(results.slice(10 * (pageCount - 1), 10 * pageCount));
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.preventDefault();

    if (pageCount === currentPageMax) {
      setPageCount((prev) => prev + 1); // will the order of this matter?
      setNewPageTrigger((prev) => !prev);
    } else {
      setPageCount((prev) => prev + 1);
      setPlaces(results.slice(10 * (pageCount - 1), 10 * pageCount));
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
        {results.slice(10 * (pageCount - 1), 10 * pageCount).map((place) => {
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
        <div className={styles.buttonsContainer}>
          <div className={styles.prevButtonContainer}>
            {pageCount > 1 && (
              <button
                type="button"
                className={styles.prevButton}
                onClick={handlePrevPage}
              >
                &lt;
              </button>
            )}
          </div>
          <p>page {pageCount}</p>
          {holdNPT && (
            <div className={styles.nextButtonWrapper}>
              <button
                type="button"
                className={styles.nextButton}
                onClick={handleNextPage}
                disabled={loadingNext}
              >
                &gt;
              </button>
            </div>
          )}
        </div>
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
