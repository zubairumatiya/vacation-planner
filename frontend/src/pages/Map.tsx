// Copyright (c) 2023 Vis.gl contributors
// Licensed under the MIT License

import { useState, useMemo, useEffect, useRef } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";

import { PlaceDetailsMarker } from "../components/map-components/place-details-marker";
import PlaceSearchWebComponent from "../components/map-components/place-search-webcomponent";
import { SearchBar } from "../components/map-components/search-bar";

import styles from "../styles/Map.module.css";

const API_KEY = import.meta.env.VITE_MAPS_API_KEY;

if (!API_KEY) {
  console.error("Missing Google Maps API key");
}

export type DetailsSize = "FULL" | "COMPACT";
export type ColorScheme = "light" | "dark";

const MAP_CONFIG = {
  defaultBounds: { south: 0, west: 0, north: 0, east: 0 },
  mapId: "49ae42fed52588c3",
  gestureHandling: "greedy" as const,
  disableDefaultUI: true,
  clickableIcons: false,
};

type Props = {
  bounds: Vp | null;
  startLocation: string;
  list: Item[];
  handleSubmitItem: WantToSeeListProps["handleSubmitItem"];
  handleDeleteItem: WantToSeeListProps["handleDeleteItem"];
};

const MyMapComponent = ({
  bounds,
  startLocation,
  list,
  handleSubmitItem,
  handleDeleteItem,
}: Props) => {
  const [places, setPlaces] = useState<MapSearchPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(
    undefined,
  );

  const [locationName, setLocationName] = useState<string>(startLocation ?? "");
  const [placeType, setPlaceType] = useState<PlaceType>("restaurant");
  const [searchDisabled, setSearchDisabled] = useState<boolean>(false);
  const [submitButtonTrigger, setSubmitButtonTrigger] =
    useState<boolean>(false);
  const [viewport, setViewport] = useState<Viewport | null>(() =>
    bounds
      ? toViewport(bounds)
      : {
          high: { latitude: 0, longitude: 0 },
          low: { latitude: 0, longitude: 0 },
        },
  );
  const colorScheme = useRef<ColorScheme>("light"); //if we incorporate changing colors in the future, a state hook would work better
  const detailsSize = useRef<DetailsSize>("FULL");

  useEffect(() => {
    if (bounds) {
      MAP_CONFIG.defaultBounds = bounds;
    }
  }, []);

  function toViewport(bounds: Vp): Viewport {
    return {
      low: { latitude: bounds.south, longitude: bounds.west },
      high: { latitude: bounds.north, longitude: bounds.east },
    };
  }

  // Memoize the place markers to prevent unnecessary re-renders
  // Only recreate when places, selection, or details size changes
  const placeMarkers = useMemo(() => {
    return places.map((place, index) => (
      <PlaceDetailsMarker
        detailsSize={"FULL"}
        key={place.id || index}
        selected={place.id === selectedPlaceId}
        place={place}
        onClick={() => setSelectedPlaceId(place.id)}
      />
    ));
  }, [places, selectedPlaceId, detailsSize]);

  return (
    <APIProvider apiKey={API_KEY}>
      <div
        className={styles.gPlaces}
        style={{ colorScheme: colorScheme.current }}
      >
        <div className={styles.mapContainer}>
          {/*
            SearchBar allows users to:
            - Select the type of place they want to find
            - Search for a specific location to center the map on
          */}
          <SearchBar
            placeType={placeType}
            setPlaceType={setPlaceType}
            setLocationName={setLocationName}
            locationName={locationName}
            searchDisabled={searchDisabled}
            setSubmitButtonTrigger={setSubmitButtonTrigger}
            setViewport={setViewport}
          />

          <div className={styles.listAndMap}>
            <div className={styles.placeListWrapper}>
              {/*
            PlaceSearchtWebComponent displays a list of places based on:
            - The selected place type (restaurant, cafe, etc.)
            - The current map location and bounds
          */}
              <PlaceSearchWebComponent
                placeType={placeType}
                locationName={locationName}
                setPlaces={setPlaces}
                onPlaceSelect={setSelectedPlaceId}
                setSearchDisabled={setSearchDisabled}
                submitButtonTrigger={submitButtonTrigger}
                viewport={viewport}
                list={list}
                handleSubmitItem={handleSubmitItem}
                handleDeleteItem={handleDeleteItem}
              />
            </div>
            {/*
            The Map component renders the Google Map
            Clicking on the map background will deselect any selected place
            */}
            <div className={styles.mapWrapper}>
              <Map
                {...MAP_CONFIG}
                onClick={() => setSelectedPlaceId(undefined)}
              >
                {placeMarkers}
              </Map>
            </div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
};
export default MyMapComponent;
