import { useContext, useEffect, useState } from "react";
import styles from "../styles/ViewSchedule.module.css";
import { useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import refreshFn from "../utils/refreshFn";
import {
  bucketizeSchedule,
  makeContainers,
  toScheduleList,
} from "../utils/timeHelpers";
import CustomViewTableComponent from "../components/CustomViewTableComponent";
import hideArrow from "../assets/icons/arrow-drop.svg";
import Tooltip from "../components/Tooltip";
const apiURL = import.meta.env.VITE_API_URL;

const ViewVacationSchedule = ({ refreshKey }: { refreshKey: number }) => {
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

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedCalendarDay, setSelectedCalendarDay] =
    useState<DayContainer | null>(null);

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
        const resData = (await response.json()) as ApiErrorResponse;
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
            const data = (await retryReq.json()) as TripScheduleResponse;
            const convertStart = new Date(data.startDate);
            const convertEnd = new Date(data.endDate);
            const scheduleItems = toScheduleList(data.schedule);

            const UtcStart = convertStart.getTime();
            const UtcEnd = convertEnd.getTime();

            const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);

            const dayContainers: DayContainer[] = makeContainers(
              length,
              convertStart,
            );

            const bucketizeItems: DaySchedule = bucketizeSchedule(
              dayContainers,
              scheduleItems,
            );

            const createHideDays: HideDay = {};
            dayContainers.forEach(
              (v: DayContainer) => (createHideDays[v.day] = false),
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
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
        );
      } else if (response.ok) {
        const data = (await response.json()) as TripScheduleResponse;
        const convertStart = new Date(data.startDate);
        const convertEnd = new Date(data.endDate);
        const scheduleItems = toScheduleList(data.schedule);

        const UtcStart = convertStart.getTime();
        const UtcEnd = convertEnd.getTime();

        const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);

        const dayContainers: DayContainer[] = makeContainers(
          length,
          convertStart,
        );

        const bucketizeItems: DaySchedule = bucketizeSchedule(
          dayContainers,
          scheduleItems,
        );

        setDays(dayContainers);
        setSchedule(bucketizeItems);
        setError(null);
      }
    };

    getTrip();
  }, [refreshKey]);
  return error != null ? (
    <p>{error}</p>
  ) : (
    <div className={styles.outerWrapper}>
      <div className={styles.viewToggleContainer}>
        <Tooltip label="List View">
        <button
          className={`${styles.toggleButton} ${viewMode === "list" ? styles.active : ""}`}
          style={{ display: "flex", alignItems: "center" }}
          onClick={() => setViewMode("list")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "20px", height: "20px" }}
          >
            <path
              d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        </Tooltip>
        <Tooltip label="Calendar View">
        <button
          className={`${styles.toggleButton} ${viewMode === "calendar" ? styles.active : ""}`}
          style={{ display: "flex", alignItems: "center" }}
          onClick={() => {
            setViewMode("calendar");
            setSelectedCalendarDay(null);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "20px", height: "20px" }}
          >
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g
              id="SVGRepo_tracerCarrier"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></g>
            <g id="SVGRepo_iconCarrier">
              <path
                d="M3 9H21M7 3V5M17 3V5M6 12H8M11 12H13M16 12H18M6 15H8M11 15H13M16 15H18M6 18H8M11 18H13M16 18H18M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              ></path>
            </g>
          </svg>
        </button>
        </Tooltip>
      </div>
      <div className={styles.pageWrapper} tabIndex={-1}>
      {viewMode === "list" ? (
        days.map((dayObj: DayContainer) => {
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
                    <CustomViewTableComponent
                      key={dayObj.day}
                      dayObj={dayObj}
                      schedule={schedule}
                      viewMode={true}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : selectedCalendarDay ? (
        <div className={styles.calendarDayView}>
          <div className={styles.dayNav}>
            <Tooltip label="Previous Day">
            <button
              className={styles.navButton}
              disabled={
                days.findIndex((d) => d.day === selectedCalendarDay.day) === 0
              }
              onClick={() => {
                const idx = days.findIndex(
                  (d) => d.day === selectedCalendarDay.day,
                );
                if (idx > 0) setSelectedCalendarDay(days[idx - 1]);
              }}
            >
              <svg
                viewBox="1 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: "24px", height: "24px" }}
              >
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            </Tooltip>
            <h3>{selectedCalendarDay.label}</h3>
            <Tooltip label="Next Day">
            <button
              className={styles.navButton}
              disabled={
                days.findIndex((d) => d.day === selectedCalendarDay.day) ===
                days.length - 1
              }
              onClick={() => {
                const idx = days.findIndex(
                  (d) => d.day === selectedCalendarDay.day,
                );
                if (idx < days.length - 1)
                  setSelectedCalendarDay(days[idx + 1]);
              }}
            >
              <svg
                viewBox="0 0 22 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: "24px", height: "24px" }}
              >
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            </Tooltip>
          </div>
          <button
            className={styles.backButton}
            onClick={() => setSelectedCalendarDay(null)}
          >
            Back to Calendar
          </button>
          <div
            className={styles.tableNCaption}
            style={{ width: "100%", maxWidth: "800px" }}
          >
            <div className={styles.tableContainer}>
              <CustomViewTableComponent
                dayObj={selectedCalendarDay}
                schedule={schedule}
                viewMode={true}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.calendarGrid}>
          {days.map((dayObj) => {
            const splitLabel = dayObj.label.split(" - ");
            const dayOfWeek = splitLabel[0];
            const dateNum = splitLabel[1] || "";
            return (
              <div
                key={dayObj.day}
                className={styles.calendarCell}
                onClick={() => setSelectedCalendarDay(dayObj)}
              >
                <div className={styles.calendarCellDate}>{dayOfWeek}</div>
                <div className={styles.calendarCellDateNum}>{dateNum}</div>
                <div className={styles.calendarCellItems}>
                  {schedule[dayObj.day]?.length || 0} items
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
export default ViewVacationSchedule;
