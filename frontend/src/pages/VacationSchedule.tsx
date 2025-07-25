import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Schedule.module.css";
import CustomTimePicker from "../components/CustomTimePicker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
const apiURL = import.meta.env.VITE_API_URL;

type Schedule = {
  id: number;
  trip_id: number;
  activity: string;
  details: string;
  start_time: Date;
  end_time: Date;
  cost: number;
  multi_day: boolean;
};

const VacationSchedule = () => {
  const { tripId } = useParams();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [title, setTitle] = useState("");
  const [tripStart, setTripStart] = useState<Date>(new Date());
  const [tripEnd, setTripEnd] = useState<Date>(new Date());
  const [tripLength, setTripLength] = useState(0);
  const [scheduleDayLabels, setScheduleDayLabels] = useState<string[]>([]); // basically each day
  const [addingItem, setAddingItem] = useState<boolean>(false); // buttons for each day will have to have their own boolean to show or not to
  const [individualAddition, setIndividualAddition] = useState<boolean[]>([
    false,
  ]);
  const [itemError, setItemError] = useState(false);
  const [startError, setStartError] = useState(false);
  const [endError, setEndError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [message, setMessage] = useState("Fetching vacation please wait...");
  const [startTimePick, setStartTimePick] = useState<string | null>(null); // i think we will need two of these for start and end, which means we can't have multiple adding schedules open
  const [endTimePick, setEndTimePick] = useState<string | null>(null);

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
        setMessage("Error: Trip not found");
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
        const convertStartPreserved = new Date(data.startDate);
        const convertStart = new Date(data.startDate);
        const convertEnd = new Date(data.endDate);
        setSchedule(data.schedule);
        setTitle(data.tripName);
        setTripStart(convertStartPreserved);
        setTripEnd(convertEnd);

        const UtcStart = Date.UTC(
          convertStart.getFullYear(),
          convertStart.getMonth(),
          convertStart.getDate()
        );
        const UtcEnd = Date.UTC(
          convertEnd.getFullYear(),
          convertEnd.getMonth(),
          convertEnd.getDate()
        );
        const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);
        setTripLength(length);
        const daysArr: string[] = [];

        for (let i = 0; i <= length; i++) {
          if (i === 0) {
            const day = convertStart.toLocaleDateString("en-us", {
              weekday: "long",
            });
            const date = convertStart.toLocaleDateString("en-us", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            daysArr.push(`${day} - ${date}`);
          } else {
            convertStart.setDate(convertStart.getDate() + 1);
            const day = convertStart.toLocaleDateString("en-us", {
              weekday: "long",
            });
            const date = convertStart.toLocaleDateString("en-us", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            daysArr.push(`${day} - ${date}`);
          }
        }
        setScheduleDayLabels(daysArr);
        setLoading(false);
      }
    };

    getTrip();
  }, []);

  useEffect(() => {
    if (!startError && !endError && !locationError) {
      setItemError(false);
    }
  }, [startError, endError, locationError]);

  const addItemHelper = (i: number, cancel?: string) => {
    console.log("is there a cancel", cancel);
    if (cancel) {
      setAddingItem(false);
    } else {
      setAddingItem(true);
    }
    setIndividualAddition((prev) => {
      const newArr = [...prev];
      newArr[i] = !newArr[i];
      return newArr;
    });
  };
  // was used when i wanted to be able to keep multiple add trips open for multiple days

  const constructDate = (
    which: "start" | "end",
    hour: string,
    minute: string,
    meridiem: string
  ) => {
    if (startError) {
      if (which === "start") {
        if (hour && minute && meridiem) {
          setStartError(false);
        }
      }
    }
    if (endError) {
      if (which === "end") {
        if (hour && minute && meridiem) {
          setEndError(false);
        }
      }
    }
    if (which === "start") {
      setStartTimePick(hour + ":" + minute + " " + meridiem);
    } else {
      setEndTimePick(hour + ":" + minute + " " + meridiem);
    }
  };

  const submitItem = async (
    e: React.FormEvent<HTMLFormElement>,
    ind: number
  ) => {
    e.preventDefault();
    setAddingItem(false);
    if (token) {
      const formData = new FormData(e.currentTarget);
      const location = formData.get("location");
      let error = false;
      if (!startTimePick) {
        error = true;
        setStartError(true);
      }
      if (!endTimePick) {
        error = true;
        setEndError(true);
      }
      if (!location) {
        error = true;
        setLocationError(true);
      }
      if (error) {
        return;
      } else {
        try {
          const addingReq = await fetch(`${apiURL}/vacation/${tripId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              startTimePick,
              endTimePick,
              location,
              details: formData.get("details"),
              cost: formData.get("cost"),
              multiday: formData.get("multiday"),
            }),
          });
          if (addingReq.ok) {
            const data = await addingReq.json();
            setSchedule((prev) => [...prev, data.addedItem]);
          }
          if (addingReq.status === 401) {
            navigate("/redirect", {
              state: { message: "Session expired, redirecting to log in..." },
            });
            // should prob replace this with a function inside auth to renew token via refresh token, and if i can't find any or the refresh is expired then navigate to login
          }
        } catch (err) {
          console.log(err);
          return;
        }
      }
    } else {
      navigate("/redirect", {
        state: { message: "Session expired, redirecting to log in..." },
      });
    }
  };

  const formChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (locationError) {
      if (e.target.name === "location") {
        if (e.target.value) {
          setLocationError(false);
        }
      }
    }
  };

  return loading ? (
    <p>{message}</p>
  ) : (
    <div>
      <button
        className="btnPrimary"
        type="button"
        onClick={() => alert("click")}
      >
        Test button
      </button>
      <h1>
        {title}: {tripStart.toLocaleDateString()} -{" "}
        {tripEnd.toLocaleDateString()} - {tripLength} days{" "}
      </h1>
      {scheduleDayLabels.map((day, index) => {
        const getDay = day.split("-")[1];
        const dayOfTrip = new Date(getDay).toISOString().split("T")[0];
        return (
          <div key={day}>
            <div>
              <h3>{day}</h3>

              {schedule
                .filter(
                  (v: Schedule) =>
                    v.start_time.toISOString().split("T")[0] === dayOfTrip
                )
                .map((item: Schedule) => {
                  const sTime = item.start_time.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  const eTime = item.end_time.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  return (
                    <div key={item.id}>
                      <p>{`${sTime}-${eTime} - `}</p>
                      <h5>{item.activity}</h5>
                      <p>{item.cost}</p>
                      <p> - {item.details}</p>
                    </div>
                  );
                })}
            </div>
            {!individualAddition[index] ? (
              <button
                type="button"
                disabled={addingItem}
                onClick={() => addItemHelper(index)}
                className={`${styles.addButton} btnPrimary`}
              >
                Add Item
              </button>
            ) : (
              <form onSubmit={(e) => submitItem(e, index)}>
                <div className={styles.timeWrapper}>
                  <span>Start </span>
                  <CustomTimePicker
                    className={startError ? "border-red-500" : undefined}
                    onChange={(
                      hour: string,
                      minute: string,
                      meridiem: string
                    ) => constructDate("start", hour, minute, meridiem)}
                  />
                </div>

                <div className={styles.timeWrapper}>
                  <span>End </span>
                  <CustomTimePicker
                    className={startError ? "border-red-500" : undefined}
                    onChange={(
                      hour: string,
                      minute: string,
                      meridiem: string
                    ) => constructDate("end", hour, minute, meridiem)}
                  />
                </div>
                {/*

                    <label htmlFor="end">End</label>
                <input
                type="time"
                name="end"
                id="end"
                className={`${endError && "border-red-500"} ${styles.input}`}
                onChange={endError ? formChange : undefined}
                />
            */}
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  maxLength={300}
                  className={`${locationError && "border-red-500"} ${
                    styles.input
                  }`}
                  onChange={locationError ? formChange : undefined}
                />
                <label htmlFor="cost">Cost</label>
                <input
                  className={styles.input}
                  type="number"
                  name="cost"
                  id="cost"
                  step="0.01"
                  min="0"
                />
                <label htmlFor="details">Details</label>

                <input
                  className={styles.input}
                  type="text"
                  name="details"
                  id="details"
                  maxLength={500}
                />
                <label htmlFor="multday">Multi-day</label>
                <input
                  type="checkbox"
                  className={styles.input}
                  name="multiday"
                  id="multiday"
                />
                <button
                  type="submit"
                  className={`btnPrimary`}
                  disabled={itemError}
                >
                  Add item
                </button>
                <button
                  className={`btnPrimary ${styles.xButton}`}
                  type="button"
                  onClick={() => addItemHelper(index, "cancel")}
                >
                  X
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VacationSchedule;
