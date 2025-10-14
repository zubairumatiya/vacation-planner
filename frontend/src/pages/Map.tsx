// Copyright (c) 2023 Vis.gl contributors
// Licensed under the MIT License

import { useState, useMemo } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";

import { PlaceDetailsMarker } from "../components/map-components/place-details-marker";
import { PlaceSearchWebComponent } from "../components/map-components/place-search-webcomponent";
import { SearchBar } from "../components/map-components/search-bar";
// This registers ALL `<gmp-...>` components globally

//import ControlPanel from '../components/map-components/place-details-marker';
import styles from "../styles/Map.module.css";

const API_KEY = import.meta.env.VITE_MAPS_API_KEY;

if (!API_KEY) {
  console.error("Missing Google Maps API key");
}

export type DetailsSize = "FULL" | "COMPACT";
export type ColorScheme = "light" | "dark";

const MAP_CONFIG = {
  defaultZoom: 15,
  defaultCenter: { lat: 30.26, lng: -97.74 },
  mapId: "49ae42fed52588c3",
  gestureHandling: "greedy" as const,
  disableDefaultUI: true,
  clickableIcons: false,
};

const MyMapComponent = () => {
  const [places, setPlaces] = useState<google.maps.places.Place[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>("Austin");
  const [placeType, setPlaceType] = useState<PlaceType>("restaurant");
  const [detailsSize, setDetailsSize] = useState<DetailsSize>("FULL");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("light");

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
    // APIProvider sets up the Google Maps JavaScript API with the specified key
    // Using 'alpha' version to access the latest features including UI Kit components
    <APIProvider apiKey={API_KEY}>
      <div className={styles.placesUiKit} style={{ colorScheme: colorScheme }}>
        <div className={styles.placeListWrapper}>
          {/*
            PlaceSearchtWebComponent displays a list of places based on:
            - The selected place type (restaurant, cafe, etc.)
            - The current map location and bounds
          */}
          <PlaceSearchWebComponent
            placeType={placeType}
            locationId={locationId}
            locationName={locationName}
            setPlaces={setPlaces}
            onPlaceSelect={(place) => setSelectedPlaceId(place?.id ?? null)}
          />
        </div>

        <div className={styles.mapContainer}>
          {/*
            The Map component renders the Google Map
            Clicking on the map background will deselect any selected place
          */}
          <Map {...MAP_CONFIG} onClick={() => setSelectedPlaceId(null)}>
            {placeMarkers}
          </Map>

          {/*
            SearchBar allows users to:
            - Select the type of place they want to find
            - Search for a specific location to center the map on
          */}
          <SearchBar
            placeType={placeType}
            setPlaceType={setPlaceType}
            setLocationId={setLocationId}
            setLocationName={setLocationName}
          />

          {/*
            ControlPanel provides UI controls for adjusting the size of place details
            displayed in the InfoWindow
          */}
          {/*

              <ControlPanel
              detailsSize={detailsSize}
              onDetailSizeChange={setDetailsSize}
              colorScheme={colorScheme}
              onColorSchemeChange={setColorScheme}
              />
            */}
        </div>
      </div>
    </APIProvider>
  );
};
export default MyMapComponent;

{
  /*
    import { APIProvider } from "@vis.gl/react-google-maps";
    
    const API_KEY = import.meta.env.VITE_MAPS_API_KEY;
    
    export const PlaceTextSearchMinimal = () => {
        return (
            <APIProvider apiKey={API_KEY} version="beta" libraries={["places"]}>
            <div style={{ padding: "1rem", border: "1px solid gray" }}>
            <h2>Text Search Minimal</h2>
            
            <gmp-place-search
            ongmp-load={(e: any) => {
                console.log("✅ gmp-place-search loaded");
            }}
            // Listen for text search responses at the parent
            onGmpPlacestextsearchresponse={(ev: any) =>
            console.log("✅ Text search response (bubbled):", ev.detail)
        }
        >
        <gmp-place-text-search-request
        text-query="coffee in Austin"
        ></gmp-place-text-search-request>
        
        <gmp-place-all-content></gmp-place-all-content>
        </gmp-place-search>
        </div>
        </APIProvider>
    );
};

export default PlaceTextSearchMinimal;

*/
}
