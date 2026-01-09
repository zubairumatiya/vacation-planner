import { useParams, useNavigate, NavLink, Outlet } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Schedule.module.css";

type VacationProps = {
  setCostTotal: React.Dispatch<React.SetStateAction<number>>;
  costTotal: number;
};

const apiURL = import.meta.env.VITE_API_URL;
const VacationSchedule = ({ setCostTotal, costTotal }: VacationProps) => {
  const { tripId } = useParams();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [tripLength, setTripLength] = useState(0);

  useEffect(() => {
    const getTrip = async () => {
      const response = await fetch(`${apiURL}/schedule/${tripId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        navigate("/login", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      } else if (response.status === 403) {
        alert("You do not have permission to access this resource");
      } else if (response.status === 404) {
        alert("Error: Trip not found");
      } else if (response.status >= 500) {
        alert(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
      } else if (response.ok) {
        const data = await response.json();
        const convertStart = new Date(data.startDate);
        const convertEnd = new Date(data.endDate);
        let costTotal = 0;
        for (const i of data.schedule) {
          i.startTime = new Date(i.startTime);
          i.endTime = new Date(i.endTime);
          costTotal += Number(i.cost);
        }
        setCostTotal(costTotal);
        // data.schedule.sort(  don't need this i don't think
        //   (a: Schedule, b: Schedule) =>
        //     a.start_time.getTime() - b.start_time.getTime()
        // );
        setTitle(data.tripName);
        const UtcStart = convertStart.getTime();
        const UtcEnd = convertEnd.getTime();
        const length = Math.floor((UtcEnd - UtcStart) / (1000 * 60 * 60 * 24));
        setTripLength(length + 1); // add a day since it is not counting
      }
    };
    getTrip();
  }, []);
  return (
    <div>
      <div className={styles.costAndHeader}>
        <div className={styles.backAndTotal}>
          <div className={styles.backWrapper}>
            <NavLink to="/" className={styles.backButton}>
              &#60;
            </NavLink>
          </div>
          <div className={styles.costWrapper}>
            <h3 className="font-bold">Total Cost: ${costTotal}</h3>
          </div>
        </div>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}&nbsp;</h2>
          <h3 className={styles.length}>- {tripLength} days</h3>
        </header>
      </div>
      <nav className={styles.navWrapper}>
        <ul className={`${styles.nav} ${styles.navPills}`} role="tablist">
          <li className={styles.navItem}>
            <NavLink
              to={`/vacation/${tripId}`}
              end
              className={({ isActive }) =>
                isActive
                  ? `${styles.navLink} ${styles.navLinkActive}`
                  : `${styles.navLink}`
              }
              data-toggle="pill"
            >
              View
            </NavLink>
          </li>
          <li className={styles.navItem}>
            <NavLink
              to={`/vacation/${tripId}/edit`}
              className={({ isActive }) =>
                isActive
                  ? `${styles.navLink} ${styles.navLinkActive}`
                  : `${styles.navLink}`
              }
              data-toggle="pill"
            >
              Edit
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className={styles.hiddenCard}></div>
      <Outlet />
    </div>
  );
};

export default VacationSchedule;
