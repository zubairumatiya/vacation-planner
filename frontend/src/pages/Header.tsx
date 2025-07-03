import styles from "../styles/Header.module.css";
import { Link } from "react-router-dom";
import placeholderLogo from "../assets/react.svg";
import addIcon from "../assets/add-icon.svg";
import { AuthContext } from "../context/AuthContext";
import { useContext, useState, useRef, useEffect } from "react";
import profileIcon from "../assets/profile.svg";
import ProfileSideBar from "../components/ProfileSideBar";

const Header = () => {
  const auth = useContext(AuthContext);
  const [isSideBarOpen, setSideBarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setSideBarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <div className={auth?.token ? styles.loggedIn : styles.signIn}>
          {auth?.token ? (
            <button
              ref={buttonRef}
              className={styles.profileButton}
              type="button"
              onClick={() => setSideBarOpen((prev) => !prev)}
            >
              <img src={profileIcon} alt="Profile" />
            </button>
          ) : (
            <Link to="login" className={styles.linkColor}>
              Sign in
            </Link>
          )}
        </div>
        {isSideBarOpen && (
          <div
            className={`${styles.sidebar} ${
              isSideBarOpen ? "styles.open" : "styles.closed"
            }`}
            ref={sidebarRef}
          >
            <ProfileSideBar />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
