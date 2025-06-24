import placeholderLogo from "../assets/react.svg";
import { Link } from "react-router-dom";
import styles from "../styles/SimpleHeader.module.css";

const SimpleHeader = () => {
  return (
    <header className={styles.header}>
      <Link to="/">
        <img src={placeholderLogo} alt="Vacation-Planner-Logo" />
      </Link>
    </header>
  );
};

export default SimpleHeader;
