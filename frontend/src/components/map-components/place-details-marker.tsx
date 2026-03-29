import { useCallback, memo } from "react";
import {
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

export const PlaceDetailsMarker = memo(
  ({ place, selected, onClick, detailsSize }: PlaceDetailsMarkerProps) => {
    const [markerRef, marker] = useAdvancedMarkerRef();
    useMapsLibrary("places");

    const handleMarkerClick = useCallback(() => {
      onClick(place?.id);
    }, [onClick, place.id]);

    // Handle info window close by deselecting this place
    const handleCloseClick = useCallback(() => {
      onClick(undefined);
    }, [onClick]);

    return (
      <>
        <AdvancedMarker
          ref={markerRef}
          position={{
            lat: place?.location?.latitude ?? 0,
            lng: place?.location?.longitude ?? 0,
          }}
          onClick={handleMarkerClick}
        />
        {selected && (
          <InfoWindow
            anchor={marker}
            onCloseClick={handleCloseClick}
            minWidth={250}
            maxWidth={400}
            headerDisabled={true}
          >
            {detailsSize === "FULL" ? (
              <gmp-place-details>
                <gmp-place-details-place-request
                  place={place.id ?? ""}
                ></gmp-place-details-place-request>
                <gmp-place-all-content></gmp-place-all-content>
              </gmp-place-details>
            ) : (
              <gmp-place-details-compact>
                <gmp-place-details-place-request
                  place={place.id ?? ""}
                ></gmp-place-details-place-request>
                <gmp-place-all-content></gmp-place-all-content>
              </gmp-place-details-compact>
            )}
          </InfoWindow>
        )}
      </>
    );
  },
);
PlaceDetailsMarker.displayName = "PlaceDetailsMarker";
