import {
  useEffect,
  useState,
  useContext,
  useRef,
  useMemo,
  startTransition,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  type Latitude,
  type Longitude,
  type PreparedFeature,
} from "@vnedyalk0v/react19-simple-maps";
import styles from "../styles/WorldMapPage.module.css";

const geoUrl = new URL("/features.json", window.location.origin).toString();
const apiUrl = import.meta.env.VITE_API_URL;

interface UserCountry {
  id: string;
  countryId: number;
  countryName: string;
  continent: string;
  visibility: "public" | "friends" | "private";
  visitDate: string | null;
  numDays: number | null;
}

const mapUserCountry = (raw: Record<string, unknown>): UserCountry => ({
  id: raw.id as string,
  countryId: raw.country_id as number,
  countryName: raw.country_name as string,
  continent: raw.continent as string,
  visibility: raw.visibility as "public" | "friends" | "private",
  visitDate: (raw.visit_date as string) || null,
  numDays: (raw.num_days as number) ?? null,
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return dateStr;
};

// Map GeoJSON abbreviated/special names → full DB-friendly names (lowercase)
const geoNameMap: Record<string, string> = {
  "united states of america": "united states",
  "dominican rep.": "dominican republic",
  "dem. rep. congo": "democratic republic of the congo",
  "central african rep.": "central african republic",
  "bosnia and herz.": "bosnia and herzegovina",
  "eq. guinea": "equatorial guinea",
  "côte d'ivoire": "ivory coast",
  "s. sudan": "south sudan",
  "solomon is.": "solomon islands",
  "falkland is.": "falkland islands",
  "timor-leste": "east timor",
  "czechia": "czech republic",
  "eswatini": "eswatini",
  "n. cyprus": "northern cyprus",
  "w. sahara": "western sahara",
  "fr. s. antarctic lands": "french southern territories",
};

const normalizeGeoName = (geoName: string): string => {
  const lower = geoName.toLowerCase();
  return geoNameMap[lower] ?? lower;
};

const WorldMapPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapFrameRef = useRef<HTMLDivElement>(null);

  const [travelLog, setTravelLog] = useState<UserCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipContent, setTooltipContent] = useState("");
  const [hoveredCountry, setHoveredCountry] = useState<UserCountry | null>(
    null,
  );
  const tooltipPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [profileName, setProfileName] = useState("");
  const [pendingCountry, setPendingCountry] = useState<{
    id: number;
    name: string;
    continent: string;
  } | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [visitMonth, setVisitMonth] = useState("");
  const [visitYear, setVisitYear] = useState("");
  const [numDays, setNumDays] = useState("");

  const isOwner = userId === auth?.userId;

  const visitedMap = useMemo(() => {
    const map = new Map<string, UserCountry>();
    travelLog.forEach((c) => map.set(c.countryName.toLowerCase(), c));
    return map;
  }, [travelLog]);

  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const loggingOutRef = auth?.loggingOutRef;

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    let res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      const body = await res.json().catch(() => ({}));
      if (body.error === "JwtError") {
        await logout?.();
        throw new Error("Invalid token");
      }
      if (loggingOutRef?.current) throw new Error("Logging out");
      const result = await refreshFn(apiUrl, refreshInFlightRef!);
      if (result.err || !result.token) {
        await logout?.();
        throw new Error("Refresh failed");
      }
      login?.(result.token);
      headers.Authorization = `Bearer ${result.token}`;
      res = await fetch(url, { ...options, headers });
    }
    return res;
  };

  useEffect(() => {
    if (loggingOutRef?.current || !userId || !token) return;
    const loadData = async () => {
      try {
        const profileUrl = isOwner
          ? `${apiUrl}/profile`
          : `${apiUrl}/users/${userId}/profile`;
        const profileRes = await authFetch(profileUrl);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfileName(data.first_name || data.firstName || "User");
        }

        const url = isOwner
          ? `${apiUrl}/travel-log`
          : `${apiUrl}/travel-log/${userId}`;
        const res = await authFetch(url);
        if (res.ok) {
          const data = await res.json();
          setTravelLog(
            (data.countries as Record<string, unknown>[]).map(mapUserCountry),
          );
        }
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, token, isOwner]);

  const clearForm = () => {
    setPendingCountry(null);
    setPopupPos(null);
    setVisitMonth("");
    setVisitYear("");
    setNumDays("");
  };

  const handleCountryClick = async (
    geoName: string,
    event: React.MouseEvent,
  ) => {
    if (!isOwner) return;

    const normalized = normalizeGeoName(geoName);
    if (visitedMap.has(normalized)) return;

    const searchName = geoNameMap[geoName.toLowerCase()] ?? geoName;

    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    try {
      const res = await authFetch(
        `${apiUrl}/countries/search?q=${encodeURIComponent(searchName)}`,
      );
      if (res.ok) {
        const data = await res.json();
        const match = data.countries[0];
        if (match) {
          setVisitMonth("");
          setVisitYear("");
          setNumDays("");
          setPendingCountry(match);
          setPopupPos({ x, y });
          startTransition(() => {
            setTooltipContent("");
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Single mousemove listener for hover — avoids flicker from mouseenter/leave gaps
  const lastGeoRef = useRef<string | null>(null);
  useEffect(() => {
    const frame = mapFrameRef.current;
    if (!frame) return;

    let active = false;
    // Delay listener activation so react-tooltip can initialize position tracking;
    // without this, tooltips flash at (0,0) on initial load.
    const timer = setTimeout(() => {
      active = true;
    }, 500);

    const onMouseMove = (e: MouseEvent) => {
      if (!active) return;
      // Move tooltip element directly via ref for zero-lag positioning
      if (tooltipRef.current) {
        tooltipRef.current.style.left = `${e.clientX}px`;
        tooltipRef.current.style.top = `${e.clientY - 12}px`;
      }
      const target = e.target;
      if (!(target instanceof Element)) return;
      const path = target.closest("[data-geo]");
      const name = path?.getAttribute("data-geo") || null;
      if (name && name !== lastGeoRef.current) {
        lastGeoRef.current = name;
        const normalized = normalizeGeoName(name);
        const matched =
          visitedMap.get(normalized) ||
          visitedMap.get(name.toLowerCase()) ||
          null;
        setTooltipContent(name);
        setHoveredCountry(matched);
      }
    };

    const onMouseLeave = () => {
      lastGeoRef.current = null;
      setTooltipContent("");
      setHoveredCountry(null);
    };

    frame.addEventListener("mousemove", onMouseMove);
    frame.addEventListener("mouseleave", onMouseLeave);
    return () => {
      clearTimeout(timer);
      frame.removeEventListener("mousemove", onMouseMove);
      frame.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [visitedMap]);

  if (loading) {
    return <div className={styles.loading}>Loading map...</div>;
  }

  const visitedCount = travelLog.length;
  const isVisited = !!hoveredCountry;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          onClick={() => navigate(-1)}
          className={styles.backBtn}
          aria-label="Go Back"
        >
          <svg
            width="2.5rem"
            height="2.5rem"
            viewBox="0 0 23 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              {" "}
              <path
                d="M10.25 9.02615L9.50135 8.9811C9.50045 8.9961 9.5 9.01113 9.5 9.02615H10.25ZM9.71578 8.10177L9.38104 8.77293L9.38104 8.77293L9.71578 8.10177ZM8.656 8.23115L8.16963 7.66024C8.16481 7.66434 8.16005 7.6685 8.15534 7.67273L8.656 8.23115ZM5.35 11.1952L4.84934 10.6367L4.84814 10.6378L5.35 11.1952ZM5 11.9902L5.75008 11.9964L5.74997 11.9839L5 11.9902ZM5.35 12.7852L4.84813 13.3425L4.84943 13.3437L5.35 12.7852ZM8.656 15.7482L8.15543 16.3067C8.16011 16.3109 8.16484 16.315 8.16963 16.3191L8.656 15.7482ZM9.71578 15.8775L9.38104 15.2064V15.2064L9.71578 15.8775ZM10.25 14.9532H9.5C9.5 14.9682 9.50045 14.9832 9.50135 14.9982L10.25 14.9532ZM10.25 11.2402C9.83579 11.2402 9.5 11.5759 9.5 11.9902C9.5 12.4044 9.83579 12.7402 10.25 12.7402V11.2402ZM19 12.7402C19.4142 12.7402 19.75 12.4044 19.75 11.9902C19.75 11.5759 19.4142 11.2402 19 11.2402V12.7402ZM11 11.9902V9.02615H9.5V11.9902L11 11.9902ZM10.9986 9.0712C11.04 8.38373 10.6668 7.738 10.0505 7.43061L9.38104 8.77293C9.45925 8.81193 9.5066 8.89387 9.50135 8.9811L10.9986 9.0712ZM10.0505 7.43061C9.4342 7.12323 8.69388 7.21361 8.16963 7.66024L9.14237 8.80206C9.2089 8.74539 9.30284 8.73392 9.38104 8.77293L10.0505 7.43061ZM8.15534 7.67273L4.84934 10.6367L5.85066 11.7536L9.15666 8.78958L8.15534 7.67273ZM4.84814 10.6378C4.46349 10.9842 4.24573 11.4788 4.25003 11.9964L5.74997 11.9839C5.74924 11.8958 5.78634 11.8115 5.85186 11.7525L4.84814 10.6378ZM4.25003 11.9839C4.24573 12.5015 4.46349 12.9961 4.84814 13.3425L5.85186 12.2278C5.78634 12.1688 5.74924 12.0845 5.74997 11.9964L4.25003 11.9839ZM4.84943 13.3437L8.15543 16.3067L9.15656 15.1896L5.85056 12.2266L4.84943 13.3437ZM8.16963 16.3191C8.69389 16.7657 9.4342 16.8561 10.0505 16.5487L9.38104 15.2064C9.30284 15.2454 9.2089 15.2339 9.14237 15.1772L8.16963 16.3191ZM10.0505 16.5487C10.6668 16.2413 11.04 15.5956 10.9986 14.9081L9.50135 14.9982C9.5066 15.0854 9.45925 15.1674 9.38104 15.2064L10.0505 16.5487ZM11 14.9532V11.9902L9.5 11.9902V14.9532L11 14.9532ZM10.25 12.7402H19V11.2402H10.25V12.7402Z"
                fill="currentColor"
              ></path>{" "}
            </g>
          </svg>
        </button>
        <h1 className={styles.title}>
          {profileName ? `${profileName}'s Travels` : "World Map"}
        </h1>
        <div className={styles.statsChip}>
          <span className={styles.statsNumber}>{visitedCount}</span>
          <span className={styles.statsLabel}>
            {visitedCount === 1 ? "country" : "countries"} visited
          </span>
        </div>
      </div>

      <div className={styles.mapContainer} ref={mapContainerRef}>
        <div className={styles.mapFrame} ref={mapFrameRef}>
          <ComposableMap
            projectionConfig={{
              scale: 200,
              center: [10, 0] as [Longitude, Latitude],
            }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  (geographies as PreparedFeature[]).map((geo, idx) => {
                    const geoName =
                      (geo.properties as Record<string, string>)?.name || "";
                    const normalized = normalizeGeoName(geoName);

                    let matchedCountry = visitedMap.get(normalized);
                    if (!matchedCountry) {
                      matchedCountry = visitedMap.get(geoName.toLowerCase());
                    }

                    const isCountryVisited = !!matchedCountry;

                    return (
                      <Geography
                        key={geo.rsmKey ?? `geo-${idx}`}
                        geography={geo}
                        data-geo={geoName}
                        onClick={(e) => {
                          handleCountryClick(
                            geoName,
                            e as unknown as React.MouseEvent,
                          );
                        }}
                        style={{
                          default: {
                            fill: isCountryVisited ? "#34d399" : "#2a2d3a",
                            stroke: "#1e1e2e",
                            strokeWidth: 0.5,
                            outline: "none",
                          },
                          hover: {
                            fill: isCountryVisited ? "#10b981" : "#3b3f52",
                            stroke: "#1e1e2e",
                            strokeWidth: 0.5,
                            outline: "none",
                          },
                          pressed: {
                            fill: isCountryVisited ? "#059669" : "#4b5068",
                            stroke: "#1e1e2e",
                            strokeWidth: 0.5,
                            outline: "none",
                          },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {pendingCountry && popupPos && (
          <div
            className={styles.popup}
            style={{
              left: popupPos.x,
              top: popupPos.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.popupArrow} />
            <div className={styles.popupHeader}>
              <span className={styles.popupTitle}>{pendingCountry.name}</span>
              <button
                type="button"
                className={styles.popupClose}
                onClick={clearForm}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className={styles.popupBody}>
              <label className={styles.popupLabel}>
                <span className={styles.popupLabelText}>
                  Date visited{" "}
                  <span className={styles.optionalTag}>(optional)</span>
                </span>
                <div className={styles.dateSelects}>
                  <select
                    className={styles.popupSelect}
                    value={visitMonth}
                    onChange={(e) => setVisitMonth(e.target.value)}
                  >
                    <option value="">Month</option>
                    {[
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ].map((name, i) => {
                      const val = String(i + 1).padStart(2, "0");
                      return (
                        <option key={val} value={val}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                  <span className={styles.dateSeparator}>/</span>
                  <select
                    className={styles.popupSelect}
                    value={visitYear}
                    onChange={(e) => setVisitYear(e.target.value)}
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 50 }, (_, i) => {
                      const yr = String(new Date().getFullYear() - i);
                      return (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </label>
              <label className={styles.popupLabel}>
                <span className={styles.popupLabelText}>
                  Days spent{" "}
                  <span className={styles.optionalTag}>(optional)</span>
                </span>
                <input
                  type="number"
                  className={styles.popupInput}
                  placeholder="e.g. 7"
                  min="1"
                  value={numDays}
                  onChange={(e) => setNumDays(e.target.value)}
                />
              </label>
            </div>
            <div className={styles.popupActions}>
              <button
                type="button"
                className={styles.popupCancelBtn}
                onClick={clearForm}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.popupAddBtn}
                onClick={async () => {
                  try {
                    const res = await authFetch(`${apiUrl}/travel-log`, {
                      method: "POST",
                      body: JSON.stringify({
                        countryId: pendingCountry.id,
                        visitDate:
                          visitMonth && visitYear
                            ? `${visitYear}-${visitMonth}`
                            : undefined,
                        numDays: numDays ? parseInt(numDays) : undefined,
                      }),
                    });
                    if (res.ok || res.status === 201) {
                      const data = await res.json();
                      const newCountry = mapUserCountry(
                        data.country as Record<string, unknown>,
                      );
                      setTravelLog((prev) => [...prev, newCountry]);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                  clearForm();
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {isOwner && !pendingCountry && (
          <div className={styles.hint}>
            Click a country to add it to your travel log
          </div>
        )}
      </div>

      {tooltipContent && (
        <div
          ref={tooltipRef}
          className={
            isVisited ? styles.tooltipVisited : styles.tooltipUnvisited
          }
        >
          <div className={styles.tooltipContent}>
            <div
              className={
                isVisited
                  ? styles.tooltipTitleVisited
                  : styles.tooltipTitleUnvisited
              }
            >
              {tooltipContent}
            </div>
            {isVisited && hoveredCountry && (
              <div className={styles.tooltipDetails}>
                {hoveredCountry.visitDate && (
                  <div>Visited: {formatDate(hoveredCountry.visitDate)}</div>
                )}
                {hoveredCountry.numDays && (
                  <div>Duration: {hoveredCountry.numDays} days</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldMapPage;
