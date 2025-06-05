import styles from "../styles/Header.module.css";
import { Link } from "react-router-dom";
import placeholderLogo from "../assets/react.svg";
import addIcon from "../assets/react.svg";

const Header = () => {
  return (
    <header className={styles.header}>
      <Link to="/home">
        <img src={placeholderLogo} alt="Vacation-Planner Logo" />
      </Link>
      <Link to="/add-vacation">
        <img src={addIcon} alt="Add Icon" />
      </Link>
    </header>
  );
};

export default Header;
