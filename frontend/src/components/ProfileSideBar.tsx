import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import styles from "../styles/ProfileSideBar.module.css";

const ProfileSideBar = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate("/login");
    auth?.logout();
  };
  //  <Link to="/login" onClick={() => handleSignOut()}>
  //  Sign out
  //</Link>
  return (
    <div className={styles.sidebarContainer}>
      <ul className={styles.ul}>
        <li>
          <Link to="/">Profile</Link>
        </li>
        <li>
          <button type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </li>
      </ul>
    </div>
  );
};

export default ProfileSideBar;
