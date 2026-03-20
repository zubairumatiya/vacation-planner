import styles from "../styles/Header.module.css";
import { Link } from "react-router-dom";
// import addIcon from "../assets/icons/add-icon.svg";
import vacationPlannerLogo from "../assets/icons/vacation-planner.svg";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import { TripRefreshContext } from "../context/TripRefreshContext";
import { useContext, useState, useRef, useEffect, useCallback } from "react";
// import profileIcon from "../assets/icons/profile.svg";
import ProfileSideBar from "../components/ProfileSideBar";
import InboxPanel from "../components/InboxPanel";
import Tooltip from "../components/Tooltip";

const apiUrl = import.meta.env.VITE_API_URL;

const Header = () => {
  const auth = useContext(AuthContext);
  const { login, logout, refreshInFlightRef, loggingOutRef } = auth ?? {};
  const tripRefreshContext = useContext(TripRefreshContext);
  const [isSideBarOpen, setSideBarOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);


  const fetchUnreadCount = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const res = await fetch(`${apiUrl}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      } else if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "JwtError") {
          await logout?.();
          return;
        }
        if (loggingOutRef?.current) return;
        const result = await refreshFn(apiUrl, refreshInFlightRef!);
        if (result.err || !result.token) {
          await logout?.();
          return;
        }
        login?.(result.token);
        const retryRes = await fetch(`${apiUrl}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${result.token}` },
        });
        if (retryRes.ok) {
          const data = await retryRes.json();
          setUnreadCount(data.count);
        }
      }
    } catch {
      // silent
    }
  }, [auth?.token, login, logout, refreshInFlightRef, loggingOutRef]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setSideBarOpen(false);
        setInboxOpen(false);
      }
    };
    const scrollHide = () => {
      if (isSideBarOpen) {
        setSideBarOpen(false);
        setInboxOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.body.addEventListener("scroll", scrollHide);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.removeEventListener("scroll", scrollHide);
    };
  }, [isSideBarOpen]);

  const handleProfileButtonClick = () => {
    if (isSideBarOpen && inboxOpen) {
      setInboxOpen(false);
    } else {
      setSideBarOpen((prev) => !prev);
      setInboxOpen(false);
    }
  };

  const handleInboxClick = () => {
    setInboxOpen(true);
  };

  const handleInboxBack = () => {
    setInboxOpen(false);
  };

  return (
    <header className={styles.header}>
      <Tooltip label="Home">
      <Link to="/" className={styles.logoLink}>
        <img src={vacationPlannerLogo} alt="Vacation Planner" className={styles.logo} />
      </Link>
      </Tooltip>
      <div className={styles.rightItems}>
        <div className={styles.addTrip}>
          <Tooltip label="Add a trip">
          <Link
            to="/add-vacation"
            className={styles.iconLink}
            aria-label="Add a trip"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
          </Tooltip>
        </div>
        <div className={auth?.token ? styles.loggedIn : styles.signInWrapper}>
          {auth?.token ? (
            <div className={styles.profileBtnWrapper}>
              <Tooltip label="Profile and settings">
              <button
                ref={buttonRef}
                className={styles.profileButton}
                type="button"
                onClick={handleProfileButtonClick}
                aria-label="Profile and settings"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
              </Tooltip>
              {unreadCount > 0 && <span className={styles.notificationDot} />}
            </div>
          ) : (
            <Link to="/login" className={styles.signInButton}>
              Sign in
            </Link>
          )}
        </div>

        {isSideBarOpen && (
          <div
            className={`${styles.sidebar} ${
              inboxOpen ? styles.sidebarExpanded : ""
            }`}
            ref={sidebarRef}
          >
            {inboxOpen ? (
              <InboxPanel
                onBack={handleInboxBack}
                onUnreadCountChange={setUnreadCount}
                onTripAccepted={tripRefreshContext.refreshTrips}
              />
            ) : (
              <ProfileSideBar
                onClose={() => setSideBarOpen(false)}
                onInboxClick={handleInboxClick}
                unreadCount={unreadCount}
              />
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
