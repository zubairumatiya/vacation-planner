import { useCallback, memo } from "react";
import {
  AdvancedMarker,
  InfoWindow,
  Pin,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import styles from "../../styles/SchedulePin.module.css";

interface SchedulePinMarkerProps {
  item: Schedule;
  index: number;
  selected: boolean;
  onHover: (id: string | undefined) => void;
  isOverlap?: boolean;
  onClick?: () => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export const SchedulePinMarker = memo(
  ({ item, index, selected, onHover, isOverlap, onClick }: SchedulePinMarkerProps) => {
    const [markerRef, marker] = useAdvancedMarkerRef();

    const handleMouseEnter = useCallback(() => {
      onHover(String(item.id));
    }, [onHover, item.id]);

    const handleMouseLeave = useCallback(() => {
      onHover(undefined);
    }, [onHover]);

    const handleCloseClick = useCallback(() => {
      onHover(undefined);
    }, [onHover]);

    return (
      <>
        <AdvancedMarker
          ref={markerRef}
          position={{
            lat: item.latitude!,
            lng: item.longitude!,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => { handleMouseEnter(); onClick?.(); }}
        >
          <Pin
            background={isOverlap ? "#ef4444" : "#22c55e"}
            borderColor={isOverlap ? "#22c55e" : "#16a34a"}
            glyphColor={isOverlap ? "#22c55e" : "white"}
          >
            <span className={styles.pinNumber} style={isOverlap ? { color: "#22c55e" } : undefined}>
              {index}
            </span>
          </Pin>
        </AdvancedMarker>
        {selected && (
          <InfoWindow
            anchor={marker}
            onCloseClick={handleCloseClick}
            headerDisabled={true}
            minWidth={200}
            maxWidth={300}
          >
            <div
              className={styles.tooltipContent}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <p className={styles.tooltipName}>{item.location}</p>
              <p className={styles.tooltipDate}>
                {formatDate(item.startTime)}
              </p>
              <p className={styles.tooltipTime}>
                {formatTime(item.startTime)} – {formatTime(item.endTime)}
              </p>
              {item.details && (
                <p className={styles.tooltipDetails}>{item.details}</p>
              )}
            </div>
          </InfoWindow>
        )}
      </>
    );
  },
);
SchedulePinMarker.displayName = "SchedulePinMarker";
