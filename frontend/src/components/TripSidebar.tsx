import { useState, useEffect, useRef, useCallback } from "react";
import styles from "../styles/TripSidebar.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

interface CountryPlace {
  id: string;
  userCountryId: string;
  category: "city" | "eat" | "stay" | "excursion";
  name: string;
  isFavorite: boolean;
  isPuke: boolean;
  note: string | null;
  sortIndex: number;
  cityId: string | null;
}

interface SidebarTrip {
  id: string;
  tripName: string;
  role: "owner" | "editor" | "reader";
}

interface SidebarScheduleItem {
  id: string;
  location: string;
  details: string;
  startTime: string;
}

const CATEGORIES = [
  { key: "city" as const, label: "Cities" },
  { key: "eat" as const, label: "Places to Eat" },
  { key: "stay" as const, label: "Places to Stay" },
  { key: "excursion" as const, label: "Excursions" },
];

const mapTrip = (raw: Record<string, unknown>): SidebarTrip => ({
  id: raw.id as string,
  tripName: (raw.tripName ?? raw.trip_name) as string,
  role: raw.role as "owner" | "editor" | "reader",
});

const mapScheduleItem = (
  raw: Record<string, unknown>,
): SidebarScheduleItem => ({
  id: (raw.id ?? raw.Id) as string,
  location: (raw.location ?? "") as string,
  details: (raw.details ?? "") as string,
  startTime: (raw.startTime ?? raw.start_time ?? "") as string,
});

const formatSidebarDate = (dateKey: string) => {
  const d = new Date(dateKey + "T12:00:00Z");
  const mon = d.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = d.getUTCDate();
  const dow = d.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  return `${mon} ${day} ${dow}`;
};

const formatTime = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

interface TripSidebarProps {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  userCountryId: string;
  onPlaceAdded: (place: CountryPlace) => void;
}

const TripSidebar = ({
  authFetch,
  userCountryId,
  onPlaceAdded,
}: TripSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [trips, setTrips] = useState<SidebarTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTripName, setSelectedTripName] = useState("");
  const [scheduleItems, setScheduleItems] = useState<SidebarScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [addToLogOpenId, setAddToLogOpenId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch trips on first open
  useEffect(() => {
    if (!isOpen || trips.length > 0 || loadingTrips) return;
    setLoadingTrips(true);
    authFetch(`${apiUrl}/home`)
      .then((r) => r.json())
      .then((data) => {
        setTrips((data as Record<string, unknown>[]).map(mapTrip));
      })
      .catch(() => {})
      .finally(() => setLoadingTrips(false));
  }, [isOpen]);

  // Fetch schedule when a trip is selected
  useEffect(() => {
    if (!selectedTripId) return;
    setLoadingSchedule(true);
    setScheduleItems([]);
    setExpandedItemIds(new Set());
    setAddToLogOpenId(null);
    authFetch(`${apiUrl}/schedule/${selectedTripId}`)
      .then((r) => r.json())
      .then((data: TripScheduleResponse) => {
        setScheduleItems(
          (data.schedule || []).map((item) =>
            mapScheduleItem(item as unknown as Record<string, unknown>),
          ),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingSchedule(false));
  }, [selectedTripId]);

  // Click outside to close category dropdown
  useEffect(() => {
    if (!addToLogOpenId) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setAddToLogOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addToLogOpenId]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddToLog = async (
    item: SidebarScheduleItem,
    category: "city" | "eat" | "stay" | "excursion",
  ) => {
    setAddToLogOpenId(null);
    try {
      const res = await authFetch(
        `${apiUrl}/travel-log/${userCountryId}/places`,
        {
          method: "POST",
          body: JSON.stringify({ category, name: item.location }),
        },
      );
      if (!res.ok && res.status !== 201) return;
      const data = await res.json();
      const newPlace = data.place;

      if (item.details) {
        const noteRes = await authFetch(
          `${apiUrl}/travel-log/places/${newPlace.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ note: item.details }),
          },
        );
        if (noteRes.ok) {
          newPlace.note = item.details;
        }
      }

      onPlaceAdded({
        id: newPlace.id as string,
        userCountryId: newPlace.user_country_id as string,
        category: newPlace.category as CountryPlace["category"],
        name: newPlace.name as string,
        isFavorite: newPlace.is_favorite as boolean,
        isPuke: newPlace.is_puke as boolean,
        note: (newPlace.note as string) || null,
        sortIndex: newPlace.sort_index as number,
      });
    } catch {
      // handled
    }
  };

  const handleSelectTrip = (trip: SidebarTrip) => {
    setSelectedTripId(trip.id);
    setSelectedTripName(trip.tripName);
  };

  const handleBack = () => {
    setSelectedTripId(null);
    setSelectedTripName("");
    setScheduleItems([]);
  };

  // Group schedule items by date
  const groupedByDate: Record<string, SidebarScheduleItem[]> = {};
  for (const item of scheduleItems) {
    if (!item.startTime) continue;
    const dateKey = item.startTime.slice(0, 10);
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(item);
  }
  const sortedDates = Object.keys(groupedByDate).sort();

  const myTrips = trips.filter((t) => t.role === "owner");
  const sharedTrips = trips.filter((t) => t.role !== "owner");

  return (
    <div className={styles.sidebar}>
      <button
        type="button"
        className={`${styles.tab} ${isOpen ? styles.tabOpen : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close trip sidebar" : "Open trip sidebar"}
      >
        {!isOpen ? (
          <svg
            fill="#2fe782"
            width="1.2rem"
            height="1.2rem"
            viewBox="0 0 15 15"
            xmlns="http://www.w3.org/2000/svg"
            id="arrow"
          >
            <path d="M8.29289 2.29289C8.68342 1.90237 9.31658 1.90237 9.70711 2.29289L14.2071 6.79289C14.5976 7.18342 14.5976 7.81658 14.2071 8.20711L9.70711 12.7071C9.31658 13.0976 8.68342 13.0976 8.29289 12.7071C7.90237 12.3166 7.90237 11.6834 8.29289 11.2929L11 8.5H1.5C0.947715 8.5 0.5 8.05228 0.5 7.5C0.5 6.94772 0.947715 6.5 1.5 6.5H11L8.29289 3.70711C7.90237 3.31658 7.90237 2.68342 8.29289 2.29289Z" />
          </svg>
        ) : (
          <svg
            fill="#2fe782"
            width="1.2rem"
            height="1.2rem"
            viewBox="0 0 15 15"
            xmlns="http://www.w3.org/2000/svg"
            id="arrow"
            version="1.1"
            transform="matrix(-1,0,0,1,0,0)"
          >
            <path d="M8.29289 2.29289C8.68342 1.90237 9.31658 1.90237 9.70711 2.29289L14.2071 6.79289C14.5976 7.18342 14.5976 7.81658 14.2071 8.20711L9.70711 12.7071C9.31658 13.0976 8.68342 13.0976 8.29289 12.7071C7.90237 12.3166 7.90237 11.6834 8.29289 11.2929L11 8.5H1.5C0.947715 8.5 0.5 8.05228 0.5 7.5C0.5 6.94772 0.947715 6.5 1.5 6.5H11L8.29289 3.70711C7.90237 3.31658 7.90237 2.68342 8.29289 2.29289Z"></path>
          </svg>
        )}
      </button>
      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            {selectedTripId ? "Trip Schedule" : "Trips"}
          </div>
          <div className={styles.panelBody}>
            {!selectedTripId ? (
              <>
                {loadingTrips && (
                  <p className={styles.loadingText}>Loading...</p>
                )}

                {!loadingTrips && (
                  <>
                    <div className={styles.sectionLabel}>My Trips</div>
                    {myTrips.length === 0 && (
                      <p className={styles.emptyText}>No trips</p>
                    )}
                    {myTrips.map((trip) => (
                      <button
                        key={trip.id}
                        type="button"
                        className={styles.tripRow}
                        onClick={() => handleSelectTrip(trip)}
                      >
                        {trip.tripName}
                      </button>
                    ))}

                    <div className={styles.sectionLabel}>Shared With Me</div>
                    {sharedTrips.length === 0 && (
                      <p className={styles.emptyText}>No shared trips</p>
                    )}
                    {sharedTrips.map((trip) => (
                      <button
                        key={trip.id}
                        type="button"
                        className={styles.tripRow}
                        onClick={() => handleSelectTrip(trip)}
                      >
                        {trip.tripName}
                      </button>
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={handleBack}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 1 2 5 6 9" />
                  </svg>
                  Back
                </button>
                <div className={styles.tripName}>{selectedTripName}</div>

                {loadingSchedule && (
                  <p className={styles.loadingText}>Loading schedule...</p>
                )}

                {!loadingSchedule && scheduleItems.length === 0 && (
                  <p className={styles.emptyText}>No schedule items</p>
                )}

                {!loadingSchedule &&
                  sortedDates.map((dateKey) => (
                    <div key={dateKey}>
                      <div className={styles.dateHeader}>
                        {formatSidebarDate(dateKey)}
                      </div>
                      {groupedByDate[dateKey].map((item) => {
                        const hasDetails = !!item.details;
                        const isExpanded = expandedItemIds.has(item.id);
                        const isDropdownOpen = addToLogOpenId === item.id;

                        return (
                          <div key={item.id} className={styles.scheduleItem}>
                            <div className={styles.scheduleRow}>
                              {hasDetails ? (
                                <button
                                  type="button"
                                  className={`${styles.dropdownBtn} ${isExpanded ? styles.dropdownBtnOpen : ""}`}
                                  onClick={() => toggleExpanded(item.id)}
                                  aria-label="Toggle details"
                                >
                                  &#9660;
                                </button>
                              ) : (
                                <span className={styles.dropdownPlaceholder} />
                              )}
                              <span className={styles.scheduleTime}>
                                {item.startTime
                                  ? formatTime(item.startTime)
                                  : ""}
                              </span>
                              <span className={styles.scheduleLocation}>
                                {item.location}
                              </span>
                              <div
                                className={styles.addToLogWrapper}
                                ref={isDropdownOpen ? dropdownRef : undefined}
                              >
                                <button
                                  type="button"
                                  className={styles.addToLogBtn}
                                  onClick={() =>
                                    setAddToLogOpenId(
                                      isDropdownOpen ? null : item.id,
                                    )
                                  }
                                >
                                  + Log
                                </button>
                                {isDropdownOpen && (
                                  <div className={styles.categoryDropdown}>
                                    {CATEGORIES.map((cat) => (
                                      <button
                                        key={cat.key}
                                        type="button"
                                        className={styles.categoryOption}
                                        onClick={() =>
                                          handleAddToLog(item, cat.key)
                                        }
                                      >
                                        {cat.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            {hasDetails && isExpanded && (
                              <div className={styles.itemDetails}>
                                {item.details}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripSidebar;
