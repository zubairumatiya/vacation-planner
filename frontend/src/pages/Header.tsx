import styles from "../styles/Header.module.css";
import { Link } from "react-router-dom";
import placeholderLogo from "../assets/react.svg";
import addIcon from "../assets/add-icon.svg";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";

const Header = () => {
  const auth = useContext(AuthContext);
  return (
    <header className={styles.header}>
      <Link to="/" title="Home">
        <img src={placeholderLogo} alt="Vacation-Planner Logo" />
      </Link>
      <div className={styles.rightItems}>
        <div className={styles.signIn}>
          {typeof auth?.token === "string" ? undefined : (
            <Link to="login" className={styles.linkColor}>
              Sign in
            </Link>
          )}
        </div>
        <Link to="/add-vacation" title="Add a trip">
          <img src={addIcon} alt="Add Icon" />
        </Link>
      </div>
    </header>
  );
};

export default Header;
