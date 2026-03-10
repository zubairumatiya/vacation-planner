import vacationPlannerLogo from "../assets/icons/vacation-planner.svg";
import { Link } from "react-router-dom";
import styles from "../styles/SimpleHeader.module.css";

const SimpleHeader = () => {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logoLink}>
        <img
          src={vacationPlannerLogo}
          alt="Vacation Planner"
          className={styles.logo}
        />
      </Link>
    </header>
  );
};

export default SimpleHeader;
