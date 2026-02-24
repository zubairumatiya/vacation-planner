import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import styles from "../styles/ProfileSideBar.module.css";

interface ProfileSideBarProps {
  onClose: () => void;
  onInboxClick: () => void;
  unreadCount: number;
}

const ProfileSideBar = ({
  onClose,
  onInboxClick,
  unreadCount,
}: ProfileSideBarProps) => {
  const auth = useContext(AuthContext);

  const handleSignOut = () => {
    auth?.logout();
  };

  return (
    <div className={styles.sidebarContainer}>
      <ul className={styles.ul}>
        <li>
          <Link to="/profile" onClick={onClose}>
            Profile
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={onInboxClick}
            className={styles.inboxBtn}
          >
            Inbox
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={handleSignOut}
            className={styles.signoutButton}
          >
            Sign out
          </button>
        </li>
      </ul>
    </div>
  );
};

export default ProfileSideBar;
