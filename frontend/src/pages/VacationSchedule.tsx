import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Schedule.module.css";
import CustomTimePicker from "../components/CustomTimePicker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import editIcon from "../assets/edit-icon.svg";
import dragIcon from "../assets/dragger.svg";
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

type Prefill = {
  location: string;
  cost: number;
  details: string;
  multiDay: boolean;
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
  const [editLineId, setEditLineId] = useState<number | null>(null);
  const locationEditRef = useRef<HTMLInputElement>(null);
  const costEditRef = useRef<HTMLInputElement>(null);
  const detailEditRef = useRef<HTMLTextAreaElement>(null);
  const multiDayEditRef = useRef<HTMLInputElement>(null);
  const [test, setTest] = useState("");
  const [preFill, setPreFill] = useState<Prefill>({
    location: "",
    cost: 0,
    details: "",
    multiDay: false,
  });
  const dragIndexRef = useRef(-1);

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
          i.end_time = new Date(i.end_time);
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
          convertStart.getMonth(), //FIX
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
              // FIX
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
        console.log("days Arr", daysArr);
        setScheduleDayLabels(daysArr);
        setLoading(false);
      }
    };

    getTrip();
  }, []);

  const reSort = (arr: Array<Schedule>) => {
    arr.map((v) => {
      v.start_time = new Date(v.start_time);
      v.end_time = new Date(v.end_time);
      return v;
    });
    arr.sort(
      (a: Schedule, b: Schedule) =>
        a.start_time.getTime() - b.start_time.getTime()
    );
    return arr;
  };

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

  useEffect(() => {
    if (locationEditRef.current) {
      locationEditRef.current.value = test;
    }
  }, [locationEditRef, test]);

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

  const setEndDate = (newStartTime: Date, currentEndTime: Date): Date => {
    const difference =
      (currentEndTime.getTime() - newStartTime.getTime()) / (1000 * 60 * 60);

    if (currentEndTime.getTime() < newStartTime.getTime()) {
      const newEndHour = prefixZero(newStartTime.getUTCHours() + 1);
      const sameEndMinutes = prefixZero(currentEndTime.getUTCMinutes());
      const extractNewDate = newStartTime.toISOString().split("T")[0];
      console.log(
        "end is less than start",
        new Date(`${extractNewDate}T${newEndHour}:${sameEndMinutes}:00Z`)
      );
      return new Date(`${extractNewDate}T${newEndHour}:${sameEndMinutes}:00Z`);
    } else if (difference > 24) {
      console.log(
        "greater than 24 hours",
        new Date(newStartTime.getTime() + 23 * 60 * 60 * 1000)
      );
      return new Date(newStartTime.getTime() + 23 * 60 * 60 * 1000);
    } else {
      console.log("no change needed", currentEndTime);
      return currentEndTime;
    }
  };

  useEffect(() => {
    if (locationEditRef.current) {
      locationEditRef.current.value = preFill.location;
    }
    if (costEditRef.current) {
      costEditRef.current.value = String(preFill.cost);
    }
    if (detailEditRef.current) {
      detailEditRef.current.value = preFill.details;
    }
    if (preFill.multiDay) {
      if (multiDayEditRef.current) {
        multiDayEditRef.current.checked = true;
      }
    } else {
      if (multiDayEditRef.current) multiDayEditRef.current.checked = false;
    }
  }, [editLineId]);

  const customISOTime = (date: string, time: string) => {
    const timeSplit = time.split(" ");
    const meridiem = timeSplit[1];
    const hourNMinutes = timeSplit[0].split(":");
    let hours = hourNMinutes[0];
    const minutes = hourNMinutes[1];
    if (meridiem.toLowerCase() === "pm") {
      hours = String(Number(hours) + 12);
    }

    return `${date}T${hours}:${minutes}:00Z`;
  };

  const submitAddItem = async (
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
        startDateAssembler = customISOTime(dateAdded, "00:00 AM");
      } else {
        startDateAssembler = customISOTime(dateAdded, startTimePick);
      }
      /*
      if (!endTimePick) {
        error = true;
        setEndError(true);
        alert("end time invalid");
        return;
      }*/

      if (!endTimePick || endTimePick === ": ") {
        endDateAssembler = customISOTime(dateAdded, "00:00 AM"); // TO-DO this will have to be different for multi-day
      } else {
        endDateAssembler = customISOTime(dateAdded, endTimePick);
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
              multiDay: formData.get("multiday"),
            }),
          });
          if (addingReq.ok) {
            const data = await addingReq.json();
            setSchedule((prev) => {
              return reSort([...prev, data.addedItem]);
            });
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

  const submitEdit = async (
    e: React.MouseEvent,
    dateAdded: string,
    itemID: number
  ) => {
    e.preventDefault();
    let startDateAssembler;
    let endDateAssembler;
    if (!startTimePick || startTimePick === ": ") {
      startDateAssembler = customISOTime(dateAdded, "00:00 AM");
    } else {
      startDateAssembler = customISOTime(dateAdded, startTimePick);
    }

    if (!endTimePick || endTimePick === ": ") {
      endDateAssembler = customISOTime(dateAdded, "00:00 AM"); // TO-DO this will have to be different for multi-day
    } else {
      endDateAssembler = customISOTime(dateAdded, endTimePick);
    }
    console.log("dateAdded:", dateAdded);
    console.log("startTimePick", startTimePick);
    console.log("endTimePick", endTimePick);
    console.log("start", startDateAssembler, "end", endDateAssembler);

    const details: string = detailEditRef.current
      ? detailEditRef.current.value
      : "";
    const location: string = locationEditRef.current
      ? locationEditRef.current.value
      : "";
    const cost: string = costEditRef.current ? costEditRef.current.value : "";
    const multiDay: boolean = multiDayEditRef.current
      ? multiDayEditRef.current.checked
      : false;

    try {
      const response = await fetch(`${apiURL}/schedule/${itemID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start: startDateAssembler,
          end: endDateAssembler,
          location,
          cost,
          details,
          multiDay,
        }),
      });
      if (response.ok) {
        console.log("YAHOOOO");
        const data = await response.json();
        setEditLineId(null);
        setAddingItem(false);
        setSchedule(
          (prev) =>
            reSort(prev.map((v) => (v.id === itemID ? data.updatedData : v))) // yeah, you can stick a whole .map as a param haha really cool, because .map returns and array
        );
      } else if (response.status === 401) {
        navigate("/redirect", {
          state: { message: "Session expired, redirecting to log in..." },
        });
        // should prob replace this with a function inside auth to renew token via refresh token, and if i can't find any or the refresh is expired then navigate to login
      } else {
        console.log("something went wrong editing");
      }
    } catch (err) {
      console.log("failed to update item ~~~~~ ", err);
    }
  };

  const submitDelete = async (e: React.MouseEvent, itemID: number) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiURL}/schedule/${itemID}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setEditLineId(null);
        setAddingItem(false);
        setSchedule((prev) => prev.filter((v) => v.id !== itemID));
        // might have to remove from our react schedule item using itemID
      } else if (response.status === 401) {
        navigate("/redirect", {
          state: { message: "Session expired, redirecting to log in..." },
        });
        // should prob replace this with a function inside auth to renew token via refresh token, and if i can't find any or the refresh is expired then navigate to login
      } else {
        console.log("~~~~ error deleting item");
      }
    } catch (err) {
      console.log(err);
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

  const handleEdit = (
    e: React.MouseEvent,
    id: number,
    preFilledLocation: string,
    preFilledCost: number,
    preFilledDetails: string,
    preFilledMultiDay: boolean
  ) => {
    e.preventDefault();
    setTest(preFilledLocation);
    setPreFill({
      location: preFilledLocation,
      cost: preFilledCost,
      details: preFilledDetails,
      multiDay: preFilledMultiDay,
    });
    setEditLineId(id);
    setAddingItem(true); // let's not allow adding items when editing an item
  };

  const cancelAdd = () => {
    setAddingItem(false);
    setEditLineId(null);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLTableCellElement>,
    itemID: number,
    index: number
  ) => {
    dragIndexRef.current = index;
    e.dataTransfer.setData("text/plain", String(itemID));
  };

  const handleDragDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    const target = e.target as HTMLElement;
    let targetIndex = Number(target.closest("tr")?.dataset.index);
    const copy = schedule.slice();
    const removedElement = copy.splice(dragIndexRef.current, 1);
    let finalArr: Schedule[] = schedule;

    const tableTarget = String(target.closest("table")?.id);
    const dropDay: Date = new Date(tableTarget);

    if (isNaN(targetIndex)) {
      //if we drag to an empty day

      const UTCDestination: number = Date.UTC(
        dropDay.getUTCFullYear(),
        dropDay.getUTCMonth(),
        dropDay.getUTCDate()
      );

      // find the spot where it eclipses the date we are trying to place it in and the hop back one index
      targetIndex =
        schedule.findIndex(
          // do we need thiss? why not just use drop day and paste the time
          (v) =>
            Date.UTC(
              v.start_time.getFullYear(), //FIX to get UTC
              v.start_time.getMonth(),
              v.start_time.getDate()
            ) > UTCDestination
        ) - 1;
      if (targetIndex === -2) {
        //this will trigger if we are placing it at the bottom of schedule since there is no item that will be > UTCOrigin so it returns -1
        targetIndex = schedule.length - 1;
      }

      const assembleArr: Schedule[] = [
        ...copy.slice(0, targetIndex), // explanation here - our target index is now going to look different in an array with one less element (for any elements that come after the one we remove)
        removedElement[0],
        ...copy.slice(targetIndex),
      ];
      finalArr = changeDropTime(assembleArr, targetIndex, true, dropDay);
    } else if (targetIndex === dragIndexRef.current) {
      //if some one picks it up but doesn't drop it elsewhere
      dragIndexRef.current = -1;
      return;
    } else {
      console.log("place in between");
      console.log("targetIndex: " + targetIndex);
      const assembleArr: Schedule[] = [
        ...copy.slice(0, targetIndex), // explanation here - our target index is now going to look different in an array with one less element (for any elements that come after the one we remove)
        removedElement[0],
        ...copy.slice(targetIndex),
      ];
      console.log("assemble", assembleArr);
      finalArr = changeDropTime(assembleArr, targetIndex, false, dropDay);
    }

    const updatedItem = finalArr[targetIndex];
    console.log(updatedItem.start_time);
    const result = await fetch(`${apiURL}/update-time/${updatedItem.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ start: updatedItem.start_time }), //TODO - WILL HAVE TO INCORPORATE END TIME HERE
    });
    if (result.ok) {
      setSchedule(finalArr);
    } else {
      alert("error processing change");
    }
    dragIndexRef.current = -1;
  };

  const prefixZero = (x: number): string => {
    if (x <= 9) {
      return "0" + x;
    }
    return "" + x;
  };

  const addMeridiem = (militaryTime: string) => {
    let hour = Number(militaryTime.split(":")[0]);
    const minute = militaryTime.split(":")[1];
    let meridiem;
    if (hour > 11) {
      if (hour !== 12) {
        hour = hour - 12;
      }
      meridiem = "PM";
    } else {
      if (hour === 0) {
        hour = 12;
      }
      meridiem = "AM";
    }
    return `${hour}:${minute} ${meridiem}`;
  };
  /*
  const getLocalDate = (toBeConverted: Date): string => {
    const year = toBeConverted.getUTCFullYear();
    const month = prefixZero(toBeConverted.getUTCMonth() + 1);
    const day = prefixZero(toBeConverted.getUTCDate());
    return year + "-" + month + "-" + day;
  };*/

  const changeDropTime = (
    finalArr: Schedule[],
    targetIndex: number,
    emptyTable?: boolean,
    newDay?: Date
  ) => {
    // shockingly all we need is the final arr and target index. Why?? Because our value always becomes the targetIndex whether we go above or below. because we slice where the target is never included but then added immedialtely after which then becomes the targetIndex. It can get confusing because it seems to get added above or below our original target, which visually is true but, we are working with indexes, which make it more simple - it's as simple as hey give me your spot. Especially with the idea of removing an element from the array and then placing it back in, our ideas can turn quickly into whats indexes get shifted where what goes
    if (emptyTable) {
      if (!newDay) {
        console.log("error in finding new date to place on");
        return schedule;
      }
      const preserveTime = finalArr[targetIndex].start_time
        .toISOString()
        .split("T")[1];
      const day = newDay.toISOString().split("T")[0];

      const constructDate = new Date(`${day}T${preserveTime}`);
      console.log("TESTING: " + constructDate);
      finalArr[targetIndex].start_time = constructDate;
      finalArr[targetIndex].end_time = setEndDate(
        constructDate,
        finalArr[targetIndex].end_time
      );
      console.log("end date:" + finalArr[targetIndex].end_time);
      return finalArr;
    }
    if (targetIndex === 0) {
      const dateAfter: Date = finalArr[targetIndex + 1].start_time;
      const newDate = finalArr[targetIndex + 1].start_time
        .toISOString()
        .split("T")[0];
      if (dateAfter.getUTCHours() === 0) {
        const constructDate = new Date(`${newDate}T00:00:00Z`);
        finalArr[targetIndex].end_time = setEndDate(
          constructDate,
          finalArr[targetIndex].end_time
        );
        finalArr[targetIndex].start_time = constructDate;
        return finalArr;
      } else {
        const newHour = dateAfter.getUTCHours() - 1;
        const newHourMod = prefixZero(newHour);
        const minutes: string = prefixZero(
          finalArr[targetIndex].start_time.getUTCMinutes()
        );
        const constructDate = new Date(
          `${newDate}T${newHourMod}:${minutes}:00Z`
        );
        finalArr[targetIndex].start_time = constructDate;
        finalArr[targetIndex].end_time = setEndDate(
          constructDate,
          finalArr[targetIndex].end_time
        );
        return finalArr;
      }
    } else {
      const dateBefore: Date = finalArr[targetIndex - 1].start_time; //TODO hmm we have a dilemma. I think we can always get the day correct from the table becasue of newDay, but the problem now is placement within a table, as it currently stands, any newly dropped "in between" items derive their time from above so if i drop something from a later day into a day with one item, it will grab the time from the one above which is a different day. So in this case we would need a new time as well
      const newDate: string = finalArr[targetIndex - 1].start_time
        .toISOString()
        .split("T")[0];

      const newHour: number = dateBefore.getUTCHours() + 1;
      const newHourMod: string = prefixZero(newHour);
      const minutes: string = prefixZero(
        finalArr[targetIndex].start_time.getUTCMinutes()
      );

      const constructDate = new Date(`${newDate}T${newHourMod}:${minutes}:00Z`);
      console.log(constructDate);
      finalArr[targetIndex].start_time = constructDate;
      finalArr[targetIndex].end_time = setEndDate(
        constructDate,
        finalArr[targetIndex].end_time
      );
      return finalArr;
    }
  };

  return loading ? (
    <p>{message}</p>
  ) : (
    <div className={styles.pageWrapper}>
      <div className={styles.backWrapper}>
        <Link to="/" className={styles.backButton}>
          &#60;
        </Link>
      </div>
      <button
        className="btnPrimary"
        type="button"
        onClick={() => alert("click")}
      >
        Test button
      </button>
      <h1>
        {title}: {tripStart.toLocaleDateString()} - {/* FIX */}
        {tripEnd.toLocaleDateString()} - {tripLength} days{" "}
      </h1>
      {scheduleDayLabels.map((day, index) => {
        // day = Tuesday - Jul 15, 2025
        // all of these are local times as of now
        const getDay = day.split("-")[1];
        console.log("getday", getDay);
        const dayOfTrip = new Date(getDay).toISOString().split("T")[0]; // Aug 1, 2025 -> 2025-08-01
        return (
          <div key={day}>
            <div className={styles.tableContainer}>
              <table
                onDrop={(e) => handleDragDrop(e)}
                onDragOver={(e) => e.preventDefault()}
                id={day}
              >
                <caption>{day}</caption>
                <thead>
                  <tr>
                    <th>Drag-hide-this</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th className={styles.cellHeader}>Location</th>
                    <th>Cost</th>
                    <th>Details</th>
                    <th>Multi-day</th>
                    <th>Edit-hide-this</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule
                    .map((v, i): { value: Schedule; index: number } => ({
                      value: v,
                      index: i,
                    })) // this is a wrapper so we can use the original index after the filter so we can drag and drop as a whole array rather than an array for each day
                    .filter(({ value }, i) => {
                      const startDay = new Date(value.start_time)
                        .toISOString()
                        .split("T")[0];
                      if (i === 0) {
                        // this is all for testing
                        console.log(dayOfTrip);
                      }
                      return startDay === dayOfTrip;
                    })
                    .map(({ value, index }) => {
                      let sTime;
                      if (value.start_time) {
                        sTime = addMeridiem(
                          value.start_time.toUTCString().slice(-12, -7)
                        );
                      } else {
                        sTime = "12:00 AM";
                      }
                      let eTime;
                      if (value.end_time) {
                        eTime = addMeridiem(
                          value.end_time.toUTCString().slice(-12, -7)
                        );
                      } else {
                        eTime = "12:01 AM";
                      }

                      //        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Iterate divider~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

                      return (
                        <tr
                          key={value.id}
                          id={value.id + ""}
                          data-index={index}
                          draggable="true"
                          className={`${
                            index === dragIndexRef.current && styles.dragging
                          }`}
                        >
                          {value.id === editLineId ? (
                            <>
                              <td>
                                <button
                                  type="button"
                                  className={styles.xButton}
                                  onClick={cancelAdd}
                                >
                                  Cancel
                                </button>
                              </td>
                              <td>
                                <CustomTimePicker
                                  className={
                                    startError ? "border-red-500" : undefined
                                  }
                                  onChange={(
                                    hour: string,
                                    minute: string,
                                    meridiem: string
                                  ) =>
                                    constructDate(
                                      "start",
                                      hour,
                                      minute,
                                      meridiem
                                    )
                                  }
                                  preTime={sTime}
                                />
                              </td>

                              <td>
                                <CustomTimePicker
                                  className={
                                    startError ? "border-red-500" : undefined
                                  }
                                  onChange={(
                                    hour: string,
                                    minute: string,
                                    meridiem: string
                                  ) =>
                                    constructDate("end", hour, minute, meridiem)
                                  }
                                  preTime={eTime}
                                />
                              </td>

                              <td>
                                <input
                                  type="text"
                                  name="location"
                                  id="location"
                                  maxLength={300}
                                  className={`${
                                    locationError && "border-red-500"
                                  } ${styles.input}`}
                                  ref={locationEditRef}
                                />
                              </td>

                              <td>
                                <input
                                  className={styles.input}
                                  type="number"
                                  name="cost"
                                  id="cost"
                                  step="0.01"
                                  min="0"
                                  ref={costEditRef}
                                />
                              </td>

                              <td>
                                <div
                                  className={`${styles.itemElement} ${styles.textAreaContainer} ${styles.textureOverlay}`}
                                >
                                  <div className={styles.fakeContainer}>
                                    <textarea
                                      onKeyDown={handleKeyDown}
                                      className={`${styles.input} 
                      ${styles.textArea}`}
                                      rows={4}
                                      cols={50}
                                      name="details"
                                      id="details"
                                      maxLength={500}
                                      ref={detailEditRef}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  name="editMultDay"
                                  id="editMultiDay"
                                  ref={multiDayEditRef}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    submitEdit(e, dayOfTrip, value.id)
                                  }
                                >
                                  submit edit
                                </button>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={(e) => submitDelete(e, value.id)}
                                >
                                  delete
                                </button>
                              </td>
                            </>
                          ) : (
                            //          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Editing divider~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

                            <>
                              <td
                                draggable="true"
                                onDragStart={(e) =>
                                  handleDragStart(e, value.id, index)
                                }
                              >
                                <img
                                  className={styles.dragButton}
                                  src={dragIcon}
                                  alt="drag"
                                />
                              </td>
                              <td>{sTime}</td>
                              <td>{eTime}</td>
                              <td>{value.location}</td>
                              <td>{`$${value.cost}`}</td>
                              <td>{value.details}</td>
                              <td>{value.multi_day ? "yes" : "no"}</td>
                              <td>
                                <img
                                  className={styles.editIcon}
                                  src={editIcon}
                                  alt="edit-icon"
                                  onClick={(e) =>
                                    handleEdit(
                                      e,
                                      value.id,
                                      value.location,
                                      value.cost,
                                      value.details,
                                      value.multi_day
                                    )
                                  }
                                />
                              </td>
                            </>
                          )}
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
              //                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Adding item divider~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

              <div className={styles.formWrapper}>
                <form
                  className={styles.form}
                  onSubmit={(e) => submitAddItem(e, dayOfTrip, index)}
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
                      preTime={undefined}
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
                      preTime={undefined}
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
                    <label htmlFor="multiday">Multi-day</label>
                    <input
                      type="checkbox"
                      tabIndex={0}
                      className={`${styles.input} ${styles.multiDay}`}
                      name="multiday"
                      id="multiday"
                    />
                  </div>
                  <div className={`${styles.itemElement}`}>
                    <button
                      type="submit"
                      tabIndex={0}
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
