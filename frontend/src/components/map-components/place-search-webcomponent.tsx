import { useEffect, useState, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import styles from "../../styles/Map.module.css";
import starIcon from "../../assets/star-icon.svg";

const apiURL = import.meta.env.VITE_API_URL;

export const PlaceSearchWebComponent = ({
  onPlaceSelect,
  setPlaces,
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
  const [currentPageMax, setCurrentPageMax] = useState<number>(0);
  const [pageCountSwitch, setPageCountSwitch] = useState<boolean>(false);
  const [newPageRequest, setNewPageRequest] = useState<boolean>(false);

  useEffect(() => {
    console.log("PLACETYPE", placeType);
    console.log("LOCATIONNAME", locationName);
    async function getPlaces() {
      setLoadingNext(true);
      try {
        if (!ratingRef.current || !reviewCountRef.current) return;
        const res = await fetch(`${apiURL}/map`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ratingFilter:
              ratingRef.current.value === "none"
                ? null
                : Number(ratingRef.current.value),
            reviewFilter:
              reviewCountRef.current.value === "none"
                ? null
                : Number(reviewCountRef.current.value),
            nextPageToken: newPageRequest ? holdNPT : "",
            placeType,
            locationName,
          }),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        setRememberFilter({
          rating: ratingRef?.current?.value,
          reviews: reviewCountRef?.current?.value,
        });
        console.log(data.nextPageToken);
        console.log("\n\n\n ~~~~~~~~~ \n\n\n");
        const pagesAdded = Math.ceil(data.places.length / 10);
        if (newPageRequest) {
          setCurrentPageMax((prev) => prev + pagesAdded);
          setResults((prev) => [...prev, ...data.places]);
          setNewPageRequest(false);
        } else {
          setCurrentPageMax(pagesAdded);
          setResults(data.places);
          setPageCount(1);
        }
        setPlaces(data.places.slice(0, 10));
        setHoldNPT(data.nextPageToken);
        setLoadingNext(false);
      } catch (err) {
        console.error("Error fetching places:", err);
      }
    }

    getPlaces();
  }, [newParams, placeType, locationName]);

  //the only time we would reuse token is if a new page is requested, otherwise, upon any other change, we will be making a new req.
  const newPageTrigger = () => {
    setNewPageRequest(true);
    setNewParams((prev) => !prev);
  };

  useEffect(() => {
    setPlaces(results.slice(10 * (pageCount - 1), 10 * pageCount));
  }, [pageCountSwitch]);

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

  const handlePrevPage = (e: React.MouseEvent) => {
    e.preventDefault();
    setPageCount((prev) => prev - 1);
    setPageCountSwitch((prev) => !prev);
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.preventDefault();

    if (pageCount === currentPageMax) {
      setPageCount((prev) => prev + 1); // will the order of this matter?
      newPageTrigger();
    } else {
      setPageCount((prev) => prev + 1);
      setPageCountSwitch((prev) => !prev);
    }
  };

  // Return the Google Maps Place List Web Component
  // This component is rendered as a custom HTML element (Web Component) provided by Google
  return (
    <>
      <div className={styles.listParentContainer}>
        <div className={styles.filterContainer}>
          <p className={styles.filterHeader}>Filters</p>
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
            <option value="4.5">4.5 Stars</option>
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
              className={styles.applyButton}
              type="button"
              onClick={() => {
                setNewParams((prev) => !prev);
              }}
              disabled={disabled}
            >
              Apply
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
                  onPlaceSelect(place.id);
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
                    {place.rating}
                    &nbsp;
                    <img
                      className={styles.starIcon}
                      src={starIcon}
                      alt="star"
                    ></img>
                    &nbsp;
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
          <div className={styles.nextButtonContainer}>
            {(holdNPT || pageCount < currentPageMax) && (
              <button
                type="button"
                className={styles.nextButton}
                onClick={handleNextPage}
                disabled={loadingNext}
              >
                &gt;
              </button>
            )}
          </div>
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
