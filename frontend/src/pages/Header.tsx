import styles from "../styles/Header.module.css";
import { Link } from "react-router-dom";
import addIcon from "../assets/icons/add-icon.svg";
import { AuthContext } from "../context/AuthContext";
import { TripRefreshContext } from "../context/TripRefreshContext";
import { useContext, useState, useRef, useEffect, useCallback } from "react";
import profileIcon from "../assets/icons/profile.svg";
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
      <Link to="/" title="Home" className={styles.logoLink}>
        <svg
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.logo}
        >
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></g>
          <g id="SVGRepo_iconCarrier">
            {" "}
            <path d="M0 0h48v48H0z" fill="none"></path>{" "}
            <g id="Shopicon">
              {" "}
              <path d="M40,15h4c0-6.065-4.935-11-11-11c-3.72,0-7.008,1.861-9,4.695C22.008,5.861,18.72,4,15,4C8.935,4,4,8.935,4,15h4 c0-3.859,3.14-7,7-7c1.337,0,2.583,0.383,3.646,1.036C18.434,9.013,18.219,9,18,9c-3.309,0-6,2.691-6,6h4c0-1.103,0.897-2,2-2 c1.082,0,1.96,0.865,1.994,1.938l-1.778,15.108C17.937,30.019,17.645,30,17.328,30c-2.22,0-3.458,0.743-4.362,1.285 C12.224,31.73,11.775,32,10.663,32c-1.111,0-1.56-0.269-2.302-0.715C7.458,30.743,6.22,30,4,30v4c1.111,0,1.56,0.269,2.302,0.715 C7.206,35.257,8.443,36,10.663,36s3.458-0.743,4.362-1.285C15.768,34.27,16.216,34,17.328,34c1.111,0,1.559,0.269,2.301,0.715 C20.532,35.257,21.77,36,23.989,36c2.221,0,3.459-0.743,4.363-1.285C29.096,34.27,29.544,34,30.656,34 c1.114,0,1.563,0.27,2.308,0.716C33.868,35.258,35.106,36,37.328,36s3.46-0.742,4.364-1.284C42.437,34.27,42.886,34,44,34v-4 c-2.222,0-3.46,0.742-4.364,1.284C38.892,31.73,38.442,32,37.328,32s-1.563-0.27-2.308-0.716C34.116,30.742,32.878,30,30.656,30 c-0.311,0-0.598,0.017-0.873,0.044l-1.777-15.106C28.04,13.865,28.919,13,30,13c1.103,0,2,0.897,2,2h4c0-3.309-2.691-6-6-6 c-0.218,0-0.434,0.013-0.646,0.036C30.418,8.383,31.663,8,33,8C36.859,8,40,11.141,40,15z"></path>{" "}
              <path d="M37.328,40c-1.114,0-1.563-0.27-2.308-0.716C34.116,38.742,32.878,38,30.656,38c-2.221,0-3.458,0.742-4.362,1.285 C25.551,39.73,25.103,40,23.989,40c-1.111,0-1.559-0.269-2.301-0.715C20.785,38.743,19.548,38,17.328,38 c-2.22,0-3.458,0.743-4.362,1.285C12.224,39.73,11.775,40,10.663,40c-1.111,0-1.56-0.269-2.302-0.715C7.458,38.743,6.22,38,4,38v4 c1.111,0,1.56,0.269,2.302,0.715C7.206,43.257,8.443,44,10.663,44s3.458-0.743,4.362-1.285C15.768,42.27,16.216,42,17.328,42 c1.111,0,1.559,0.269,2.301,0.715C20.532,43.257,21.77,44,23.989,44c2.221,0,3.459-0.743,4.363-1.285 C29.096,42.27,29.544,42,30.656,42c1.114,0,1.563,0.27,2.308,0.716C33.868,43.258,35.106,44,37.328,44s3.46-0.742,4.364-1.284 C42.437,42.27,42.886,42,44,42v-4c-2.222,0-3.46,0.742-4.364,1.284C38.892,39.73,38.442,40,37.328,40z"></path>{" "}
            </g>{" "}
          </g>
        </svg>
      </Link>
      <div className={styles.rightItems}>
        <div className={styles.addTrip}>
          <Link
            to="/add-vacation"
            className={styles.iconLink}
            title="Add a trip"
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
                className={styles.profileButton}
                type="button"
                onClick={handleProfileButtonClick}
                title="Profile and settings"
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
              {unreadCount > 0 && <span className={styles.notificationDot} />}
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
