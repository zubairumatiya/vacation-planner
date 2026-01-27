import styles from "../styles/Header.module.css";
import { Link } from "react-router-dom";
import placeholderLogo from "../assets/react.svg";
import addIcon from "../assets/add-icon.svg";
import { AuthContext } from "../context/AuthContext";
import { useContext, useState, useRef, useEffect } from "react";
import profileIcon from "../assets/profile.svg";
import ProfileSideBar from "../components/ProfileSideBar";

const Header = () => {
  //const navigate = useNavigate();

  const auth = useContext(AuthContext);
  const [isSideBarOpen, setSideBarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);

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
    const scrollHide = () => {
      if (isSideBarOpen) {
        setSideBarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.body.addEventListener("scroll", scrollHide);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.removeEventListener("scroll", scrollHide);
    };
  }, [isSideBarOpen]);

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
          //onClick={() => navigate("/login")}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {auth?.token ? (
            <button
              ref={buttonRef}
              className={`btnPrimary ${styles.profileButton}`}
              type="button"
              onClick={() => setSideBarOpen((prev) => !prev)}
            >
              <img src={profileIcon} alt="Profile" />
            </button>
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
