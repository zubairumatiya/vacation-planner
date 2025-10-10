import { useEffect, useRef, useCallback } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import styles from "../../styles/Map.module.css";

export const PlaceSearchWebComponent = ({
  onPlaceSelect,
  setPlaces,
  locationId,
  placeType,
}: PlaceSearchProps) => {
  // Load required Google Maps libraries
  const placesLib = useMapsLibrary("places");
  const geoLib = useMapsLibrary("geometry");

  const map = useMap();

  // Use ref to interact with the DOM Web Component
  const placeSearchRef = useRef<PlaceSearchElement | null>(null);

  const placeTextSearchRequestRef =
    useRef<PlaceTextSearchRequestElement | null>(null);

  // Calculate a circular region based on the map's current bounds
  // This is used to restrict the places search to the visible map area
  const getContainingCircle = useCallback(
    (bounds?: google.maps.LatLngBounds) => {
      if (!bounds || !geoLib) return undefined;

      // Calculate diameter between the northeast and southwest corners of the bounds
      const diameter = geoLib.spherical.computeDistanceBetween(
        bounds.getNorthEast(),
        bounds.getSouthWest()
      );
      const calculatedRadius = diameter / 2;

      // Cap the radius at 50km to avoid exceeding Google Maps API limits
      const cappedRadius = Math.min(calculatedRadius, 50000);
      return { center: bounds.getCenter(), radius: cappedRadius };
    },
    [geoLib]
  );

  useEffect(() => {
    if (
      !placesLib ||
      !geoLib ||
      !placeSearchRef.current ||
      !placeTextSearchRequestRef.current ||
      !map
    ) {
      return;
    }

    const placeTextSearchRequest = placeTextSearchRequestRef.current;

    const bounds = map.getBounds();
    const circle = getContainingCircle(bounds);

    if (!circle) return;
    //placeTextSearchRequest.pageSize = 60;
    //placeTextSearchRequest.maxResultCount = 20;
    //placeTextSearchRequest.rankPreference = "POPULARITY";
    placeTextSearchRequest.locationRestriction = circle;

    //placeTextSearchRequest.includedPrimaryTypes = placeType
    //  ? [placeType]
    //  : undefined;
  }, [placesLib, geoLib, map, placeType, getContainingCircle, locationId]);

  // Return the Google Maps Place List Web Component
  // This component is rendered as a custom HTML element (Web Component) provided by Google
  return (
    <div className={styles.placeListContainer}>
      {/* 
        gmp-place-list is a Google Maps Platform Web Component that displays a list of places
        - 'selectable' enables click-to-select functionality
        - When a place is selected, the ongmp-placeselect event is fired
      */}
      <gmp-place-search // i think this is where ideally we can filter via stars and # of ratings - google.maps.places.Place.userRatingCount -- google.maps.places.Place.rating
        selectable
        truncation-preferred
        ref={placeSearchRef}
        ongmp-select={(event: { place: google.maps.places.Place | null }) => {
          onPlaceSelect(event.place);
        }}
        ongmp-load={(event: { target: PlaceSearchElement }) => {
          setPlaces(event.target.places);
        }}
      >
        {/*<gmp-place-nearby-search-request
          ref={placeNearbySearchRequestRef}
        ></gmp-place-nearby-search-request>*/}
        <gmp-place-text-search-request
          ref={placeTextSearchRequestRef}
        ></gmp-place-text-search-request>
        <gmp-place-all-content></gmp-place-all-content>
      </gmp-place-search>
    </div>
  );
};

/**
 * Augments the React JSX namespace to add type definitions for the
 * Places UI Kit  web components. This provides
 * type-checking and autocompletion for their props, including custom
 * events, within JSX.
 */
