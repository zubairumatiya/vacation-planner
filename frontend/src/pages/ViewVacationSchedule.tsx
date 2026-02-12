import { useContext, useEffect, useState } from "react";
import styles from "../styles/ViewSchedule.module.css";
import { useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import { bucketizeSchedule, makeContainers } from "../utils/timeHelpers";
import CustomTableComponent from "../components/CustomTableComponent";
import hideArrow from "../assets/arrow-drop.svg";
const apiURL = import.meta.env.VITE_API_URL;

const ViewVacationSchedule = () => {
  const { tripId } = useParams();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const [days, setDays] = useState<DayContainer[]>([]);
  const [hideDay, setHideDay] = useState<HideDay>({});

  const [schedule, setSchedule] = useState<DaySchedule>({});

  const [error, setError] = useState<string | null>("");

  const loggingOutRef = auth?.loggingOutRef;
  useEffect(() => {
    if (loggingOutRef?.current) return;
    const getTrip = async () => {
      const response = await fetch(`${apiURL}/schedule/${tripId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        const resData = await response.json();
        if (resData.error === "JwtError") {
          if (logout) {
            await logout();
          }
          return;
        }
        if (refreshInFlightRef == null) {
          console.error("Auth flight ref not set");
          return;
        }
        if (loggingOutRef?.current) return;
        const continueReq: { token: string | null; err: boolean } =
          await refreshFn(apiURL, refreshInFlightRef);
        if (!continueReq.err) {
          if (login && continueReq.token) {
            login(String(continueReq.token));
          }
          const retryReq = await fetch(`${apiURL}/schedule/${tripId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${continueReq.token}`,
            },
          });
          if (!retryReq.ok) {
            setError("Trouble completing request, please try again");
          } else if (retryReq.ok) {
            const data = await retryReq.json();
            const convertStart = new Date(data.startDate);
            const convertEnd = new Date(data.endDate);
            for (const i of data.schedule) {
              // times come from DB as strings, converting to Date obj's
              i.startTime = new Date(i.startTime);
              i.endTime = new Date(i.endTime);
              i.id = String(i.id);
            }

            const UtcStart = convertStart.getTime();
            const UtcEnd = convertEnd.getTime();

            const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);

            const dayContainers: DayContainer[] = makeContainers(
              length,
              convertStart
            );

            const bucketizeItems: DaySchedule = bucketizeSchedule(
              dayContainers,
              data.schedule
            );

            const createHideDays: HideDay = {};
            dayContainers.forEach(
              (v: DayContainer) => (createHideDays[v.day] = false)
            );
            setHideDay(createHideDays);
            setDays(dayContainers);
            setSchedule(bucketizeItems);
            setError(null);
          }
        } else if (continueReq.err) {
          if (logout) {
            await logout();
          }
          return;
        }
      } else if (response.status === 403) {
        setError("You do not have permission to access this resource");
      } else if (response.status === 404) {
        setError("Error: Trip not found");
      } else if (response.status >= 500) {
        setError(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
      } else if (response.ok) {
        const data = await response.json();
        const convertStart = new Date(data.startDate);
        const convertEnd = new Date(data.endDate);
        for (const i of data.schedule) {
          // times come from DB as strings, converting to Date obj's
          i.startTime = new Date(i.startTime);
          i.endTime = new Date(i.endTime);
          i.id = String(i.id);
        }

        const UtcStart = convertStart.getTime();
        const UtcEnd = convertEnd.getTime();

        const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);

        const dayContainers: DayContainer[] = makeContainers(
          length,
          convertStart
        );

        const bucketizeItems: DaySchedule = bucketizeSchedule(
          dayContainers,
          data.schedule
        );

        setDays(dayContainers);
        setSchedule(bucketizeItems);
        setError(null);
      }
    };

    getTrip();
  }, []);
  return error != null ? (
    <p>{error}</p>
  ) : (
    <div className={styles.pageWrapper} tabIndex={-1}>
      {days.map((dayObj: DayContainer) => {
        return (
          <div
            key={dayObj.day}
            className={styles.buttonContainerAndTableContainer}
          >
            <div className={styles.hideButtonWrapper}>
              <button
                className={`${styles.hideButton} ${
                  hideDay[dayObj.day] && styles.buttonClosed
                }`}
                onClick={() =>
                  setHideDay((prev) => ({
                    ...prev,
                    [dayObj.day]: !prev[dayObj.day],
                  }))
                }
              >
                <img
                  src={hideArrow}
                  alt="hideArrow"
                  className={`${styles.hideArrow} ${
                    hideDay[dayObj.day]
                      ? styles.hiddenArrow
                      : styles.unhiddenArrow
                  }`}
                />
              </button>
            </div>
            <div
              className={`${styles.tableNCaption} ${
                hideDay[dayObj.day] && styles.hidden
              }`}
            >
              <div
                className={`${styles.tableCaption} ${
                  hideDay[dayObj.day] && styles.closedTableCaption
                }`}
                onClick={() =>
                  setHideDay((prev) => ({
                    ...prev,
                    [dayObj.day]: !prev[dayObj.day],
                  }))
                }
              >
                {dayObj.label}
              </div>
              <hr
                style={{
                  borderTopWidth: "2px",
                  color: hideDay[dayObj.day] ? "gray" : "white",
                }}
              />
              <div
                id={"tablesContainer"}
                className={`${styles.tableContainer} `}
                tabIndex={-1}
              >
                {!hideDay[dayObj.day] && (
                  <CustomTableComponent
                    key={dayObj.day}
                    dayObj={dayObj}
                    schedule={schedule}
                    setSchedule={setSchedule}
                    viewMode={true}
                    activeId={undefined}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}{" "}
    </div>
  );
};
export default ViewVacationSchedule;
