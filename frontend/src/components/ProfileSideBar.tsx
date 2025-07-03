import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import styles from "../styles/ProfileSideBar.module.css";

const ProfileSideBar = () => {
  const auth = useContext(AuthContext);

  return (
    <div className={styles.sidebarContainer}>
      <ul className={styles.ul}>
        <li>
          <Link to="/">Profile</Link>
        </li>
        <li>
          <Link to="/login" onClick={() => auth?.logout()}>
            Sign out
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default ProfileSideBar;
