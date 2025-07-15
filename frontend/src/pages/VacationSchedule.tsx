import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
//import styles from "../styles/Schedule.module.css";
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
  const [tripStart, setTripStart] = useState("");
  const [tripEnd, setTripEnd] = useState("");
  const [tripLength, setTripLength] = useState(0);
  const [scheduleDayLabels, setScheduleDayLabels] = useState<string[]>([]); // basically each day
  const [addItem, setAddItem] = useState(false);
  const [itemError, setItemError] = useState(false);
  const [startError, setStartError] = useState(false);
  const [endError, setEndError] = useState(false);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    const getTrip = async () => {
      const response = await fetch(`${apiURL}/vacation/${tripId}`);
      const data = await response.json();
      if (response.status === 200) {
        setSchedule(data.schedule);
        setTitle(data.tripName);
        setTripStart(data.startDate.toLocaleDateString());
        setTripEnd(data.endDate.toLocaleDateString());

        const UtcStart = Date.UTC(
          data.startDate.getFullYear(),
          data.startDate.getMonth(),
          data.startDate.getDate()
        );
        const UtcEnd = Date.UTC(
          data.endDate.getFullYear(),
          data.endDate.getMonth(),
          data.endDate.getDate()
        );
        const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);
        setTripLength(length);
        const daysArr: string[] = [];
        const start = data.startDate;

        for (let i = 0; i <= length; i++) {
          if (i === 0) {
            const day = start.toLocaleDateString("en-us", { weekday: "long" });
            const date = start.toLocaleDateString("en-us", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            daysArr.push(`${day} - ${date}`);
          } else {
            start.setDate(start.getDate() + 1);
            const day = start.toLocaleDateString("en-us", { weekday: "long" });
            const date = start.toLocaleDateString("en-us", {
              year: "numeric",
              month: "short",
              date: "numeric",
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

  const submitItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddItem(false);
    if (token) {
      const formData = new FormData(e.currentTarget);
      const start = formData.get("start");
      const end = formData.get("end");
      const location = formData.get("location");
      let error = false;
      if (!start) {
        error = true;
        setStartError(true);
      }
      if (!end) {
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
          const addingReq = await fetch(`${apiURL}/schedule/${tripId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              start,
              end,
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
        } catch (err) {
          console.log(err);
          return;
        }
      }
    } else {
      navigate("/redirect", {
        state: { message: "Error executing, please sign in again" },
      });
    }
  };

  const formChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (startError) {
      if (e.target.name === "start") {
        if (e.target.value) {
          setStartError(false);
        }
      }
    }
    if (endError) {
      if (e.target.name === "end") {
        if (e.target.value) {
          setEndError(false);
        }
      }
    }
    if (locationError) {
      if (e.target.name === "location") {
        if (e.target.value) {
          setLocationError(false);
        }
      }
    }
  };

  return loading ? (
    <p>Fetching vacation please wait...</p>
  ) : (
    <div>
      <h1>
        {title}: {tripStart}-{tripEnd} {tripLength} days{" "}
        {/*
        <button type="button" onClick={() => setAddItem(true)}>
          Add item
        </button>
        <div>
            {itemError && <p>Error adding item, please make sure input is valid</p>}
          <form onSubmit={(e) => submitItem(true, e)} >
            <label htmlFor="start">Start</label>
            <input type="time" name="start" id="start" />
            <label htmlFor="end">End</label>
            <input type="time" name="end" id="end" />
            <label htmlFor="location">Location</label>
            <input type="text" name="location" id="location" maxLength={300} />
            <label htmlFor="details">Details</label>
            <input type="text" name="details" id="details" maxLength={500} />
            <button type="submit" disabled={itemError}>Add item</button>
          </form>
        </div>
        */}
      </h1>
      {scheduleDayLabels.map((day) => {
        const getDay = day.split("-")[1];
        const dayOfTrip = new Date(getDay).toISOString().split("T")[0];
        return (
          <>
            <div key={day}>
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
                      <p> - {item.details}</p>
                    </div>
                  );
                })}
            </div>
            <button type="button" onClick={() => setAddItem(true)}>
              Add Item
            </button>

            {addItem && (
              <form onSubmit={submitItem}>
                <label htmlFor="start">Start</label>
                <input
                  type="time"
                  name="start"
                  id="start"
                  className={`${startError && "border-red-500"}`}
                  onChange={startError ? formChange : undefined}
                />
                <label htmlFor="end">End</label>
                <input
                  type="time"
                  name="end"
                  id="end"
                  className={`${endError && "border-red-500"}`}
                  onChange={endError ? formChange : undefined}
                />
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  maxLength={300}
                  className={`${locationError && "border-red-500"}`}
                  onChange={locationError ? formChange : undefined}
                />
                <label htmlFor="cost">Cost</label>
                <input
                  type="number"
                  name="cost"
                  id="cost"
                  step="0.01"
                  min="0"
                />
                <label htmlFor="details">Details</label>

                <input
                  type="text"
                  name="details"
                  id="details"
                  maxLength={500}
                />
                <label htmlFor="multday">Multi-day</label>
                <input type="checkbox" name="multiday" id="multiday" />
                <button type="submit" disabled={itemError}>
                  Add item
                </button>
              </form>
            )}
          </>
        );
      })}
    </div>
  );
};

export default VacationSchedule;
