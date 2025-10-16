import { useState, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

const API_KEY = import.meta.env.VITE_MAPS_API_KEY;
const apiURL = import.meta.env.VITE_API_URL;

const MAP_CONFIG = {
  defaultZoom: 15,
  defaultCenter: { lat: 30.26, lng: -97.74 },
  mapId: "49ae42fed52588c3",
  gestureHandling: "greedy" as const,
  disableDefaultUI: true,
  clickableIcons: false,
};

export const Test = () => {
  const [results, setResults] = useState<google.maps.places.PlaceResult[]>([]);

  useMapsLibrary("places");
  useEffect(() => {
    async function getPlaces() {
      try {
        const res = await fetch(`${apiURL}/map`); // can add in the request body the number of stars (minRating)
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log(data.results[0].geometry.location);
        setResults(data.results);
      } catch (err) {
        console.error("Error fetching places:", err);
      }
    }

    getPlaces();
  }, []);
  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      <div>
        {results.map((place) => (
          <div key={place.place_id}>
            {place.name} — {place.formatted_address}
          </div>
        ))}
      </div>

      <Map {...MAP_CONFIG}>
        {results.map((place) => (
          <AdvancedMarker
            key={place.place_id}
            position={place.geometry?.location}
          />
        ))}
      </Map>
    </APIProvider>
  );
};

export default Test;

{
  /*if (!data.next_page_token) {
          // turned it off with ! to avoid extra use
          console.log(data.next_page_token);
          await new Promise((r) => setTimeout(r, 2000));
          const res2 = await fetch(`${url}&pagetoken=${data.next_page_token}`);
          const data2 = await res2.json();
          console.log(
            "\n\n\n\n\n~~~~~~~~~~~~~  NEW PAGE ~~~~~~~~~~~~~~~\n\n\n\n\n\n"
          );
          const storeNames2 = data2.results.map((v) => console.log(v.name));
        } */
}

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
