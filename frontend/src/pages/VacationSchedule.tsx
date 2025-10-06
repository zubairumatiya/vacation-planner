import { useParams, useNavigate, NavLink, Outlet } from "react-router-dom";
import { useState, useEffect, useContext, useRef, Fragment } from "react";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Schedule.module.css";

type Schedule = {
  id: number;
  trip_id: number;
  location: string;
  details: string;
  start_time: Date;
  end_time: Date;
  cost: number;
  multi_day: boolean;
};

const apiURL = import.meta.env.VITE_API_URL;
const VacationSchedule = () => {
  const { tripId } = useParams();
  const [costTotal, setCostTotal] = useState(0);
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [tripLength, setTripLength] = useState(0);

  useEffect(() => {
    const getTrip = async () => {
      const response = await fetch(`${apiURL}/vacation/${tripId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.status === 401) {
        navigate("/login", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      }
      if (response.status === 404) {
        alert("Error: Trip not found");
      }
      if (response.ok) {
        console.log(
          "name:",
          data.tripName,
          "startdate:",
          data.startDate,
          "enddate:",
          data.endDate
        );
        const convertStart = new Date(data.startDate);
        const convertEnd = new Date(data.endDate);
        let costTotal = 0;
        for (const i of data.schedule) {
          i.start_time = new Date(i.start_time);
          i.end_time = new Date(i.end_time);
          costTotal += Number(i.cost);
        }
        setCostTotal(costTotal);
        console.log(data.schedule);
        data.schedule.sort(
          (a: Schedule, b: Schedule) =>
            a.start_time.getTime() - b.start_time.getTime()
        );
        setTitle(data.tripName);
        const UtcStart = convertStart.getTime();
        const UtcEnd = convertEnd.getTime();
        const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);
        setTripLength(length);
      }
    };
    getTrip();
  }, []);
  return (
    <div>
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
