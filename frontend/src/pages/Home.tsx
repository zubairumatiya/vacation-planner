import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { TripRefreshContext } from "../context/TripRefreshContext";
import styles from "../styles/Home.module.css";
import homeTabsStyles from "../styles/HomeTabs.module.css";
import editIcon from "../assets/icons/edit-icon.svg";
import VacationForm from "../components/VacationForm";
import refreshFn from "../utils/refreshFn";
import dropDownIcon from "../assets/icons/arrow-drop-big.svg";
import SharePanel from "../components/SharePanel";
import { getAvatarSrc } from "../utils/avatarUtils";
import {
  getGuestTrip,
  hasGuestTrip,
  clearGuestTrip,
} from "../utils/guestStorage";
import Tooltip from "../components/Tooltip";

interface FeedTrip {
  id: string;
  tripName: string;
  location: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  isOpenInvite: boolean;
  ownerId: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerUsername: string;
  ownerAvatar: string | null;
  myRole: string | null;
}

interface FeedTravelLog {
  id: string;
  countryName: string;
  createdAt: string;
  visibility: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userUsername: string;
  userAvatar: string | null;
  daysAgo: number;
}

const EyeIcon = ({
  isPublic,
  onToggle,
  editing,
}: {
  isPublic: boolean;
  onToggle: () => void;
  editing: boolean;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setShowTooltip(true), 250);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="relative inline-flex"
      style={{ position: "absolute", left: "0" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!editing) onToggle();
        }}
        style={{
          padding: 0,
          backgroundColor: "transparent",
          border: "none",
          marginRight: "0.5rem",
        }}
        aria-label={isPublic ? "Make trip private" : "Make trip public"}
      >
        {isPublic ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            width="1.5rem"
            height="1.5rem"
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
                d="M22 12.0002C20.2531 15.5764 15.8775 19 11.9998 19C8.12201 19 3.74646 15.5764 2 11.9998"
                stroke="#4a38ee"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>{" "}
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M22 12.0002C20.2531 8.42398 15.8782 5 12.0005 5C8.1227 5 3.74646 8.42314 2 11.9998"
                stroke="#4a38ee"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>{" "}
              <path
                d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
                stroke="#4a38ee"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>{" "}
            </g>
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            width="1.5rem"
            height="1.5rem"
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
                d="M2.68936 6.70456C2.52619 6.32384 2.08528 6.14747 1.70456 6.31064C1.32384 6.47381 1.14747 6.91472 1.31064 7.29544L2.68936 6.70456ZM15.5872 13.3287L15.3125 12.6308L15.5872 13.3287ZM9.04145 13.7377C9.26736 13.3906 9.16904 12.926 8.82185 12.7001C8.47466 12.4742 8.01008 12.5725 7.78417 12.9197L9.04145 13.7377ZM6.37136 15.091C6.14545 15.4381 6.24377 15.9027 6.59096 16.1286C6.93815 16.3545 7.40273 16.2562 7.62864 15.909L6.37136 15.091ZM22.6894 7.29544C22.8525 6.91472 22.6762 6.47381 22.2954 6.31064C21.9147 6.14747 21.4738 6.32384 21.3106 6.70456L22.6894 7.29544ZM19 11.1288L18.4867 10.582V10.582L19 11.1288ZM19.9697 13.1592C20.2626 13.4521 20.7374 13.4521 21.0303 13.1592C21.3232 12.8663 21.3232 12.3914 21.0303 12.0985L19.9697 13.1592ZM11.25 16.5C11.25 16.9142 11.5858 17.25 12 17.25C12.4142 17.25 12.75 16.9142 12.75 16.5H11.25ZM16.3714 15.909C16.5973 16.2562 17.0619 16.3545 17.409 16.1286C17.7562 15.9027 17.8545 15.4381 17.6286 15.091L16.3714 15.909ZM5.53033 11.6592C5.82322 11.3663 5.82322 10.8914 5.53033 10.5985C5.23744 10.3056 4.76256 10.3056 4.46967 10.5985L5.53033 11.6592ZM2.96967 12.0985C2.67678 12.3914 2.67678 12.8663 2.96967 13.1592C3.26256 13.4521 3.73744 13.4521 4.03033 13.1592L2.96967 12.0985ZM12 13.25C8.77611 13.25 6.46133 11.6446 4.9246 9.98966C4.15645 9.16243 3.59325 8.33284 3.22259 7.71014C3.03769 7.3995 2.90187 7.14232 2.8134 6.96537C2.76919 6.87696 2.73689 6.80875 2.71627 6.76411C2.70597 6.7418 2.69859 6.7254 2.69411 6.71533C2.69187 6.7103 2.69036 6.70684 2.68957 6.70503C2.68917 6.70413 2.68896 6.70363 2.68892 6.70355C2.68891 6.70351 2.68893 6.70357 2.68901 6.70374C2.68904 6.70382 2.68913 6.70403 2.68915 6.70407C2.68925 6.7043 2.68936 6.70456 2 7C1.31064 7.29544 1.31077 7.29575 1.31092 7.29609C1.31098 7.29624 1.31114 7.2966 1.31127 7.2969C1.31152 7.29749 1.31183 7.2982 1.31218 7.299C1.31287 7.30062 1.31376 7.30266 1.31483 7.30512C1.31698 7.31003 1.31988 7.31662 1.32353 7.32483C1.33083 7.34125 1.34115 7.36415 1.35453 7.39311C1.38127 7.45102 1.42026 7.5332 1.47176 7.63619C1.57469 7.84206 1.72794 8.13175 1.93366 8.47736C2.34425 9.16716 2.96855 10.0876 3.8254 11.0103C5.53867 12.8554 8.22389 14.75 12 14.75V13.25ZM15.3125 12.6308C14.3421 13.0128 13.2417 13.25 12 13.25V14.75C13.4382 14.75 14.7246 14.4742 15.8619 14.0266L15.3125 12.6308ZM7.78417 12.9197L6.37136 15.091L7.62864 15.909L9.04145 13.7377L7.78417 12.9197ZM22 7C21.3106 6.70456 21.3107 6.70441 21.3108 6.70427C21.3108 6.70423 21.3108 6.7041 21.3109 6.70402C21.3109 6.70388 21.311 6.70376 21.311 6.70368C21.3111 6.70352 21.3111 6.70349 21.3111 6.7036C21.311 6.7038 21.3107 6.70452 21.3101 6.70576C21.309 6.70823 21.307 6.71275 21.3041 6.71924C21.2983 6.73223 21.2889 6.75309 21.2758 6.78125C21.2495 6.83757 21.2086 6.92295 21.1526 7.03267C21.0406 7.25227 20.869 7.56831 20.6354 7.9432C20.1669 8.69516 19.4563 9.67197 18.4867 10.582L19.5133 11.6757C20.6023 10.6535 21.3917 9.56587 21.9085 8.73646C22.1676 8.32068 22.36 7.9668 22.4889 7.71415C22.5533 7.58775 22.602 7.48643 22.6353 7.41507C22.6519 7.37939 22.6647 7.35118 22.6737 7.33104C22.6782 7.32097 22.6818 7.31292 22.6844 7.30696C22.6857 7.30398 22.6867 7.30153 22.6876 7.2996C22.688 7.29864 22.6883 7.29781 22.6886 7.29712C22.6888 7.29677 22.6889 7.29646 22.689 7.29618C22.6891 7.29604 22.6892 7.29585 22.6892 7.29578C22.6893 7.29561 22.6894 7.29544 22 7ZM18.4867 10.582C17.6277 11.3882 16.5739 12.1343 15.3125 12.6308L15.8619 14.0266C17.3355 13.4466 18.5466 12.583 19.5133 11.6757L18.4867 10.582ZM18.4697 11.6592L19.9697 13.1592L21.0303 12.0985L19.5303 10.5985L18.4697 11.6592ZM11.25 14V16.5H12.75V14H11.25ZM14.9586 13.7377L16.3714 15.909L17.6286 15.091L16.2158 12.9197L14.9586 13.7377ZM4.46967 10.5985L2.96967 12.0985L4.03033 13.1592L5.53033 11.6592L4.46967 10.5985Z"
                fill="#8f97a1"
              ></path>{" "}
            </g>
          </svg>
        )}
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-md whitespace-nowrap pointer-events-none">
          <p className="font-medium">{isPublic ? "Public" : "Private"}</p>
          <p className="text-gray-300 text-xs mt-0.5">
            {isPublic
              ? "Name, location & dates visible to friends"
              : "Only you can see this"}
          </p>
        </div>
      )}
    </div>
  );
};

const apiUrl = import.meta.env.VITE_API_URL;

const mapHomeTrip = (raw: Record<string, unknown>): HomeTrip => ({
  id: raw.id as string,
  tripName: raw.tripName as string,
  location: raw.location as string,
  startDate: raw.startDate as string,
  endDate: raw.endDate as string,
  role: raw.role as HomeTrip["role"],
  ownerFirstName: (raw.ownerFirstName as string) || "Unknown",
  ownerLastName: (raw.ownerLastName as string) || "",
  isPublic: raw.isPublic as boolean,
  isOpenInvite: raw.isOpenInvite as boolean,
});

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-us", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const permissionLabel = (role: string) => {
  if (role === "editor") return "editor";
  if (role === "reader") return "view only";
  return "";
};

const Home = () => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const loggingOutRef = auth?.loggingOutRef;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const [trips, setTrips] = useState<HomeTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const editingRef = useRef<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [submitButtonDisabled, setSubmitButtonDisabled] =
    useState<boolean>(false);
  const [submitClicked, setSubmitClicked] = useState<boolean>(false);
  const [updateList, setUpdateList] = useState<boolean>(false);
  const [pastTripsOpen, setPastTripsOpen] = useState(false);
  const [sharePanelTripId, setSharePanelTripId] = useState<string | null>(null);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "friends" ? "friends" : "home";
  const setActiveTab = (tab: "home" | "friends") => setSearchParams({ tab });
  const [feedTrips, setFeedTrips] = useState<FeedTrip[]>([]);
  const [feedLogs, setFeedLogs] = useState<FeedTravelLog[]>([]);
  const [newLogCount, setNewLogCount] = useState(0);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);

  useEffect(() => {
    if (!sharePanelTripId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sharePanelRef.current &&
        !sharePanelRef.current.contains(e.target as Node)
      ) {
        setSharePanelTripId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sharePanelTripId]);

  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (editingRef.current === true) {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
          editingRef.current = false;
          setEditingId("");
        }
      }
    };
    document.addEventListener("keydown", cancel);
    return () => document.removeEventListener("keydown", cancel);
  }, []);

  useEffect(() => {
    if (loggingOutRef?.current) return;
    if (!token) {
      setLoading(false);
      return;
    }
    const getTrips = async () => {
      try {
        const res = await fetch(`${apiUrl}/home`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          const resData = (await res.json()) as ApiErrorResponse;
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
          const continueReq: { token: string | null; err: boolean } =
            await refreshFn(apiUrl, refreshInFlightRef);

          if (!continueReq.err) {
            if (login && continueReq.token) {
              login(String(continueReq.token));
            }
            const retryReq = await fetch(`${apiUrl}/home`, {
              headers: { Authorization: `Bearer ${continueReq.token}` },
            });
            if (!retryReq.ok) {
              alert("Trouble completing request, please try again");
            } else if (retryReq.ok) {
              const retryData = (await retryReq.json()) as Record<
                string,
                unknown
              >[];
              setTrips(retryData.map(mapHomeTrip));
              setLoading(false);
            }
          } else if (continueReq.err) {
            if (logout) {
              logout();
            }
          }
        } else if (res.ok) {
          const data = (await res.json()) as Record<string, unknown>[];
          setTrips(data.map(mapHomeTrip));
          setLoading(false);
        } else {
          alert("Trouble completing req, please try again");
        }
      } catch (err) {
        console.error(err);
      }
    };
    getTrips();
  }, [updateList]);

  useEffect(() => {
    if (activeTab !== "friends" || loggingOutRef?.current) return;
    const getFeed = async () => {
      setLoadingFeed(true);
      try {
        const res = await fetch(`${apiUrl}/friends/feed`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          const resData = (await res.json()) as ApiErrorResponse;
          if (resData.error === "JwtError") {
            if (logout) await logout();
            return;
          }
          if (refreshInFlightRef == null) return;
          const continueReq = await refreshFn(apiUrl, refreshInFlightRef);
          if (!continueReq.err) {
            if (login && continueReq.token) login(String(continueReq.token));
            const retryReq = await fetch(`${apiUrl}/friends/feed`, {
              headers: { Authorization: `Bearer ${continueReq.token}` },
            });
            if (retryReq.ok) {
              const data = (await retryReq.json()) as {
                trips: FeedTrip[];
                travelLogs: FeedTravelLog[];
                newTravelLogCount: number;
              };
              setFeedTrips(data.trips || []);
              setFeedLogs(data.travelLogs || []);
              setNewLogCount(data.newTravelLogCount || 0);
            }
          } else if (logout) {
            logout();
          }
        } else if (res.ok) {
          const data = (await res.json()) as {
            trips: FeedTrip[];
            travelLogs: FeedTravelLog[];
            newTravelLogCount: number;
          };
          setFeedTrips(data.trips || []);
          setFeedLogs(data.travelLogs || []);
          setNewLogCount(data.newTravelLogCount || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingFeed(false);
      }
    };
    if (feedTrips.length === 0 && feedLogs.length === 0) {
      getFeed();
    }
  }, [
    activeTab,
    logout,
    login,
    refreshInFlightRef,
    token,
    apiUrl,
    loggingOutRef,
    feedTrips.length,
    feedLogs.length,
  ]);

  const handleExpandLogs = async () => {
    const wasExpanded = logsExpanded;
    setLogsExpanded(!logsExpanded);
    if (!wasExpanded && newLogCount > 0) {
      setNewLogCount(0);
      try {
        await fetch(`${apiUrl}/friends/feed/seen`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (activeTab === "friends") {
        sessionStorage.setItem(
          "friendsTabScrollPos",
          document.body.scrollTop.toString(),
        );
      }
    };
    document.body.addEventListener("scroll", handleScroll, { passive: true });
    return () => document.body.removeEventListener("scroll", handleScroll);
  }, [activeTab]);

  useEffect(() => {
    if (
      activeTab === "friends" &&
      !loadingFeed &&
      (feedTrips.length > 0 || feedLogs.length > 0)
    ) {
      const scrollPos = sessionStorage.getItem("friendsTabScrollPos");
      if (scrollPos) {
        // Wait for the DOM to paint the lists
        requestAnimationFrame(() => {
          setTimeout(() => {
            document.body.scrollTop = parseInt(scrollPos, 10);
          }, 0);
        });
      }
    }
  }, [activeTab, loadingFeed, feedTrips.length, feedLogs.length]);

  const editTrip = (tripId: string) => {
    setEditing(true);
    editingRef.current = true;
    setEditingId(tripId);
  };

  const checkError = (fieldError: boolean) => {
    setSubmitButtonDisabled(fieldError);
  };

  const handleCancel = () => {
    setEditing(false);
    editingRef.current = false;
    setEditingId("");
  };

  const formSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitClicked(true);
  };

  const checkSubmission = (result: boolean) => {
    if (result) {
      setUpdateList((prev) => !prev);
      setEditingId("");
      editingRef.current = false;
      setEditing(false);
      setSubmitClicked(false);
    }
  };

  const toggleVisibility = useCallback(
    async (tripId: string) => {
      try {
        const res = await fetch(`${apiUrl}/toggle-visibility/${tripId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = (await res.json()) as { is_public: boolean };
          setTrips((prev) =>
            prev.map((t) =>
              t.id === tripId ? { ...t, isPublic: data.is_public } : t,
            ),
          );
        } else if (res.status === 401) {
          const resData = (await res.json()) as ApiErrorResponse;
          if (resData.error === "JwtError") {
            if (logout) await logout();
            return;
          }
          if (refreshInFlightRef == null) return;
          const continueReq = await refreshFn(apiUrl, refreshInFlightRef);
          if (!continueReq.err) {
            if (login && continueReq.token) login(String(continueReq.token));
            const retryReq = await fetch(
              `${apiUrl}/toggle-visibility/${tripId}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${continueReq.token}`,
                },
              },
            );
            if (retryReq.ok) {
              const retryData = (await retryReq.json()) as {
                is_public: boolean;
              };
              setTrips((prev) =>
                prev.map((t) =>
                  t.id === tripId ? { ...t, isPublic: retryData.is_public } : t,
                ),
              );
            }
          } else if (continueReq.err && logout) {
            logout();
          }
        }
      } catch (err) {
        console.error(err);
      }
    },
    [token, login, logout, refreshInFlightRef],
  );

  const handleDelete = async (id: string) => {
    const result = await fetch(`${apiUrl}/delete-vacation/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (result.ok) {
      setTrips((prev) => prev.filter((v: HomeTrip) => v.id !== id));
      setEditing(false);
      editingRef.current = false;
      setEditingId("");
    } else if (result.status === 401) {
      const resData = (await result.json()) as ApiErrorResponse;
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
      const continueReq: { token: string | null; err: boolean } =
        await refreshFn(apiUrl, refreshInFlightRef);
      if (!continueReq.err) {
        if (login && continueReq.token) {
          login(String(continueReq.token));
        }
        const retryReq = await fetch(`${apiUrl}/delete-vacation/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${continueReq.token}`,
          },
        });
        if (!retryReq.ok) {
          alert("Trouble completing request, please try again");
        } else if (retryReq.ok) {
          setTrips((prev) => prev.filter((v: HomeTrip) => v.id !== id));
          setEditing(false);
          editingRef.current = false;
          setEditingId("");
        }
      } else if (continueReq.err) {
        if (logout) {
          await logout();
        }
        return;
      }
    }
  };

  // Split trips into categories
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPast = (trip: HomeTrip) => new Date(trip.endDate) < today;

  const myTrips = trips.filter((t) => t.role === "owner" && !isPast(t));

  const sharedTrips = trips.filter((t) => t.role !== "owner" && !isPast(t));

  const pastTrips = trips
    .filter((t) => isPast(t))
    .sort(
      (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
    );

  const renderTripCard = (v: HomeTrip) => {
    const startFormat = formatDate(v.startDate);
    const endFormat = formatDate(v.endDate);
    const ownerName = `${v.ownerFirstName} ${v.ownerLastName}`;

    if (editingId === v.id) {
      return (
        <form onSubmit={formSubmit} key={v.id}>
          <VacationForm
            preFill={{
              tripName: v.tripName,
              location: v.location,
              startDate: v.startDate,
              endDate: v.endDate,
              id: v.id,
              isPublic: v.isPublic,
              isOpenInvite: v.isOpenInvite,
            }}
            sendSubmissionResult={checkSubmission}
            disableOrNah={checkError}
            submit={submitClicked}
            method="PATCH"
          />
          <button
            type="submit"
            disabled={submitButtonDisabled}
            className="px-40 py-2 rounded bg-indigo-500 text-white pointer-events-auto cursor-pointer hover:bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:opacity-25"
          >
            Submit
          </button>
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" onClick={() => handleDelete(v.id)}>
            Delete
          </button>
        </form>
      );
    }

    return (
      <div id={v.id} key={v.id} className={styles.wrapper}>
        <div className={styles.titleNEdit}>
          <div className="flex items-start gap-2 flex-1">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-fit relative px-8">
                {v.role === "owner" && (
                  <EyeIcon
                    isPublic={v.isPublic}
                    onToggle={() => toggleVisibility(v.id)}
                    editing={editing}
                  />
                )}
                <Link
                  to={`/vacation/${v.id}`}
                  state={{ role: v.role }}
                  className={`${styles.title} ${editing && styles.editing}`}
                  style={{ flex: 1 }}
                >
                  <h2
                    className={`text-xl font-semibold hover:text-indigo-600 ${
                      editing ? "text-gray-500" : "text-indigo-500"
                    }`}
                  >
                    {v.tripName}
                  </h2>
                </Link>
                {v.role === "owner" && (
                  <div
                    className={styles.editIcon}
                    onClick={() => editTrip(v.id)}
                    title={editing ? undefined : "Edit trip"}
                  >
                    {editing ? undefined : (
                      <img src={editIcon} alt="editIcon" />
                    )}
                  </div>
                )}
                <div className={"flex items-center"}>
                  {v.role === "owner" && !editing && (
                    <div
                      className={`${styles.shareIcon} ${sharePanelTripId === v.id ? styles.shareIconOpen : ""}`}
                      title="Share"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setSharePanelTripId((prev) =>
                          prev === v.id ? null : v.id,
                        );
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="1.5rem"
                        height="1.5rem"
                        fill="none"
                        stroke="#4a38ee"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                      {sharePanelTripId === v.id && (
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
                            tripId={v.id}
                            onClose={() => setSharePanelTripId(null)}
                            onToast={showToast}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {v.role !== "owner" && (
                <p className="text-sm font-normal text-gray-500">
                  Owner: {ownerName} ({permissionLabel(v.role)})
                </p>
              )}
            </div>
          </div>
        </div>
        {v.isOpenInvite && (
          <span
            style={{
              backgroundColor: "#16a34a",
              color: "#fff",
              fontSize: "0.65rem",
              fontWeight: 600,
              padding: "1px 8px",
              borderRadius: "9999px",
              whiteSpace: "nowrap",
              lineHeight: "1.4",
            }}
          >
            Open Invite
          </span>
        )}
        <p>{`Start date: ${startFormat}`}</p>
        <p>{`End date: ${endFormat}`}</p>
      </div>
    );
  };

  const renderPastTripCard = (v: HomeTrip) => {
    const startFormat = formatDate(v.startDate);
    const endFormat = formatDate(v.endDate);
    const ownerName = `${v.ownerFirstName} ${v.ownerLastName}`;
    return (
      <div
        id={v.id}
        key={v.id}
        className={styles.wrapper}
        style={{ opacity: 0.5 }}
      >
        <div className={styles.titleNEdit}>
          <Link to={`/vacation/${v.id}`} state={{ role: v.role }} className={styles.title}>
            <div>
              <div className="flex items-center gap-2 justify-center">
                <h2 className="text-xl font-semibold text-indigo-400 hover:text-indigo-500">
                  {v.tripName}
                </h2>
                {v.isOpenInvite && (
                  <span
                    style={{
                      backgroundColor: "#16a34a",
                      color: "#fff",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      padding: "1px 8px",
                      borderRadius: "9999px",
                      whiteSpace: "nowrap",
                      lineHeight: "1.4",
                    }}
                  >
                    Open Invite
                  </span>
                )}
              </div>
              {v.role !== "owner" && (
                <p className="text-sm font-normal text-gray-400">
                  Owner: {ownerName} ({permissionLabel(v.role)})
                </p>
              )}
            </div>
          </Link>
        </div>
        <p>{`Start date: ${startFormat}`}</p>
        <p>{`End date: ${endFormat}`}</p>
      </div>
    );
  };

  const { registerRefresh, unregisterRefresh } = useContext(TripRefreshContext);

  const refreshTrips = useCallback(() => {
    setUpdateList((prev) => !prev);
  }, []);

  useEffect(() => {
    registerRefresh(refreshTrips);
    return () => unregisterRefresh();
  }, [refreshTrips, registerRefresh, unregisterRefresh]);

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

  return (
    <>
      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}

      <div className={homeTabsStyles.navWrapper}>
        <ul className={homeTabsStyles.navPills} role="tablist">
          <li className={homeTabsStyles.navItem}>
            <button
              type="button"
              className={`${homeTabsStyles.navButton} ${activeTab === "home" ? homeTabsStyles.navButtonActive : ""}`}
              onClick={() => setActiveTab("home")}
            >
              Home
            </button>
          </li>
          <li className={homeTabsStyles.navItem}>
            <button
              type="button"
              className={`${homeTabsStyles.navButton} ${activeTab === "friends" ? homeTabsStyles.navButtonActive : ""}`}
              onClick={() => setActiveTab("friends")}
            >
              Friends
            </button>
          </li>
        </ul>
      </div>

      {!loading && activeTab === "home" && (
        <div className={styles.content}>
          {/* My Trips Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className="text-2xl font-bold">My Trips</h2>
            </div>
            <div>
              {!token &&
                hasGuestTrip() &&
                (() => {
                  const gt = getGuestTrip()!;
                  return (
                    <div key="guest" className={styles.wrapper}>
                      <div className={styles.titleNEdit}>
                        <div className="flex items-start gap-2 flex-1">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-fit relative px-8">
                              <Link
                                to="/vacation/guest/edit"
                                className={styles.title}
                                style={{ flex: 1 }}
                              >
                                <h2 className="text-xl font-semibold text-indigo-500 hover:text-indigo-600">
                                  {gt.trip.tripName}
                                </h2>
                              </Link>
                              <Tooltip label="Delete guest trip">
                                <button
                                  type="button"
                                  onClick={() => {
                                    clearGuestTrip();
                                    setUpdateList((prev) => !prev);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#888",
                                    cursor: "pointer",
                                    fontSize: "1.1rem",
                                    padding: "4px 8px",
                                  }}
                                >
                                  &times;
                                </button>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor: "#f59e0b",
                          color: "#111",
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          padding: "1px 8px",
                          borderRadius: "9999px",
                          whiteSpace: "nowrap",
                          lineHeight: "1.4",
                        }}
                      >
                        Guest
                      </span>
                      <p>{`Start date: ${formatDate(gt.trip.startDate)}`}</p>
                      <p>{`End date: ${formatDate(gt.trip.endDate)}`}</p>
                    </div>
                  );
                })()}
              {myTrips.length === 0 && !(!token && hasGuestTrip()) ? (
                <p className={styles.emptyText}>no trips to display...</p>
              ) : (
                myTrips.map((v) => renderTripCard(v))
              )}
            </div>
          </div>

          {/* Shared With Me Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className="text-2xl font-bold">Shared With Me</h2>
            </div>
            <div>
              {sharedTrips.length === 0 ? (
                <p className={styles.emptyText}>
                  no shared trips to display...
                </p>
              ) : (
                sharedTrips.map((v) => renderTripCard(v))
              )}
            </div>
          </div>

          {/* Past Trips Section */}
          {pastTrips.length > 0 && (
            <div className={styles.section}>
              <div
                className={styles.pastTripsContainer}
                onClick={() => setPastTripsOpen((prev) => !prev)}
              >
                <div className={styles.pastTripsHeader}>
                  <h2 className="text-2xl font-bold cursor-pointer select-none text-indigo-400 opacity-50">
                    Past Trips{" "}
                  </h2>
                  <div className={styles.dropDownContainer}>
                    <img
                      src={dropDownIcon}
                      alt="dropDownIcon"
                      className={`${styles.dropDown} ${pastTripsOpen ? styles.arrowOpen : styles.arrowClosed}`}
                    />
                  </div>
                </div>
              </div>
              {pastTripsOpen && (
                <div>{pastTrips.map((v) => renderPastTripCard(v))}</div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "friends" && (
        <div className={styles.content}>
          {!token ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <p
                style={{
                  color: "#999",
                  fontSize: "1rem",
                  marginBottom: "1rem",
                }}
              >
                Sign in to add friends
              </p>
              <Link
                to="/login"
                style={{
                  display: "inline-block",
                  padding: "8px 24px",
                  background: "#2fe782",
                  color: "#111",
                  fontWeight: 600,
                  borderRadius: "9999px",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                }}
              >
                Sign In
              </Link>
            </div>
          ) : loadingFeed ? (
            <p className={homeTabsStyles.emptyText}>Loading friends feed...</p>
          ) : (
            <>
              {/* Currently Tripping - only shows if there are active trips */}
              {feedTrips.filter((ft) => {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                return (
                  new Date(ft.startDate) <= now && new Date(ft.endDate) >= now
                );
              }).length > 0 && (
                <div className={homeTabsStyles.friendSection}>
                  <div className={homeTabsStyles.sectionTitle}>
                    Currently Tripping
                  </div>
                  {feedTrips
                    .filter((ft) => {
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      return (
                        new Date(ft.startDate) <= now &&
                        new Date(ft.endDate) >= now
                      );
                    })
                    .map((ft) => {
                      const numDays = Math.ceil(
                        (new Date(ft.endDate).getTime() -
                          new Date(ft.startDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      );
                      const isShared =
                        ft.myRole === "editor" || ft.myRole === "reader";
                      return (
                        <div key={ft.id} className={homeTabsStyles.tripCard}>
                          <div className={homeTabsStyles.tripCardContent}>
                            <Link
                              to={`/user/${ft.ownerId}`}
                              className={homeTabsStyles.tripCardLeft}
                            >
                              <div className={homeTabsStyles.avatarSmall}>
                                <img
                                  src={getAvatarSrc(ft.ownerAvatar)}
                                  alt=""
                                />
                              </div>
                              <div className={homeTabsStyles.ownerInfo}>
                                <span className={homeTabsStyles.ownerName}>
                                  {ft.ownerFirstName} {ft.ownerLastName}
                                </span>
                                <span className={homeTabsStyles.ownerLink}>
                                  @{ft.ownerUsername}
                                </span>
                              </div>
                            </Link>
                            <div className={homeTabsStyles.tripCardCenter}>
                              {isShared ? (
                                <Link
                                  to={`/vacation/${ft.id}`}
                                  state={{ role: ft.myRole }}
                                  className={homeTabsStyles.tripNameLink}
                                >
                                  {ft.tripName}
                                </Link>
                              ) : (
                                <span className={homeTabsStyles.tripName}>
                                  {ft.tripName}
                                </span>
                              )}
                              {ft.isOpenInvite && (
                                <span className={homeTabsStyles.openInviteTag}>
                                  Open Invite
                                </span>
                              )}
                              {isShared && (
                                <span className={homeTabsStyles.roleTag}>
                                  {ft.myRole === "editor"
                                    ? "editor"
                                    : "view only"}
                                </span>
                              )}
                            </div>
                            <div className={homeTabsStyles.tripCardSecondary}>
                              <div className={homeTabsStyles.tripDetail}>
                                {ft.location}
                              </div>
                              <div className={homeTabsStyles.tripDetail}>
                                {formatDate(ft.startDate)} &middot; {numDays}{" "}
                                day{numDays !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Upcoming Trips */}
              <div className={homeTabsStyles.friendSection}>
                <div className={homeTabsStyles.sectionTitle}>
                  Upcoming Trips
                </div>
                {feedTrips.filter((ft) => {
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  return new Date(ft.startDate) > now;
                }).length === 0 ? (
                  <p className={homeTabsStyles.emptyText}>
                    No upcoming trips from friends.
                  </p>
                ) : (
                  feedTrips
                    .filter((ft) => {
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      return new Date(ft.startDate) > now;
                    })
                    .map((ft) => {
                      const numDays = Math.ceil(
                        (new Date(ft.endDate).getTime() -
                          new Date(ft.startDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      );
                      const isShared =
                        ft.myRole === "editor" || ft.myRole === "reader";
                      return (
                        <div key={ft.id} className={homeTabsStyles.tripCard}>
                          <div className={homeTabsStyles.tripCardContent}>
                            <Link
                              to={`/user/${ft.ownerId}`}
                              className={homeTabsStyles.tripCardLeft}
                            >
                              <div className={homeTabsStyles.avatarSmall}>
                                <img
                                  src={getAvatarSrc(ft.ownerAvatar)}
                                  alt=""
                                />
                              </div>
                              <div className={homeTabsStyles.ownerInfo}>
                                <span className={homeTabsStyles.ownerName}>
                                  {ft.ownerFirstName} {ft.ownerLastName}
                                </span>
                                <span className={homeTabsStyles.ownerLink}>
                                  @{ft.ownerUsername}
                                </span>
                              </div>
                            </Link>
                            <div className={homeTabsStyles.tripCardCenter}>
                              {isShared ? (
                                <Link
                                  to={`/vacation/${ft.id}`}
                                  state={{ role: ft.myRole }}
                                  className={homeTabsStyles.tripNameLink}
                                >
                                  {ft.tripName}
                                </Link>
                              ) : (
                                <span className={homeTabsStyles.tripName}>
                                  {ft.tripName}
                                </span>
                              )}
                              {ft.isOpenInvite && (
                                <span className={homeTabsStyles.openInviteTag}>
                                  Open Invite
                                </span>
                              )}
                              {isShared && (
                                <span className={homeTabsStyles.roleTag}>
                                  {ft.myRole === "editor"
                                    ? "editor"
                                    : "view only"}
                                </span>
                              )}
                            </div>
                            <div className={homeTabsStyles.tripCardSecondary}>
                              <div className={homeTabsStyles.tripDetail}>
                                {ft.location}
                              </div>
                              <div className={homeTabsStyles.tripDetail}>
                                {formatDate(ft.startDate)} &middot; {numDays}{" "}
                                day{numDays !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* New Travel Logs */}
              <div className={homeTabsStyles.friendSection}>
                <div
                  className={homeTabsStyles.sectionTitleCollapsible}
                  onClick={handleExpandLogs}
                >
                  <span>New Travel Logs</span>
                  <span className={newLogCount > 0 ? homeTabsStyles.badge : homeTabsStyles.badgeSeen}>
                    {feedLogs.length}
                  </span>
                  <img
                    src={dropDownIcon}
                    alt=""
                    className={`${homeTabsStyles.collapseArrow} ${logsExpanded ? homeTabsStyles.collapseArrowOpen : ""}`}
                  />
                </div>
                {logsExpanded &&
                  (feedLogs.length === 0 ? (
                    <p className={homeTabsStyles.emptyText}>No new logs</p>
                  ) : (
                    feedLogs.map((fl) => (
                      <div key={fl.id} className={homeTabsStyles.logCard}>
                        {fl.visibility === "public" ? (
                          <Link
                            to={`/user/${fl.userId}/country/${fl.id}`}
                            className={homeTabsStyles.logName}
                          >
                            {fl.countryName}
                          </Link>
                        ) : (
                          <span className={homeTabsStyles.logNamePrivate}>
                            {fl.countryName}
                          </span>
                        )}
                        <div className={homeTabsStyles.logMeta}>
                          <Link
                            to={`/user/${fl.userId}`}
                            className={homeTabsStyles.ownerInfoLink}
                          >
                            <span className={homeTabsStyles.ownerName}>
                              {fl.userFirstName} {fl.userLastName}
                            </span>
                            <span className={homeTabsStyles.logOwner}>
                              @{fl.userUsername}
                            </span>
                          </Link>
                          <div className={homeTabsStyles.daysAgo}>
                            {fl.daysAgo === 0 ? "today" : `${fl.daysAgo}d ago`}
                          </div>
                        </div>
                      </div>
                    ))
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Home;
