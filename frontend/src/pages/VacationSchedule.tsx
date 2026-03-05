import { useParams, NavLink, Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Schedule.module.css";
import refreshFn from "../utils/refreshFn";
import SharePanel from "../components/SharePanel";
import type { GeminiItineraryItem } from "../types/gemini";

type VacationProps = {
  setCostTotal: React.Dispatch<React.SetStateAction<number>>;
  costTotal: number;
};

const apiURL = import.meta.env.VITE_API_URL;
const VacationSchedule = ({ setCostTotal, costTotal }: VacationProps) => {
  const { tripId } = useParams();
  const location = useLocation();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const [title, setTitle] = useState("");
  const [tripLength, setTripLength] = useState(0);
  const [role, setRole] = useState("");
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const [geminiChatOpen, setGeminiChatOpen] = useState(false);
  const geminiChatRef = useRef<HTMLDivElement>(null);
  const [geminiPrompt, setGeminiPrompt] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiConnected, setGeminiConnected] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [geminiItinerary, setGeminiItinerary] = useState<GeminiItineraryItem[]>([]);
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const [addingItem, setAddingItem] = useState<number | null>(null);
  const loggingOutRef = auth?.loggingOutRef;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditPage = location.pathname.endsWith("/edit");
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

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
    if (!geminiChatOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        geminiChatRef.current &&
        !geminiChatRef.current.contains(e.target as Node)
      ) {
        setGeminiChatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [geminiChatOpen]);

  useEffect(() => {
    if (!token) return;
    const checkGemini = async () => {
      try {
        const res = await fetch(`${apiURL}/gemini/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGeminiConnected(data.connected);
        }
      } catch {
        // silent fail
      }
    };
    checkGemini();
  }, [token]);

  const handleGeminiSend = async () => {
    if (!geminiPrompt.trim() || !token || !tripId) return;

    setGeminiLoading(true);
    setGeminiResponse(null);
    setGeminiItinerary([]);
    setAddedItems(new Set());
    try {
      const response = await fetch(`${apiURL}/gemini/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripId, prompt: geminiPrompt }),
      });

      if (!response.ok) {
        console.error("[Gemini] API error");
        setGeminiResponse("Something went wrong. Please try again.");
        return;
      }

      const data = await response.json();
      if (data.text) {
        setGeminiResponse(data.text);
      }
      if (data.itinerary && data.itinerary.length > 0) {
        setGeminiItinerary(data.itinerary);
      }
    } catch (err) {
      console.error("[Gemini] Request failed:", err);
      setGeminiResponse("Request failed. Please try again.");
    } finally {
      setGeminiLoading(false);
      setGeminiPrompt("");
    }
  };

  const handleAddToSchedule = async (item: GeminiItineraryItem, index: number) => {
    if (!token || !tripId || addedItems.has(index)) return;
    setAddingItem(index);
    try {
      const response = await fetch(`${apiURL}/schedule/${tripId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      if (response.ok) {
        setAddedItems((prev) => new Set(prev).add(index));
      }
    } catch (err) {
      console.error("[Gemini] Failed to add item:", err);
    } finally {
      setAddingItem(null);
    }
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
            let costTotal = 0;
            for (const i of data.schedule) {
              i.startTime = new Date(i.startTime);
              i.endTime = new Date(i.endTime);
              costTotal += Number(i.cost);
            }
            setCostTotal(costTotal);
            // data.schedule.sort(  don't need this i don't think
            //   (a: Schedule, b: Schedule) =>
            //     a.start_time.getTime() - b.start_time.getTime()
            // );
            setTitle(data.tripName);
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
        let costTotal = 0;
        for (const i of data.schedule) {
          i.startTime = new Date(i.startTime);
          i.endTime = new Date(i.endTime);
          costTotal += Number(i.cost);
        }
        setCostTotal(costTotal);
        // data.schedule.sort(  don't need this i don't think
        //   (a: Schedule, b: Schedule) =>
        //     a.start_time.getTime() - b.start_time.getTime()
        // );
        setTitle(data.tripName);
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
              &#60;
            </NavLink>
          </div>
          <div className={styles.costAndAiWrapper}>
            {isEditPage && geminiConnected && (
              <div ref={geminiChatRef} className={styles.aiButtonWrapper}>
                <button
                  type="button"
                  className={styles.aiButton}
                  onClick={() => setGeminiChatOpen((prev) => !prev)}
                >
                  Ask AI
                </button>
                {geminiChatOpen && (
                  <div className={styles.geminiChatDropdown}>
                    <div className={styles.geminiChatInputRow}>
                      <button
                        type="button"
                        className={styles.editQuestionnaireButton}
                        onClick={() => {
                          setShowQuestionnaire(true);
                          setGeminiChatOpen(false);
                        }}
                        title="Edit questionnaire"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <input
                        type="text"
                        placeholder="Ask AI something..."
                        value={geminiPrompt}
                        onChange={(e) => setGeminiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleGeminiSend();
                        }}
                        className={styles.geminiChatInput}
                        disabled={geminiLoading}
                      />
                      <button
                        type="button"
                        onClick={handleGeminiSend}
                        className={styles.geminiChatSend}
                        disabled={geminiLoading || !geminiPrompt.trim()}
                      >
                        {geminiLoading ? "..." : "Send"}
                      </button>
                    </div>
                    {geminiLoading && (
                      <div className={styles.geminiResponseArea}>
                        <p className={styles.geminiThinking}>Thinking...</p>
                      </div>
                    )}
                    {geminiResponse && (
                      <div className={styles.geminiResponseArea}>
                        <p className={styles.geminiResponseText}>{geminiResponse}</p>
                      </div>
                    )}
                    {geminiItinerary.length > 0 && (
                      <div className={styles.geminiItineraryList}>
                        {(() => {
                          const grouped: Record<string, { label: string; items: { item: typeof geminiItinerary[0]; idx: number }[] }> = {};
                          geminiItinerary.forEach((item, i) => {
                            const d = new Date(item.startTime);
                            const dateKey = d.toISOString().slice(0, 10);
                            if (!grouped[dateKey]) {
                              const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
                              const dateStr = d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", timeZone: "UTC" });
                              grouped[dateKey] = { label: `${day} ${dateStr}`, items: [] };
                            }
                            grouped[dateKey].items.push({ item, idx: i });
                          });
                          return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, { label, items }]) => (
                            <div key={dateKey}>
                              <div className={styles.geminiDateHeader}>{label}</div>
                              {items.map(({ item, idx }) => (
                                <div
                                  key={`${item.location}-${idx}`}
                                  className={`${styles.geminiPlaceCard} ${addedItems.has(idx) ? styles.geminiPlaceCardAdded : ""}`}
                                >
                                  <div className={styles.geminiPlaceInfo}>
                                    <span className={styles.geminiPlaceName}>{item.location}</span>
                                    <span className={styles.geminiPlaceTime}>
                                      {new Date(item.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                      {" – "}
                                      {new Date(item.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                    </span>
                                    <span className={styles.geminiPlaceDetails}>{item.details}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className={styles.geminiAddButton}
                                    onClick={() => handleAddToSchedule(item, idx)}
                                    disabled={addedItems.has(idx) || addingItem === idx}
                                    title={addedItems.has(idx) ? "Added" : "Add to schedule"}
                                  >
                                    {addedItems.has(idx) ? "✓" : addingItem === idx ? "..." : "+"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className={styles.costWrapper}>
              <h3 className="font-bold">Total Cost: ${costTotal}</h3>
            </div>
          </div>
        </div>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}&nbsp;</h2>
          <h3 className={styles.length}>- {tripLength} days</h3>
          {role === "owner" && (
            <div style={{ position: "relative", marginLeft: "1rem" }}>
              <button
                type="button"
                onClick={() => setSharePanelOpen((prev) => !prev)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="1.2rem"
                  height="1.2rem"
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
        </header>
      </div>
      <nav className={styles.navWrapper}>
        <ul className={`${styles.nav} ${styles.navPills}`} role="tablist">
          <li className={styles.navItem}>
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
          </li>
          {role !== "reader" && (
            <li className={styles.navItem}>
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
            </li>
          )}
        </ul>
      </nav>
      <div className={styles.hiddenCard}></div>
      <Outlet context={{ role, showQuestionnaire, setShowQuestionnaire }} />
    </div>
  );
};

export default VacationSchedule;
