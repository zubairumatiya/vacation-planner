import styles from "../styles/Header.module.css";
import { Link } from "react-router-dom";
import placeholderLogo from "../assets/react.svg";
import addIcon from "../assets/add-icon.svg";
import { AuthContext } from "../context/AuthContext";
import { TripRefreshContext } from "../context/TripRefreshContext";
import { useContext, useState, useRef, useEffect, useCallback } from "react";
import profileIcon from "../assets/profile.svg";
import ProfileSideBar from "../components/ProfileSideBar";
import InboxPanel from "../components/InboxPanel";

const apiUrl = import.meta.env.VITE_API_URL;

const Header = () => {
  const auth = useContext(AuthContext);
  const tripRefreshContext = useContext(TripRefreshContext);
  const [isSideBarOpen, setSideBarOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!auth?.token) return;
    try {
      const res = await fetch(`${apiUrl}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {
      // silent
    }
  }, [auth?.token]);

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
      <Link to="/" title="Home">
        <img src={placeholderLogo} alt="Vacation-Planner Logo" />
      </Link>
      <div className={styles.rightItems}>
        <div className={styles.addTrip}>
          <Link to="/add-vacation" title="Add a trip">
            <img src={addIcon} alt="Add Icon" />
          </Link>
        </div>
        <div
          className={auth?.token ? styles.loggedIn : styles.signIn}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {auth?.token ? (
            <div className={styles.profileBtnWrapper}>
              <button
                ref={buttonRef}
                className={`btnPrimary ${styles.profileButton}`}
                type="button"
                onClick={handleProfileButtonClick}
              >
                <img src={profileIcon} alt="Profile" />
              </button>
              {unreadCount > 0 && (
                <span className={styles.notificationDot} />
              )}
            </div>
          ) : (
            <Link
              to="login"
              className={hover ? styles.linkColorHoverBorder : styles.linkColor}
            >
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
