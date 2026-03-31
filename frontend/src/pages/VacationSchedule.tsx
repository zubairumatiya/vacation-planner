import { useParams, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  lazy,
} from "react";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Schedule.module.css";
import refreshFn from "../utils/refreshFn";
import SharePanel from "../components/SharePanel";
import type {
  AiItineraryItem,
  AiChatResponse,
  GroundingData,
} from "../types/ai";
import ReactMarkdown from "react-markdown";
import aiResPopSound from "../assets/sounds/aiResPop.mp3";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "../components/ErrorFallback";
import HotkeyTooltip from "../components/HotkeyTooltip";
import Tooltip from "../components/Tooltip";
const EditCanvas = lazy(() => import("./EditCanvas"));
const FriendsCountryLogs = lazy(() => import("./FriendsCountryLogs"));
const ViewVacationSchedule = lazy(() => import("./ViewVacationSchedule"));
const VacationInfo = lazy(() => import("./VacationInfo"));

type VacationProps = {
  setCostTotal: React.Dispatch<React.SetStateAction<number>>;
  costTotal: number;
};

type AiMode = "list" | "schedule" | null;

const LIST_CATEGORIES = [
  "Museums",
  "Nature",
  "Shopping",
  "Current Events",
  "History",
  "Nightlife",
  "Food",
  "Accommodations",
  "Art",
  "Attractions",
];

const apiURL = import.meta.env.VITE_API_URL;
const VacationSchedule = ({ setCostTotal, costTotal }: VacationProps) => {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const [editRetries, setEditRetries] = useState(0);
  const [title, setTitle] = useState("");
  const [tripLocation, setTripLocation] = useState<string>("");
  const [countryName, setCountryName] = useState<string>("");
  const [tripLength, setTripLength] = useState(0);
  const [role, setRole] = useState("");
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConnected, setAiConnected] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiItinerary, setAiItinerary] = useState<AiItineraryItem[]>([]);
  const [lastAiResponse, setLastAiResponse] = useState<string | null>(null);
  const [fillInTheRest, setFillInTheRest] = useState(false);
  const [exhaustedCategories, setExhaustedCategories] = useState<string[]>([]);
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const [addingItem, setAddingItem] = useState<number | null>(null);
  const [aiGrounding, setAiGrounding] = useState<GroundingData | null>(null);
  const [mapsDropdownOpen, setMapsDropdownOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const loggingOutRef = auth?.loggingOutRef;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditPage = location.pathname.endsWith("/edit");
  const isFriendsPage = location.pathname.endsWith("/friends");
  const isInfoPage = location.pathname.endsWith("/info");
  const isViewPage = !isEditPage && !isFriendsPage && !isInfoPage;
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>(null);
  const [lastAiMode, setLastAiMode] = useState<AiMode>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "Food",
    "Accommodations",
    "Current Events",
  ]);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const closeSidebarRef = useRef<(() => void) | null>(null);
  const [scheduleUpdateKey, setScheduleUpdateKey] = useState(0);
  const [listUpdateKey, setListUpdateKey] = useState(0);
  const [viewRefreshKey, setViewRefreshKey] = useState(0);
  const [infoRefreshKey, setInfoRefreshKey] = useState(0);
  const prevIsViewPage = useRef(false);
  const prevIsInfoPage = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isViewPage && !prevIsViewPage.current) {
      setViewRefreshKey((prev) => prev + 1);
    }
    prevIsViewPage.current = isViewPage;
  }, [isViewPage]);

  useEffect(() => {
    if (isViewPage && scheduleUpdateKey > 0) {
      setViewRefreshKey((prev) => prev + 1);
    }
  }, [scheduleUpdateKey]);

  useEffect(() => {
    if (isInfoPage && !prevIsInfoPage.current) {
      setInfoRefreshKey((prev) => prev + 1);
    }
    prevIsInfoPage.current = isInfoPage;
  }, [isInfoPage]);
  const [hasUnreadAiResponse, setHasUnreadAiResponse] = useState(false);
  const [csvExporting, setCsvExporting] = useState(false);

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
      const result = await refreshFn(apiURL, refreshInFlightRef!);
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

  const handleExportCsv = useCallback(async () => {
    if (!tripId || !token || csvExporting) return;
    setCsvExporting(true);
    try {
      const res = await authFetch(`${apiURL}/schedule/${tripId}`);
      if (!res.ok) throw new Error("Failed to fetch schedule");
      const data: TripScheduleResponse = await res.json();

      const escCsv = (v: string) => {
        if (v.includes(",") || v.includes('"') || v.includes("\n"))
          return `"${v.replace(/"/g, '""')}"`;
        return v;
      };
      const fmtDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString("en-US", { timeZone: "UTC" });
      };

      const rows = [
        ["Location", "Details", "Start", "End", "Cost", "Multi-Day"].join(","),
        ...data.schedule.map((item) =>
          [
            escCsv(item.location),
            escCsv(item.details),
            fmtDate(item.startTime),
            fmtDate(item.endTime),
            item.cost.toString(),
            item.multiDay ? "Yes" : "No",
          ].join(","),
        ),
      ];

      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.tripName || "schedule"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to export schedule");
    } finally {
      setCsvExporting(false);
    }
  }, [tripId, token, csvExporting]);
  const aiChatOpenRef = useRef(aiChatOpen);
  aiChatOpenRef.current = aiChatOpen;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!sharePanelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sharePanelRef.current &&
        !sharePanelRef.current.contains(e.target as Node)
      ) {
        setSharePanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sharePanelOpen]);

  useEffect(() => {
    if (!aiChatOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (aiChatRef.current && !aiChatRef.current.contains(e.target as Node)) {
        setAiChatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [aiChatOpen]);

  useEffect(() => {
    const handleHotkeys = (e: KeyboardEvent) => {
      if (!e.metaKey || !e.shiftKey || e.altKey || e.ctrlKey) return;
      if (!tripId) return;
      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault();
          closeSidebarRef.current?.();
          setAiChatOpen((prev) => {
            if (!prev) {
              setHasUnreadAiResponse(false);
            }
            return !prev;
          });
          break;
        case "f":
          e.preventDefault();
          navigate(`/vacation/${tripId}/friends`);
          break;
        case "v":
          e.preventDefault();
          navigate(`/vacation/${tripId}`);
          break;
        case "e":
          e.preventDefault();
          navigate(`/vacation/${tripId}/edit`);
          break;
        case "i":
          e.preventDefault();
          navigate(`/vacation/${tripId}/info`);
          break;
      }
    };
    document.addEventListener("keydown", handleHotkeys);
    return () => document.removeEventListener("keydown", handleHotkeys);
  }, [tripId, navigate]);

  useEffect(() => {
    if (!token) return;
    const checkAiStatus = async () => {
      try {
        const res = await authFetch(`${apiURL}/ai/status`);
        if (res.ok) {
          const data = await res.json();
          setAiConnected(data.connected);
        }
      } catch {
        // silent fail
      }
    };
    checkAiStatus();
  }, [token]);

  const handleAiButtonClick = () => {
    closeSidebarRef.current?.();
    setAiChatOpen((prev) => {
      if (!prev) {
        setHasUnreadAiResponse(false);
      }
      return !prev;
    });
  };

  const handleQuestionnaireSubmitted = () => {
    setShowQuestionnaire(false);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleAiSend = async () => {
    if (!token || !tripId || aiLoading) return;
    const hasPrompt = aiPrompt.trim().length > 0;
    const hasMode = aiMode !== null;
    if (!hasPrompt && !hasMode) return;
    if (aiMode === "list" && selectedCategories.length === 0) return;

    setAiLoading(true);
    setAiResponse(null);
    setAiItinerary([]);
    setAiGrounding(null);
    setMapsDropdownOpen(false);
    setExpandedCards(new Set());
    setLastAiMode(aiMode);
    setAddedItems(new Set());
    try {
      const response = await authFetch(`${apiURL}/ai/chat`, {
        method: "POST",
        body: JSON.stringify({
          tripId,
          prompt: aiPrompt.trim() || undefined,
          mode: aiMode,
          categories: aiMode === "list" ? selectedCategories : undefined,
          previousResponse: hasPrompt ? lastAiResponse || undefined : undefined,
          fillInTheRest: aiMode === "schedule" ? fillInTheRest : undefined,
        }),
      });

      if (!response.ok) {
        setAiResponse("Something went wrong. Please try again.");
        return;
      }

      const data: AiChatResponse = await response.json();

      // Store raw model response for conversation continuity
      if (data.rawModelResponse) {
        setLastAiResponse(data.rawModelResponse);
      }

      if (data.text) {
        setAiResponse(data.text);
      }

      if (data.grounding) {
        setAiGrounding(data.grounding);
      }

      // Handle exhausted categories
      if (data.exhaustedCategories && data.exhaustedCategories.length > 0) {
        setExhaustedCategories((prev) => [
          ...new Set([...prev, ...data.exhaustedCategories!]),
        ]);
      }

      // If the AI modified the schedule (actions executed), refresh it
      if (data.scheduleUpdated) {
        setScheduleUpdateKey((prev) => prev + 1);
      }

      if (data.itinerary && data.itinerary.length > 0) {
        if (aiMode === null) {
          // General mode — just show items as cards
          setAiItinerary(data.itinerary);
          setSidebarRefreshKey((prev) => prev + 1);
        } else if (aiMode === "schedule") {
          // Mark each +ADD item in the recommendation sidebar as added
          const addedActions = (data.actions ?? []).filter(
            (a) => a.symbol === "+ADD",
          );
          for (const action of addedActions) {
            const placeName = action.data.location as string;
            if (placeName) {
              authFetch(`${apiURL}/ai/mark-added-by-name/${tripId}`, {
                method: "PATCH",
                body: JSON.stringify({ placeName }),
              }).catch(() => {});
            }
          }
          if (addedActions.length > 0) {
            setSidebarRefreshKey((prev) => prev + 1);
            setListUpdateKey((prev) => prev + 1);
          }

          // ?SUGGEST items show as recommendation cards
          const suggestions = (data.actions ?? [])
            .filter((a) => a.symbol === "?SUGGEST")
            .map((a) => ({
              location: (a.data.location as string) ?? "",
              details: (a.data.details as string) ?? "",
              category: (a.data.category as string) ?? "",
              startTime: (a.data.startTime as string) ?? "",
              endTime: (a.data.endTime as string) ?? "",
              cost: Number(a.data.cost) || 0,
              multiDay: Boolean(a.data.multiDay),
            }));

          if (suggestions.length > 0) {
            setAiItinerary(suggestions);
            setSidebarRefreshKey((prev) => prev + 1);
          }
        } else {
          // List mode
          setAiItinerary(data.itinerary);
          setSidebarRefreshKey((prev) => prev + 1);
        }
      }
    } catch (err) {
      console.error("[AI] Request failed:", err);
      setAiResponse("Request failed. Please try again.");
    } finally {
      setAiLoading(false);

      // Play sound when AI responds
      try {
        const audio = new Audio(aiResPopSound);
        audio.play().catch((e) => console.warn("Audio playback prevented:", e));
      } catch (err) {
        console.warn("Failed to play AI response sound", err);
      }

      setAiPrompt("");
      setSelectedCategories([]);
      setAiMode(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      if (!aiChatOpenRef.current) {
        setHasUnreadAiResponse(true);
      }
    }
  };

  const handleAddToSchedule = async (
    item: AiItineraryItem,
    index: number,
    mode: AiMode = lastAiMode,
  ) => {
    if (!token || !tripId || addedItems.has(index)) return;
    setAddingItem(index);
    try {
      let response: Response;
      if (mode === "list") {
        response = await authFetch(`${apiURL}/list/${tripId}`, {
          method: "POST",
          body: JSON.stringify({
            value: item.location,
            details: item.details ?? null,
          }),
        });
      } else {
        response = await authFetch(`${apiURL}/schedule/${tripId}`, {
          method: "POST",
          body: JSON.stringify({
            location: item.location,
            details: item.details,
            start: item.startTime,
            end: item.endTime,
            cost: item.cost,
            multiDay: item.multiDay,
            chunk: {},
          }),
        });
      }
      if (response.ok) {
        setAddedItems((prev) => new Set(prev).add(index));
        if (mode === "schedule") {
          // Refresh schedule UI immediately when adding to schedule
          setScheduleUpdateKey((prev) => prev + 1);
          // Mark the corresponding recommendation as added
          authFetch(`${apiURL}/ai/mark-added-by-name/${tripId}`, {
            method: "PATCH",
            body: JSON.stringify({ placeName: item.location }),
          })
            .then(() => {
              setSidebarRefreshKey((prev) => prev + 1);
            })
            .catch(() => {});
        } else if (mode === "list") {
          // Refresh the want-to-see list UI
          setListUpdateKey((prev) => prev + 1);
          // Mark the corresponding sidebar recommendation as added
          authFetch(`${apiURL}/ai/mark-added-by-name/${tripId}`, {
            method: "PATCH",
            body: JSON.stringify({ placeName: item.location }),
          })
            .then(() => {
              setSidebarRefreshKey((prev) => prev + 1);
            })
            .catch(() => {});
        } else {
          // General mode — item goes to schedule
          setScheduleUpdateKey((prev) => prev + 1);
          authFetch(`${apiURL}/ai/mark-added-by-name/${tripId}`, {
            method: "PATCH",
            body: JSON.stringify({ placeName: item.location }),
          })
            .then(() => {
              setSidebarRefreshKey((prev) => prev + 1);
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error("[AI] Failed to add item:", err);
    } finally {
      setAddingItem(null);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAiPrompt(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const [addingAllRecs, setAddingAllRecs] = useState(false);
  const handleAddAllRecs = async () => {
    if (!token || !tripId || addingAllRecs) return;
    setAddingAllRecs(true);
    const newAdded = new Set(addedItems);
    for (let i = 0; i < aiItinerary.length; i++) {
      if (!addedItems.has(i)) {
        await handleAddToSchedule(aiItinerary[i], i);
        newAdded.add(i);
      }
    }
    setAddedItems(newAdded);
    setAddingAllRecs(false);
  };

  useEffect(() => {
    if (loggingOutRef?.current) return;
    const getTrip = async () => {
      const response = await fetch(`${apiURL}/schedule/${tripId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        const resData = (await response.json()) as ApiErrorResponse;
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
          const retryReq = await fetch(`${apiURL}/schedule/${tripId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${continueReq.token}`,
            },
          });
          if (!retryReq.ok) {
            alert("Trouble completing request, please try again");
          } else if (retryReq.ok) {
            const data = (await retryReq.json()) as TripScheduleResponse;
            const convertStart = new Date(data.startDate);
            const convertEnd = new Date(data.endDate);
            const totalCost = data.schedule.reduce(
              (sum, i) => sum + Number(i.cost),
              0,
            );
            setCostTotal(totalCost);
            setTitle(data.tripName);
            setTripLocation(data.location);
            setCountryName(data.countryName ?? "");
            setRole(data.role ?? "");
            const UtcStart = convertStart.getTime();
            const UtcEnd = convertEnd.getTime();
            const length = Math.floor(
              (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24),
            );
            setTripLength(length + 1); // add a day since it is not counting
          }
        } else if (continueReq.err) {
          if (logout) {
            await logout();
          }
          return;
        }
      } else if (response.status === 403) {
        alert("You do not have permission to access this resource");
      } else if (response.status === 404) {
        alert("Error: Trip not found");
      } else if (response.status >= 500) {
        alert(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
        );
      } else if (response.ok) {
        const data = (await response.json()) as TripScheduleResponse;
        const convertStart = new Date(data.startDate);
        const convertEnd = new Date(data.endDate);
        const totalCost = data.schedule.reduce(
          (sum, i) => sum + Number(i.cost),
          0,
        );
        setCostTotal(totalCost);
        setTitle(data.tripName);
        setTripLocation(data.location);
        setCountryName(data.countryName ?? "");
        setRole(data.role ?? "");
        const UtcStart = convertStart.getTime();
        const UtcEnd = convertEnd.getTime();
        const length = Math.floor((UtcEnd - UtcStart) / (1000 * 60 * 60 * 24));
        setTripLength(length + 1); // add a day since it is not counting
      }
    };
    getTrip();
  }, []);
  return (
    <div className={styles.entirePage}>
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#2fe782",
            color: "#222",
            padding: "0.5rem 1.25rem",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.9rem",
            zIndex: 9999,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toastMessage}
        </div>
      )}
      <div className={styles.costAndHeader}>
        <div className={styles.backAndTotal}>
          <div className={styles.backWrapper}>
            <NavLink to="/" className={styles.backButton}>
              &#8592;
            </NavLink>
          </div>
          <div className={styles.costAndAiWrapper}>
            {isEditPage && aiConnected && (
              <div ref={aiChatRef} className={styles.aiButtonWrapper}>
                <HotkeyTooltip label="Toggle AI" shortcut="⌘⇧A">
                  <button
                    type="button"
                    className={styles.aiButton}
                    onClick={handleAiButtonClick}
                    style={{ position: "relative" }}
                  >
                    Ask AI
                    {hasUnreadAiResponse && !aiChatOpen && (
                      <span
                        style={{
                          position: "absolute",
                          top: "-3px",
                          right: "-3px",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "#ef4444",
                        }}
                      />
                    )}
                  </button>
                </HotkeyTooltip>
                {aiChatOpen && (
                  <div className={styles.aiChatDropdown}>
                    {/* Mode toggle */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        padding: "0.5rem 0.6rem 0",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setAiMode((prev) => (prev === "list" ? null : "list"))
                        }
                        disabled={aiLoading}
                        style={{
                          flex: 1,
                          padding: "0.35rem 0.5rem",
                          borderRadius: "6px",
                          border:
                            aiMode === "list"
                              ? "1px solid #2fe782"
                              : "1px solid #555",
                          background:
                            aiMode === "list"
                              ? "rgba(47,231,130,0.15)"
                              : "#1e1e20",
                          color: aiMode === "list" ? "#2fe782" : "#999",
                          cursor: aiLoading ? "not-allowed" : "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textAlign: "left",
                          opacity: aiLoading ? 0.5 : 1,
                        }}
                      >
                        <div>List</div>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 400,
                            marginTop: "0.15rem",
                            color: aiMode === "list" ? "#2fe782" : "#777",
                          }}
                        >
                          Choose from a list (start here)
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAiMode((prev) =>
                            prev === "schedule" ? null : "schedule",
                          )
                        }
                        disabled={aiLoading}
                        style={{
                          flex: 1,
                          padding: "0.35rem 0.5rem",
                          borderRadius: "6px",
                          border:
                            aiMode === "schedule"
                              ? "1px solid #2fe782"
                              : "1px solid #555",
                          background:
                            aiMode === "schedule"
                              ? "rgba(47,231,130,0.15)"
                              : "#1e1e20",
                          color: aiMode === "schedule" ? "#2fe782" : "#999",
                          cursor: aiLoading ? "not-allowed" : "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textAlign: "left",
                          opacity: aiLoading ? 0.5 : 1,
                        }}
                      >
                        <div>Schedule</div>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 400,
                            marginTop: "0.15rem",
                            color: aiMode === "schedule" ? "#2fe782" : "#777",
                          }}
                        >
                          Organize my list into a schedule
                        </div>
                      </button>
                    </div>

                    {/* Category checkboxes for list mode */}
                    {aiMode === "list" && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          padding: "0.4rem 0.6rem 0",
                          flexWrap: "wrap",
                        }}
                      >
                        {LIST_CATEGORIES.map((cat) => {
                          const isExhausted = exhaustedCategories.includes(cat);
                          return (
                            <label
                              key={cat}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                fontSize: "0.75rem",
                                color: isExhausted
                                  ? "#555"
                                  : selectedCategories.includes(cat)
                                    ? "#2fe782"
                                    : "#999",
                                cursor: isExhausted ? "not-allowed" : "pointer",
                                opacity: isExhausted ? 0.5 : 1,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  selectedCategories.includes(cat) &&
                                  !isExhausted
                                }
                                onChange={() => toggleCategory(cat)}
                                disabled={aiLoading || isExhausted}
                                style={{ accentColor: "#2fe782" }}
                              />
                              {cat}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Fill in the rest checkbox for schedule mode */}
                    {aiMode === "schedule" && (
                      <div
                        style={{
                          padding: "0.4rem 0.6rem 0",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.75rem",
                            color: fillInTheRest ? "#2fe782" : "#999",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={fillInTheRest}
                            onChange={() => setFillInTheRest((prev) => !prev)}
                            disabled={aiLoading}
                            style={{ accentColor: "#2fe782" }}
                          />
                          Fill in the rest (AI adds suggestions for empty slots)
                        </label>
                      </div>
                    )}

                    <div className={styles.aiChatInputRow}>
                      <Tooltip label="Trip Notes">
                        <button
                          type="button"
                          className={styles.editQuestionnaireButton}
                          onClick={() => {
                            setShowQuestionnaire(true);
                            setAiChatOpen(false);
                          }}
                          style={{
                            fontSize: "0.65rem",
                            padding: "0.2rem 0.4rem",
                            color: "#ccc",
                          }}
                        >
                          Notes
                        </button>
                      </Tooltip>
                      <textarea
                        ref={textareaRef}
                        placeholder="Ask AI something..."
                        value={aiPrompt}
                        onChange={handleTextareaInput}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAiSend();
                          }
                        }}
                        className={styles.aiChatInput}
                        disabled={aiLoading}
                        rows={1}
                        maxLength={2000}
                        style={{
                          resize: "none",
                          overflow: "auto",
                          maxHeight: "120px",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAiSend}
                        className={styles.aiChatSend}
                        disabled={
                          aiLoading ||
                          (!aiPrompt.trim() && aiMode === null) ||
                          (aiMode === "list" && selectedCategories.length === 0)
                        }
                      >
                        {aiLoading ? "..." : "Send"}
                      </button>
                    </div>
                    {aiLoading && (
                      <div className={styles.aiResponseArea}>
                        <p className={styles.aiThinking}>Thinking...</p>
                      </div>
                    )}
                    {aiResponse && (
                      <div className={styles.aiResponseArea}>
                        <div className={styles.aiResponseText}>
                          <ReactMarkdown>{aiResponse}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {aiItinerary.length > 0 && (
                      <div className={styles.aiItineraryList}>
                        {/* Add all recs button */}
                        {aiItinerary.some((_, i) => !addedItems.has(i)) && (
                          <button
                            type="button"
                            onClick={handleAddAllRecs}
                            disabled={addingAllRecs}
                            style={{
                              width: "100%",
                              padding: "0.4rem 0.6rem",
                              background: "rgba(47,231,130,0.12)",
                              border: "1px solid rgba(47,231,130,0.3)",
                              borderRadius: "6px",
                              color: "#2fe782",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {addingAllRecs
                              ? "Adding..."
                              : `Add all ${lastAiMode === "schedule" ? "recommendations" : "items"}`}
                          </button>
                        )}
                        {lastAiMode === "schedule"
                          ? (() => {
                              const grouped: Record<
                                string,
                                {
                                  label: string;
                                  items: {
                                    item: (typeof aiItinerary)[0];
                                    idx: number;
                                  }[];
                                }
                              > = {};
                              aiItinerary.forEach((item, i) => {
                                const d = item.startTime
                                  ? new Date(item.startTime)
                                  : null;
                                const isValid = d && !isNaN(d.getTime());
                                const dateKey = isValid
                                  ? d.toISOString().slice(0, 10)
                                  : "Unscheduled";
                                if (!grouped[dateKey]) {
                                  if (isValid) {
                                    const day = d.toLocaleDateString("en-US", {
                                      weekday: "short",
                                      timeZone: "UTC",
                                    });
                                    const dateStr = d.toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "2-digit",
                                        day: "2-digit",
                                        timeZone: "UTC",
                                      },
                                    );
                                    grouped[dateKey] = {
                                      label: `${day} ${dateStr}`,
                                      items: [],
                                    };
                                  } else {
                                    grouped[dateKey] = {
                                      label: "Recommendations",
                                      items: [],
                                    };
                                  }
                                }
                                grouped[dateKey].items.push({ item, idx: i });
                              });
                              return Object.entries(grouped)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([dateKey, { label, items }]) => (
                                  <div key={dateKey}>
                                    <div className={styles.aiDateHeader}>
                                      {label}
                                    </div>
                                    {items.map(({ item, idx }) => (
                                      <div
                                        key={`${item.location}-${idx}`}
                                        className={`${styles.aiPlaceCard} ${addedItems.has(idx) ? styles.aiPlaceCardAdded : ""}`}
                                      >
                                        <div className={styles.aiPlaceInfo}>
                                          <span className={styles.aiPlaceName}>
                                            {item.location}
                                          </span>
                                          {item.startTime && item.endTime && (
                                            <span
                                              className={styles.aiPlaceTime}
                                            >
                                              {new Date(
                                                item.startTime,
                                              ).toLocaleTimeString("en-US", {
                                                hour: "numeric",
                                                minute: "2-digit",
                                                timeZone: "UTC",
                                              })}
                                              {" – "}
                                              {new Date(
                                                item.endTime,
                                              ).toLocaleTimeString("en-US", {
                                                hour: "numeric",
                                                minute: "2-digit",
                                                timeZone: "UTC",
                                              })}
                                            </span>
                                          )}
                                          <span
                                            className={`${styles.aiPlaceDetails} ${expandedCards.has(idx) ? styles.aiPlaceDetailsExpanded : ""} ${item.details && item.details.length > 80 ? styles.aiPlaceDetailsExpandable : ""}`}
                                            onClick={() =>
                                              setExpandedCards((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(idx)) {
                                                  next.delete(idx);
                                                } else {
                                                  next.add(idx);
                                                }
                                                return next;
                                              })
                                            }
                                          >
                                            {item.details}
                                          </span>
                                        </div>
                                        <Tooltip
                                          label={
                                            addedItems.has(idx)
                                              ? "Added"
                                              : "Add to schedule"
                                          }
                                        >
                                          <button
                                            type="button"
                                            className={styles.aiAddButton}
                                            onClick={() =>
                                              handleAddToSchedule(item, idx)
                                            }
                                            disabled={
                                              addedItems.has(idx) ||
                                              addingItem === idx
                                            }
                                          >
                                            {addedItems.has(idx)
                                              ? "✓"
                                              : addingItem === idx
                                                ? "..."
                                                : "+"}
                                          </button>
                                        </Tooltip>
                                      </div>
                                    ))}
                                  </div>
                                ));
                            })()
                          : /* List mode — group by category */
                            (() => {
                              const grouped: Record<
                                string,
                                {
                                  item: (typeof aiItinerary)[0];
                                  idx: number;
                                }[]
                              > = {};
                              aiItinerary.forEach((item, i) => {
                                const cat = item.category || "Other";
                                if (!grouped[cat]) grouped[cat] = [];
                                grouped[cat].push({ item, idx: i });
                              });
                              return Object.entries(grouped).map(
                                ([cat, items]) => (
                                  <div key={cat}>
                                    <div className={styles.aiCategoryHeader}>
                                      {cat}
                                    </div>
                                    {items.map(({ item, idx }) => (
                                      <div
                                        key={`${item.location}-${idx}`}
                                        className={`${styles.aiListCard} ${addedItems.has(idx) ? styles.aiPlaceCardAdded : ""}`}
                                      >
                                        <div className={styles.aiPlaceInfo}>
                                          <span className={styles.aiPlaceName}>
                                            {item.location}
                                          </span>
                                          <span
                                            className={`${styles.aiPlaceDetails} ${expandedCards.has(idx) ? styles.aiPlaceDetailsExpanded : ""} ${item.details && item.details.length > 80 ? styles.aiPlaceDetailsExpandable : ""}`}
                                            onClick={() =>
                                              setExpandedCards((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(idx)) {
                                                  next.delete(idx);
                                                } else {
                                                  next.add(idx);
                                                }
                                                return next;
                                              })
                                            }
                                          >
                                            {item.details}
                                          </span>
                                        </div>
                                        <Tooltip
                                          label={
                                            addedItems.has(idx)
                                              ? "Added"
                                              : lastAiMode === "list"
                                                ? "Add to list"
                                                : "Add to schedule"
                                          }
                                        >
                                          <button
                                            type="button"
                                            className={styles.aiAddButton}
                                            onClick={() =>
                                              handleAddToSchedule(item, idx)
                                            }
                                            disabled={
                                              addedItems.has(idx) ||
                                              addingItem === idx
                                            }
                                          >
                                            {addedItems.has(idx)
                                              ? "✓"
                                              : addingItem === idx
                                                ? "..."
                                                : "+"}
                                          </button>
                                        </Tooltip>
                                      </div>
                                    ))}
                                  </div>
                                ),
                              );
                            })()}
                        {/* Grounding attribution */}
                        {aiGrounding?.searchEntryPoint && (
                          <div
                            className={styles.searchEntryPoint}
                            dangerouslySetInnerHTML={{
                              __html: aiGrounding.searchEntryPoint,
                            }}
                          />
                        )}
                        {aiGrounding?.webSources &&
                          aiGrounding.webSources.length > 0 && (
                            <div className={styles.groundingSources}>
                              {aiGrounding.webSources.map((src, i) => (
                                <a
                                  key={i}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.groundingSourceLink}
                                >
                                  {src.title}
                                </a>
                              ))}
                            </div>
                          )}
                        {aiGrounding?.mapsSources &&
                          aiGrounding.mapsSources.length > 0 && (
                            <div className={styles.mapsGroundingWrapper}>
                              <button
                                type="button"
                                className={styles.mapsGroundingToggle}
                                onClick={() =>
                                  setMapsDropdownOpen((prev) => !prev)
                                }
                              >
                                <span className={styles.mapsGroundingLabel}>
                                  Google Maps
                                </span>
                                <span
                                  className={styles.mapsGroundingArrow}
                                  style={{
                                    transform: mapsDropdownOpen
                                      ? "rotate(180deg)"
                                      : "rotate(0deg)",
                                  }}
                                >
                                  ▾
                                </span>
                              </button>
                              {mapsDropdownOpen && (
                                <div className={styles.mapsGroundingList}>
                                  {aiGrounding.mapsSources.map((src, i) => (
                                    <a
                                      key={i}
                                      href={src.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.mapsGroundingLink}
                                    >
                                      {src.title}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className={styles.costWrapper}>
              <h3>
                Total: <span className={styles.costAmount}>${costTotal}</span>
              </h3>
            </div>
          </div>
        </div>
        <header className={styles.header}>
          <div className={styles.titleWrapper}>
            <div className={styles.topTitleRow}>
              <h2 className={styles.title}>{title}&nbsp;</h2>
              <h3 className={styles.length}>{tripLength} days</h3>
            </div>
            <h5 className={styles.locationTitle}>{tripLocation}</h5>
          </div>
          <div className={styles.headerIcons}>
            {role === "owner" && (
              <div
                style={{
                  position: "relative",
                  marginLeft: "1rem",
                  paddingTop: "6px",
                }}
              >
                <Tooltip label="Share" topOffset="100%">
                  <button
                    type="button"
                    onClick={() => setSharePanelOpen((prev) => !prev)}
                    className={styles.headerIcon}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="1.3rem"
                      height="1.3rem"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </button>
                </Tooltip>
                {sharePanelOpen && (
                  <div
                    ref={sharePanelRef}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "100%",
                      marginTop: "0.5rem",
                      zIndex: 100,
                    }}
                  >
                    <SharePanel
                      tripId={tripId!}
                      onClose={() => setSharePanelOpen(false)}
                      onToast={showToast}
                    />
                  </div>
                )}
              </div>
            )}
            <Tooltip label="Export schedule as CSV" topOffset="80%">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={csvExporting}
                className={styles.headerIcon}
                style={{
                  marginLeft: ".5rem",
                  cursor: csvExporting ? "wait" : undefined,
                  opacity: csvExporting ? 0.3 : undefined,
                }}
              >
                <svg
                  viewBox="0 0 15 15"
                  width="1.2rem"
                  height="1.2rem"
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
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M1 1.5C1 0.671573 1.67157 0 2.5 0H10.7071L14 3.29289V13.5C14 14.3284 13.3284 15 12.5 15H2.5C1.67157 15 1 14.3284 1 13.5V1.5ZM2 6H5V7H3V10H5V11H2V6ZM9 6H6V9H8V10H6V11H9V8H7V7H9V6ZM11 6H10V9.70711L11.5 11.2071L13 9.70711V6H12V9.29289L11.5 9.79289L11 9.29289V6Z"
                      fill="#ffffff"
                    ></path>{" "}
                  </g>
                </svg>
              </button>
            </Tooltip>
          </div>
        </header>
      </div>
      <nav className={styles.navWrapper}>
        <ul className={`${styles.nav} ${styles.navPills}`} role="tablist">
          <li className={styles.navItem}>
            <HotkeyTooltip
              label="View"
              shortcut="⌘⇧V"
              wrapperStyle={{ width: "100%" }}
              topOffset="43%"
            >
              <NavLink
                to={`/vacation/${tripId}`}
                end
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navLink} ${styles.navLinkActive}`
                    : `${styles.navLink}`
                }
                data-toggle="pill"
              >
                View
              </NavLink>
            </HotkeyTooltip>
          </li>
          {role !== "reader" && (
            <li className={styles.navItem}>
              <HotkeyTooltip
                label="Edit"
                shortcut="⌘⇧E"
                wrapperStyle={{ width: "100%" }}
                topOffset="43%"
              >
                <NavLink
                  to={`/vacation/${tripId}/edit`}
                  className={({ isActive }) =>
                    isActive
                      ? `${styles.navLink} ${styles.navLinkActive}`
                      : `${styles.navLink}`
                  }
                  data-toggle="pill"
                >
                  Edit
                </NavLink>
              </HotkeyTooltip>
            </li>
          )}
          {role !== "reader" && (
            <li className={styles.navItem}>
              <HotkeyTooltip
                label="Friends"
                shortcut="⌘⇧F"
                wrapperStyle={{ width: "100%" }}
                topOffset="43%"
              >
                {countryName ? (
                  <NavLink
                    to={`/vacation/${tripId}/friends`}
                    className={({ isActive }) =>
                      isActive
                        ? `${styles.navLink} ${styles.navLinkActive}`
                        : `${styles.navLink}`
                    }
                    data-toggle="pill"
                  >
                    Friends
                  </NavLink>
                ) : (
                  <span
                    className={`${styles.navLink} ${styles.navLinkDisabled}`}
                  >
                    Friends
                  </span>
                )}
              </HotkeyTooltip>
            </li>
          )}
          <li className={styles.navItem}>
            <HotkeyTooltip
              label="Country Info"
              shortcut="⌘⇧I"
              wrapperStyle={{ width: "100%" }}
              topOffset="43%"
            >
              <NavLink
                to={`/vacation/${tripId}/info`}
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navLink} ${styles.navLinkActive} ${styles.infoPill}`
                    : `${styles.navLink} ${styles.infoPill}`
                }
                data-toggle="pill"
              >
                {countryName ? `${countryName} Info` : "\u00A0"}
              </NavLink>
            </HotkeyTooltip>
          </li>
        </ul>
      </nav>
      <div className={styles.hiddenCard}></div>
      {role !== "reader" && (
        <>
          <div style={{ display: isEditPage ? undefined : "none" }}>
            <ErrorBoundary
              fallbackRender={(fallbackProps) => (
                <ErrorFallback {...fallbackProps} retryCount={editRetries} />
              )}
              onReset={() => setEditRetries((prev) => prev + 1)}
            >
              <EditCanvas
                setCostTotal={setCostTotal}
                role={role}
                showQuestionnaire={showQuestionnaire}
                setShowQuestionnaire={setShowQuestionnaire}
                sidebarRefreshKey={sidebarRefreshKey}
                closeSidebarRef={closeSidebarRef}
                onSidebarOpen={() => setAiChatOpen(false)}
                scheduleUpdateKey={scheduleUpdateKey}
                listUpdateKey={listUpdateKey}
                onQuestionnaireSubmitted={handleQuestionnaireSubmitted}
              />
            </ErrorBoundary>
          </div>
          <div style={{ display: isFriendsPage ? undefined : "none" }}>
            <FriendsCountryLogs
              countryName={countryName}
              tripLocation={tripLocation}
              onItemAdded={() => setListUpdateKey((prev) => prev + 1)}
            />
          </div>
        </>
      )}
      <div style={{ display: isViewPage ? undefined : "none" }}>
        <ViewVacationSchedule refreshKey={viewRefreshKey} />
      </div>
      <div style={{ display: isInfoPage ? undefined : "none" }}>
        <VacationInfo refreshKey={infoRefreshKey} />
      </div>
    </div>
  );
};

export default VacationSchedule;
