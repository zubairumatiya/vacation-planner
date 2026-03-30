// Copyright (c) 2023 Vis.gl contributors
// Licensed under the MIT License

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";

import { PlaceDetailsMarker } from "../components/map-components/place-details-marker";
import { SchedulePinMarker } from "../components/map-components/schedule-pin-marker";
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
  scheduleItems: Schedule[];
  days: DayContainer[];
};

const MyMapComponent = ({
  bounds,
  startLocation,
  list,
  handleSubmitItem,
  handleDeleteItem,
  scheduleItems,
  days,
}: Props) => {
  const [places, setPlaces] = useState<MapSearchPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(
    undefined,
  );
  const [hoveredScheduleItemId, setHoveredScheduleItemId] = useState<
    string | undefined
  >(undefined);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSchedulePinHover = useCallback((id: string | undefined) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (id) {
      setHoveredScheduleItemId(id);
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredScheduleItemId(undefined);
      }, 50);
    }
  }, []);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  const allPinnableItems = useMemo(() => {
    return scheduleItems.filter(
      (item) => item.latitude != null && item.longitude != null && item.showOnMap,
    );
  }, [scheduleItems]);

  const schedulePlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of allPinnableItems) {
      if (item.placeId) ids.add(item.placeId);
    }
    return ids;
  }, [allPinnableItems]);

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
        isOverlap={schedulePlaceIds.has(place.id)}
      />
    ));
  }, [places, selectedPlaceId, detailsSize, schedulePlaceIds]);

  const filteredScheduleItems = useMemo(() => {
    if (!selectedDay) return allPinnableItems;
    return allPinnableItems.filter(
      (item) => item.startTime.toISOString().split("T")[0] === selectedDay,
    );
  }, [allPinnableItems, selectedDay]);

  const schedulePinMarkers = useMemo(() => {
    return filteredScheduleItems.map((item) => {
      const globalIndex = allPinnableItems.indexOf(item);
      const isOverlap = !!item.placeId && places.some((p) => p.id === item.placeId);
      return (
        <SchedulePinMarker
          key={String(item.id)}
          item={item}
          index={globalIndex + 1}
          selected={String(item.id) === hoveredScheduleItemId}
          onHover={handleSchedulePinHover}
          isOverlap={isOverlap}
          onClick={isOverlap ? () => setSelectedPlaceId(item.placeId!) : undefined}
        />
      );
    });
  }, [filteredScheduleItems, allPinnableItems, hoveredScheduleItemId, places]);

  const handleMapClick = useCallback(() => {
    setSelectedPlaceId(undefined);
    setHoveredScheduleItemId(undefined);
  }, []);

  return (
    <APIProvider apiKey={API_KEY}>
      <div
        className={styles.gPlaces}
        style={{ colorScheme: colorScheme.current }}
      >
        <div className={styles.mapContainer}>
          <SearchBar
            placeType={placeType}
            setPlaceType={setPlaceType}
            setLocationName={setLocationName}
            locationName={locationName}
            searchDisabled={searchDisabled}
            setSearchDisabled={setSearchDisabled}
            setSubmitButtonTrigger={setSubmitButtonTrigger}
            setViewport={setViewport}
          />

          <div className={styles.listAndMap}>
            <div className={styles.placeListWrapper}>
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
                days={days}
                selectedDay={selectedDay}
                onDaySelect={setSelectedDay}
              />
            </div>
            <div className={styles.mapWrapper}>
              <Map {...MAP_CONFIG} onClick={handleMapClick}>
                {placeMarkers}
                {schedulePinMarkers}
              </Map>
            </div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
};
export default MyMapComponent;
