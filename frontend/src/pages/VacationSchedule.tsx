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

type AiMode = "list" | "schedule";

const LIST_CATEGORIES = ["Accommodation", "Food", "Activities"];

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
  const [geminiQuestion, setGeminiQuestion] = useState<string | null>(null);
  const [geminiItinerary, setGeminiItinerary] = useState<GeminiItineraryItem[]>(
    [],
  );
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const [addingItem, setAddingItem] = useState<number | null>(null);
  const loggingOutRef = auth?.loggingOutRef;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditPage = location.pathname.endsWith("/edit");
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [aiMode, setAiMode] = useState<AiMode>("list");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    ...LIST_CATEGORIES,
  ]);
  const [hasQuestionnaire, setHasQuestionnaire] = useState<boolean | null>(
    null,
  );
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [scheduleUpdateKey, setScheduleUpdateKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Check if questionnaire exists
  useEffect(() => {
    if (!token || !tripId) return;
    const checkQuestionnaire = async () => {
      try {
        const res = await fetch(`${apiURL}/questionnaire/${tripId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setHasQuestionnaire(!!data.questionnaire);
        }
      } catch {
        // silent
      }
    };
    checkQuestionnaire();
  }, [token, tripId]);

  const handleAiButtonClick = () => {
    if (hasQuestionnaire === false) {
      setShowQuestionnaire(true);
    } else {
      setGeminiChatOpen((prev) => !prev);
    }
  };

  // After questionnaire is submitted, mark it as filled and open chat
  const handleQuestionnaireSubmitted = () => {
    setHasQuestionnaire(true);
    setShowQuestionnaire(false);
    setGeminiChatOpen(true);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleGeminiSend = async () => {
    if (!geminiPrompt.trim() || !token || !tripId) return;
    if (aiMode === "list" && selectedCategories.length === 0) return;

    setGeminiLoading(true);
    setGeminiResponse(null);
    setGeminiQuestion(null);
    setGeminiItinerary([]);
    setAddedItems(new Set());
    try {
      const response = await fetch(`${apiURL}/gemini/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripId,
          prompt: geminiPrompt,
          mode: aiMode,
          categories: aiMode === "list" ? selectedCategories : undefined,
        }),
      });

      if (!response.ok) {
        setGeminiResponse("Something went wrong. Please try again.");
        return;
      }

      const data = await response.json();
      if (data.text) {
        setGeminiResponse(data.text);
      }
      if (data.question) {
        setGeminiQuestion(data.question);
      }

      if (data.itinerary && data.itinerary.length > 0) {
        if (aiMode === "schedule") {
          // Fetch user's list and current schedule to identify what needs adding
          const [listRes, scheduleRes] = await Promise.all([
            fetch(`${apiURL}/list/${tripId}`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }),
            fetch(`${apiURL}/schedule/${tripId}`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }),
          ]);

          const listNames = new Set<string>();
          if (listRes.ok) {
            const listData = await listRes.json();
            (listData.data ?? []).forEach((item: { value: string }) => {
              listNames.add(item.value.toLowerCase().trim());
            });
          }

          // Build set of already-scheduled location names to avoid duplicates
          const scheduledNames = new Set<string>();
          if (scheduleRes.ok) {
            const scheduleData = await scheduleRes.json();
            (scheduleData.schedule ?? []).forEach((item: { location: string }) => {
              scheduledNames.add(item.location.toLowerCase().trim());
            });
          }

          const listSourced: { item: GeminiItineraryItem; idx: number }[] = [];
          const recommendations: GeminiItineraryItem[] = [];

          data.itinerary.forEach((item: GeminiItineraryItem, i: number) => {
            const name = item.location.toLowerCase().trim();
            if (listNames.has(name) && !scheduledNames.has(name)) {
              // On user's list but not yet in schedule — auto-add
              listSourced.push({ item, idx: i });
            } else if (!listNames.has(name)) {
              // Not on user's list — it's a recommendation
              recommendations.push(item);
            }
            // If it's on the list AND already scheduled, skip it
          });

          // Auto-add list-sourced items to schedule
          for (const { item, idx } of listSourced) {
            await handleAddToSchedule(item, idx, "schedule");
          }

          // Signal EditCanvas to re-fetch schedule with the newly added items
          if (listSourced.length > 0) {
            setScheduleUpdateKey((prev) => prev + 1);
          }

          // Only show recommendations as cards in chat
          if (recommendations.length > 0) {
            setGeminiItinerary(recommendations);
            setSidebarRefreshKey((prev) => prev + 1);
          }
        } else {
          setGeminiItinerary(data.itinerary);
          if (!data.question) {
            setSidebarRefreshKey((prev) => prev + 1);
          }
        }
      }
    } catch (err) {
      console.error("[Gemini] Request failed:", err);
      setGeminiResponse("Request failed. Please try again.");
    } finally {
      setGeminiLoading(false);
      setGeminiPrompt("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleAddToSchedule = async (
    item: GeminiItineraryItem,
    index: number,
    mode: AiMode = aiMode,
  ) => {
    if (!token || !tripId || addedItems.has(index)) return;
    setAddingItem(index);
    try {
      let response: Response;
      if (mode === "list") {
        response = await fetch(`${apiURL}/list/${tripId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            value: item.location,
            details: item.details ?? null,
          }),
        });
      } else {
        response = await fetch(`${apiURL}/schedule/${tripId}`, {
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
      }
      if (response.ok) {
        setAddedItems((prev) => new Set(prev).add(index));
        // Refresh schedule UI immediately when adding to schedule
        if (mode === "schedule") {
          setScheduleUpdateKey((prev) => prev + 1);
        }
        // Mark the corresponding recommendation as added
        fetch(`${apiURL}/gemini/mark-added-by-name/${tripId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ placeName: item.location }),
        }).then(() => {
          setSidebarRefreshKey((prev) => prev + 1);
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[Gemini] Failed to add item:", err);
    } finally {
      setAddingItem(null);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeminiPrompt(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const [addingAllRecs, setAddingAllRecs] = useState(false);
  const handleAddAllRecs = async () => {
    if (!token || !tripId || addingAllRecs) return;
    setAddingAllRecs(true);
    const newAdded = new Set(addedItems);
    for (let i = 0; i < geminiItinerary.length; i++) {
      if (!addedItems.has(i)) {
        await handleAddToSchedule(geminiItinerary[i], i);
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
                  onClick={handleAiButtonClick}
                >
                  Ask AI
                </button>
                {geminiChatOpen && (
                  <div className={styles.geminiChatDropdown}>
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
                        onClick={() => setAiMode("list")}
                        style={{
                          flex: 1,
                          padding: "0.35rem 0.5rem",
                          borderRadius: "6px",
                          border:
                            aiMode === "list"
                              ? "1px solid #2fe782"
                              : "1px solid #555",
                          background:
                            aiMode === "list" ? "rgba(47,231,130,0.15)" : "#1e1e20",
                          color: aiMode === "list" ? "#2fe782" : "#999",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textAlign: "left",
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
                        onClick={() => setAiMode("schedule")}
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
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textAlign: "left",
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
                        {LIST_CATEGORIES.map((cat) => (
                          <label
                            key={cat}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.75rem",
                              color: selectedCategories.includes(cat)
                                ? "#2fe782"
                                : "#999",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat)}
                              onChange={() => toggleCategory(cat)}
                              style={{ accentColor: "#2fe782" }}
                            />
                            {cat}
                          </label>
                        ))}
                      </div>
                    )}

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
                      <textarea
                        ref={textareaRef}
                        placeholder="Ask AI something..."
                        value={geminiPrompt}
                        onChange={handleTextareaInput}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleGeminiSend();
                          }
                        }}
                        className={styles.geminiChatInput}
                        disabled={geminiLoading}
                        rows={1}
                        style={{
                          resize: "none",
                          overflow: "auto",
                          maxHeight: "120px",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleGeminiSend}
                        className={styles.geminiChatSend}
                        disabled={
                          geminiLoading ||
                          !geminiPrompt.trim() ||
                          (aiMode === "list" && selectedCategories.length === 0)
                        }
                      >
                        {geminiLoading ? "..." : "Send"}
                      </button>
                    </div>
                    {geminiLoading && (
                      <div className={styles.geminiResponseArea}>
                        <p className={styles.geminiThinking}>Thinking...</p>
                      </div>
                    )}
                    {/* Question from Gemini */}
                    {geminiQuestion && (
                      <div
                        style={{
                          margin: "0.5rem 0.6rem",
                          padding: "0.6rem 0.75rem",
                          background: "rgba(99,102,241,0.12)",
                          border: "1px solid rgba(99,102,241,0.3)",
                          borderRadius: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#6366f1",
                            fontWeight: 600,
                            marginBottom: "0.3rem",
                          }}
                        >
                          AI has a question:
                        </div>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "white",
                            margin: 0,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {geminiQuestion}
                        </p>
                      </div>
                    )}
                    {geminiResponse && (
                      <div className={styles.geminiResponseArea}>
                        <p className={styles.geminiResponseText}>
                          {geminiResponse}
                        </p>
                      </div>
                    )}
                    {geminiItinerary.length > 0 && (
                      <div className={styles.geminiItineraryList}>
                        {/* Add all recs button */}
                        {geminiItinerary.some((_, i) => !addedItems.has(i)) && (
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
                            {addingAllRecs ? "Adding..." : `Add all ${aiMode === "schedule" ? "recommendations" : "items"}`}
                          </button>
                        )}
                        {aiMode === "schedule"
                          ? (() => {
                              const grouped: Record<
                                string,
                                {
                                  label: string;
                                  items: {
                                    item: (typeof geminiItinerary)[0];
                                    idx: number;
                                  }[];
                                }
                              > = {};
                              geminiItinerary.forEach((item, i) => {
                                const d = item.startTime ? new Date(item.startTime) : null;
                                const isValid = d && !isNaN(d.getTime());
                                const dateKey = isValid ? d.toISOString().slice(0, 10) : "Unscheduled";
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
                                    <div className={styles.geminiDateHeader}>
                                      {label}
                                    </div>
                                    {items.map(({ item, idx }) => (
                                      <div
                                        key={`${item.location}-${idx}`}
                                        className={`${styles.geminiPlaceCard} ${addedItems.has(idx) ? styles.geminiPlaceCardAdded : ""}`}
                                      >
                                        <div
                                          className={styles.geminiPlaceInfo}
                                        >
                                          <span
                                            className={styles.geminiPlaceName}
                                          >
                                            {item.location}
                                          </span>
                                          {item.startTime && item.endTime && (
                                          <span
                                            className={styles.geminiPlaceTime}
                                          >
                                            {new Date(
                                              item.startTime,
                                            ).toLocaleTimeString("en-US", {
                                              hour: "numeric",
                                              minute: "2-digit",
                                            })}
                                            {" – "}
                                            {new Date(
                                              item.endTime,
                                            ).toLocaleTimeString("en-US", {
                                              hour: "numeric",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                          )}
                                          <span
                                            className={
                                              styles.geminiPlaceDetails
                                            }
                                          >
                                            {item.details}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          className={styles.geminiAddButton}
                                          onClick={() =>
                                            handleAddToSchedule(item, idx)
                                          }
                                          disabled={
                                            addedItems.has(idx) ||
                                            addingItem === idx
                                          }
                                          title={
                                            addedItems.has(idx)
                                              ? "Added"
                                              : "Add to schedule"
                                          }
                                        >
                                          {addedItems.has(idx)
                                            ? "✓"
                                            : addingItem === idx
                                              ? "..."
                                              : "+"}
                                        </button>
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
                                  item: (typeof geminiItinerary)[0];
                                  idx: number;
                                }[]
                              > = {};
                              geminiItinerary.forEach((item, i) => {
                                const cat = item.category || "Other";
                                if (!grouped[cat]) grouped[cat] = [];
                                grouped[cat].push({ item, idx: i });
                              });
                              return Object.entries(grouped).map(
                                ([cat, items]) => (
                                  <div key={cat}>
                                    <div className={styles.geminiDateHeader}>
                                      {cat}
                                    </div>
                                    {items.map(({ item, idx }) => (
                                      <div
                                        key={`${item.location}-${idx}`}
                                        className={`${styles.geminiPlaceCard} ${addedItems.has(idx) ? styles.geminiPlaceCardAdded : ""}`}
                                      >
                                        <div
                                          className={styles.geminiPlaceInfo}
                                        >
                                          <span
                                            className={styles.geminiPlaceName}
                                          >
                                            {item.location}
                                          </span>
                                          <span
                                            className={
                                              styles.geminiPlaceDetails
                                            }
                                          >
                                            {item.details}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          className={styles.geminiAddButton}
                                          onClick={() =>
                                            handleAddToSchedule(item, idx)
                                          }
                                          disabled={
                                            addedItems.has(idx) ||
                                            addingItem === idx
                                          }
                                          title={
                                            addedItems.has(idx)
                                              ? "Added"
                                              : "Add to list"
                                          }
                                        >
                                          {addedItems.has(idx)
                                            ? "✓"
                                            : addingItem === idx
                                              ? "..."
                                              : "+"}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ),
                              );
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
      <Outlet
        context={{
          role,
          showQuestionnaire,
          setShowQuestionnaire,
          sidebarRefreshKey,
          scheduleUpdateKey,
          onQuestionnaireSubmitted: handleQuestionnaireSubmitted,
        }}
      />
    </div>
  );
};

export default VacationSchedule;
