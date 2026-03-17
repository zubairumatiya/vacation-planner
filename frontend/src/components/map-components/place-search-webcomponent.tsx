import React, { useEffect, useState, useRef, useContext } from "react";
import styles from "../../styles/Map.module.css";
import starIcon from "../../assets/icons/star-icon.svg";
import addToList from "../../assets/icons/add-to-list.svg";
import added from "../../assets/icons/check-mark.svg";
import type { UniqueIdentifier } from "@dnd-kit/core";
import { AuthContext } from "../../context/AuthContext";
import { useParams } from "react-router-dom";
import refreshFn from "../../utils/refreshFn";

const apiURL = import.meta.env.VITE_API_URL;
const envValue = import.meta.env.VITE_ENVIRONMENT_VALUE;

const PlaceSearchWebComponent = ({
  onPlaceSelect,
  setPlaces,
  locationName,
  placeType,
  setSearchDisabled,
  submitButtonTrigger,
  viewport,
  list,
  handleSubmitItem,
  handleDeleteItem,
}: PlaceSearchProps) => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const { tripId } = useParams();
  const ratingRef = useRef<HTMLSelectElement>(null);
  const reviewCountRef = useRef<HTMLSelectElement>(null);
  const [newParams, setNewParams] = useState<boolean>(false);
  const [results, setResults] = useState<MapSearchPlace[]>([]);
  const [rememberFilter, setRememberFilter] = useState({
    rating: "",
    reviews: "",
  });
  const [holdNPT, setHoldNPT] = useState<string | undefined>("");
  const [pageCount, setPageCount] = useState<number>(1);
  const [loadingNext, setLoadingNext] = useState<boolean>(true);
  const [currentPageMax, setCurrentPageMax] = useState<number>(0);
  const [pageCountSwitch, setPageCountSwitch] = useState<boolean>(false);
  const [newPageRequest, setNewPageRequest] = useState<boolean>(false);
  const [holdRemainder, setHoldRemainder] = useState<MapSearchPlace[]>([]);
  const firstLoad = useRef<number>(0);
  const loggingOutRef = auth?.loggingOutRef;
  const placesContainerRef = useRef<HTMLDivElement>(null);

  const makePages = (arr: Array<object>) => {
    const total = newPageRequest
      ? holdRemainder.length + arr.length
      : arr.length;
    const pages = Math.floor(total / 10);
    const leftover = total % 10;
    return { pages, leftover };
  };

  useEffect(() => {
    if (loggingOutRef?.current) return;
    if (firstLoad.current < envValue) {
      firstLoad.current++;
      return;
    }
    async function getPlaces() {
      setLoadingNext(true);
      try {
        if (!ratingRef.current || !reviewCountRef.current) return;
        const res = await fetch(`${apiURL}/map`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
            viewport,
            tripId,
          }),
        });
        if (!res.ok) {
          if (res.status === 401) {
            const resData = (await res.json()) as ApiErrorResponse;
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

            if (loggingOutRef?.current) return;
            const continueReq: { token: string | null; err: boolean } =
              await refreshFn(apiURL, refreshInFlightRef);
            if (!continueReq.err) {
              if (login && continueReq.token) {
                login(String(continueReq.token));
              }
              const retryReq = await fetch(`${apiURL}/map`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${continueReq.token}`,
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
                  viewport,
                  tripId,
                }),
              });
              if (!retryReq.ok) {
                alert("Trouble completing request, please try again");
              } else if (retryReq.ok) {
                const data = (await retryReq.json()) as MapSearchResponse;
                setRememberFilter({
                  rating: ratingRef?.current?.value,
                  reviews: reviewCountRef?.current?.value,
                });
                setSearchDisabled(true);
                const pagesObj = makePages(data.places);
                if (pagesObj.leftover) {
                  setHoldRemainder(data.places.slice(-pagesObj.leftover));
                }
                if (newPageRequest) {
                  const arr = [
                    ...holdRemainder,
                    ...data.places.slice(0, pagesObj.pages * 10),
                  ];

                  if (!data.nextPageToken) {
                    if (pagesObj.leftover) {
                      pagesObj.pages += 1;
                    }
                    setResults((prev) => [
                      ...prev,
                      ...holdRemainder,
                      ...data.places,
                    ]);
                    setHoldRemainder([]);
                  } else {
                    setResults((prev) => [...prev, ...arr]);
                  }
                  setCurrentPageMax((prev) => prev + pagesObj.pages);
                  setNewPageRequest(false);
                } else {
                  if (!data.nextPageToken) {
                    if (pagesObj.leftover) {
                      pagesObj.pages += 1;
                    }
                    setHoldRemainder([]);
                  }
                  setResults(data.places);
                  setCurrentPageMax(pagesObj.pages);
                  setPageCount(1);
                }
                setPlaces(data.places.slice(0, 10));
                setHoldNPT(data.nextPageToken);
                setLoadingNext(false);
                placesContainerRef.current?.scrollTo(0, 0);
              }
            } else if (continueReq.err) {
              if (logout) {
                await logout();
              }
              return;
            }
          } else {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
        } else {
          const data = (await res.json()) as MapSearchResponse;
          setRememberFilter({
            rating: ratingRef?.current?.value,
            reviews: reviewCountRef?.current?.value,
          });
          setSearchDisabled(true);
          const pagesObj = makePages(data.places);
          if (pagesObj.leftover) {
            setHoldRemainder(data.places.slice(-pagesObj.leftover));
          }
          if (newPageRequest) {
            const arr = [
              ...holdRemainder,
              ...data.places.slice(0, pagesObj.pages * 10),
            ];

            if (!data.nextPageToken) {
              if (pagesObj.leftover) {
                pagesObj.pages += 1;
              }
              setResults((prev) => [...prev, ...holdRemainder, ...data.places]);
              setHoldRemainder([]);
            } else {
              setResults((prev) => [...prev, ...arr]);
            }
            setCurrentPageMax((prev) => prev + pagesObj.pages);
            setNewPageRequest(false);
          } else {
            if (!data.nextPageToken) {
              if (pagesObj.leftover) {
                pagesObj.pages += 1;
              }
              setHoldRemainder([]);
            }
            setResults(data.places);
            setCurrentPageMax(pagesObj.pages);
            setPageCount(1);
          }
          setPlaces(data.places.slice(0, 10));
          setHoldNPT(data.nextPageToken);
          setLoadingNext(false);
          placesContainerRef.current?.scrollTo(0, 0);
        }
      } catch (err) {
        console.error("Error fetching places:", err);
      }
    }

    getPlaces();
  }, [newParams, placeType, locationName, submitButtonTrigger, viewport]);

  //the only time we would reuse token is if a new page is requested, otherwise, upon any other change, we will be making a new req.
  const newPageTrigger = () => {
    setNewPageRequest(true);
    setNewParams((prev) => !prev);
  };

  useEffect(() => {
    setPlaces(results.slice(10 * (pageCount - 1), 10 * pageCount));
    placesContainerRef.current?.scrollTo(0, 0);
  }, [pageCountSwitch]);

  const checkDifferentSelection = () => {
    // can use this to check other setttings like placeType and location. We also have a state in parent to communicate with search bar to disable the submit button
    if (
      rememberFilter.rating !== ratingRef?.current?.value ||
      rememberFilter.reviews !== reviewCountRef?.current?.value
    ) {
      setSearchDisabled(false);
    } else {
      setSearchDisabled(true);
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
      setPageCount((prev) => prev + 1);
      newPageTrigger();
    } else {
      setPageCount((prev) => prev + 1);
      setPageCountSwitch((prev) => !prev);
    }
  };
  const handleListRemoval = (
    e: React.MouseEvent,
    placeId: UniqueIdentifier,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    handleDeleteItem(placeId, true);
  };

  const handleListAdd = (
    e: React.MouseEvent,
    placeId: UniqueIdentifier,
    placeName: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmitItem(placeName, placeId);
  };
  return (
    <>
      <div className={styles.listParentContainer}>
        <div className={styles.filterContainer}>
          <div>
            <p className={styles.filterHeader}>Filters</p>
          </div>
          <div className={styles.filterHeaderInnerContainer}>
            <div>
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
            </div>
            <div className={styles.reviewsFilterContainer}>
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
            </div>
          </div>
          <div></div>
        </div>

        <div className={styles.placesContainer} ref={placesContainerRef}>
          {results.slice(10 * (pageCount - 1), 10 * pageCount).map((place) => {
            return (
              <div
                key={place.id}
                id={place.id}
                className={styles.placeCard}
                onClick={() => {
                  onPlaceSelect(place.id);
                }}
              >
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
                  <div>
                    {list.find((v) => v.fromGoogle === place.id) ? (
                      <button
                        className={`${styles.addToListButton}`}
                        onClick={(e) => handleListRemoval(e, place.id)}
                      >
                        <img
                          src={added}
                          alt="itemAdded"
                          className={styles.addedIcon}
                        />
                      </button>
                    ) : (
                      <button
                        className={styles.addToListButton}
                        title={"Add to Want to See List"}
                        onClick={(e) =>
                          handleListAdd(
                            e,
                            place.id,
                            place?.displayName?.text ?? "undefined",
                          )
                        }
                      >
                        <img
                          src={addToList}
                          alt="addToListIcon"
                          className={styles.addToListIcon}
                        />
                      </button>
                    )}
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

export default React.memo(PlaceSearchWebComponent);
