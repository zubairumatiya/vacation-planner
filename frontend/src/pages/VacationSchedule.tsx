import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Schedule.module.css";
import CustomTimePicker from "../components/CustomTimePicker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
const apiURL = import.meta.env.VITE_API_URL;

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
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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

        for (const i of data.schedule) {
          i.start_time = new Date(i.start_time);
        }
        data.schedule.sort(
          (a: Schedule, b: Schedule) =>
            a.start_time.getTime() - b.start_time.getTime()
        );
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
      setStartTimePick((hour + ":" + minute + " " + meridiem).trim());
    } else {
      setEndTimePick((hour + ":" + minute + " " + meridiem).trim());
    }
  };

  const submitItem = async (
    e: React.FormEvent<HTMLFormElement>,
    dateAdded: string,
    index: number
  ) => {
    e.preventDefault();
    setAddingItem(false);
    if (token) {
      const formData = new FormData(e.currentTarget);
      const location = formData.get("location");
      let error = false;
      let startDateAssembler;
      let endDateAssembler;
      console.log("dateAdded: ", dateAdded);
      /*
      if (!startTimePick) {
        error = true;
        setStartError(true);
        alert("start time invalid");
        return;
      }*/
      if (!startTimePick || startTimePick === ": ") {
        startDateAssembler = new Date(dateAdded);
      } else {
        console.log("assembling...");
        startDateAssembler = new Date(dateAdded + " " + startTimePick);
      }
      /*
      if (!endTimePick) {
        error = true;
        setEndError(true);
        alert("end time invalid");
        return;
      }*/

      if (!endTimePick || endTimePick === ": ") {
        endDateAssembler = new Date(dateAdded); // TO-DO this will have to be different for multi-day
      } else {
        endDateAssembler = new Date(dateAdded + " " + endTimePick);
      }
      if (!location) {
        error = true;
        setLocationError(true);
        alert("location invalid value");
        return;
      }
      console.log("startTimePick:", startTimePick, "endTimePick:", endTimePick);
      console.log("start:", startDateAssembler, "end:", endDateAssembler);
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
              start: startDateAssembler,
              end: endDateAssembler,
              location,
              details: formData.get("details"),
              cost: formData.get("cost"),
              multiday: formData.get("multiday"),
            }),
          });
          if (addingReq.ok) {
            const data = await addingReq.json();
            setSchedule((prev) => [...prev, data.addedItem]);
            setIndividualAddition((prev) => {
              prev[index] = false;
              return [...prev];
            });
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      textAreaRef.current!.blur();
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
            <div className={styles.tableContainer}>
              <table>
                <caption>{day}</caption>
                <thead>
                  <tr>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Location</th>
                    <th>Cost</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule
                    .filter((v: Schedule) => {
                      const startDay = new Date(v.start_time)
                        .toISOString()
                        .split("T")[0];
                      return startDay === dayOfTrip;
                    })
                    .map((item: Schedule) => {
                      let sTime;
                      if (item.start_time) {
                        sTime = new Date(item.start_time).toLocaleTimeString(
                          [],
                          {
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        );
                      } else {
                        sTime = "12:00 AM";
                      }
                      let eTime;
                      if (item.end_time) {
                        eTime = new Date(item.end_time).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                      } else {
                        eTime = "12:01 AM";
                      }

                      return (
                        <tr key={item.id} id={item.id + ""}>
                          <td>{sTime}</td>
                          <td>{eTime}</td>
                          <td>{item.location}</td>
                          <td>{`$${item.cost}`}</td>
                          <td>{item.details}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
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
              <div className={styles.formWrapper}>
                <form
                  className={styles.form}
                  onSubmit={(e) => submitItem(e, dayOfTrip, index)}
                >
                  <div
                    className={`${styles.itemElement} ${styles.timeWrapper}`}
                  >
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

                  <div
                    className={`${styles.itemElement} ${styles.timeWrapper}`}
                  >
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
                  <div className={`${styles.itemElement}`}>
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
                  </div>
                  <div className={`${styles.itemElement}`}>
                    <label htmlFor="cost">Cost</label>
                    <input
                      className={styles.input}
                      type="number"
                      name="cost"
                      id="cost"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div
                    className={`${styles.itemElement} ${styles.textAreaContainer} ${styles.textureOverlay}`}
                  >
                    <label htmlFor="details" className={styles.detailsLabel}>
                      Details
                    </label>
                    <div className={styles.fakeContainer}>
                      <textarea
                        onKeyDown={handleKeyDown}
                        ref={textAreaRef}
                        className={`${styles.input} 
                      ${styles.textArea}`}
                        rows={4}
                        cols={50}
                        name="details"
                        id="details"
                        maxLength={500}
                      />
                    </div>
                  </div>
                  <div className={`${styles.itemElement}`}>
                    <label htmlFor="multday">Multi-day</label>
                    <input
                      type="checkbox"
                      className={`${styles.input} ${styles.multiDay}`}
                      name="multiday"
                      id="multiday"
                    />
                  </div>
                  <div className={`${styles.itemElement}`}>
                    <button
                      type="submit"
                      className={`btnPrimary`}
                      disabled={itemError}
                    >
                      Add item
                    </button>
                  </div>
                  <div className={`${styles.itemElement}`}>
                    <button
                      className={`btnPrimary ${styles.xButton}`}
                      type="button"
                      onClick={() => addItemHelper(index, "cancel")}
                    >
                      X
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VacationSchedule;
