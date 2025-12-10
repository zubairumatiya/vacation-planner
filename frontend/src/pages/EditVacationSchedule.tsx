import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/EditSchedule.module.css";
import CustomTimePicker from "../components/CustomTimePicker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import { DragOverlay, type UniqueIdentifier } from "@dnd-kit/core";
import CustomTableComponent from "../components/CustomTableComponent";
import { EditScheduleContext } from "../context/EditScheduleContext";
import { customISOTime } from "../utils/timeHelpers";
import NormalRow from "../components/NormalRow";

polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
});
const apiURL = import.meta.env.VITE_API_URL;

export type Schedule = {
  id: UniqueIdentifier;
  tripId: number;
  location: string;
  details: string;
  startTime: Date;
  endTime: Date;
  cost: number;
  multiDay: boolean;
};

export type DraggingState = {
  container: string | null;
  index: number | null;
};

type ScheduleProps = {
  loadFirst: () => void;
  getMapValues: (a: Vp, b: string, c: string) => void;
  schedule: DaySchedule;
  setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
  dragRow: Schedule | null;
  setCostTotal: React.Dispatch<React.SetStateAction<number>>;
};

const EditVacationSchedule = ({
  schedule,
  setSchedule,
  setCostTotal,
  ...props
}: ScheduleProps) => {
  const {
    preFill,
    editLineId,
    addingItem,
    setAddingItem,
    dayOfTripRef,
    cancelAdd,
    editSubmitButtonRef,
    setEndError,
    setStartError,
    startTimePick,
    endTimePick,
    setLocationError,
    textAreaFocus,
    holdEndTime,
    holdStartTime,
    detailEditRef,
    multiDayEditRef,
    setMultiDayStyle,
    setEditMultiDay,
    editMultiDay,
    constructDate,
    startError,
    endError,
    locationError,
    locationEditRef,
    costEditRef,
    handleTextInput,
  } = useContext(EditScheduleContext);

  const { tripId } = useParams();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayContainer[]>([]); // each day(table)
  const [individualAddition, setIndividualAddition] = useState<boolean[]>([
    false,
  ]);
  const [itemError, setItemError] = useState(false);
  const [message, setMessage] = useState("");

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [errMessage, setErrMessage] = useState("");

  useEffect(() => {
    const getTrip = async () => {
      const response = await fetch(`${apiURL}/schedule/${tripId}`, {
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
        //console.log(
        //  "name:",
        //  data.tripName,
        //  "startdate:",
        //  data.startDate,
        //  "enddate:",
        //  data.endDate
        //);
        props.getMapValues(data.gVp, data.location, data.gId);
        const convertStart = new Date(data.startDate);
        const convertEnd = new Date(data.endDate);
        for (const i of data.schedule) {
          // times are already stored in db with timezone (should be UTC), so doing this just makes date objects in utc time.
          i.startTime = new Date(i.startTime);
          i.endTime = new Date(i.endTime);
          i.id = String(i.id);
        }

        //console.log(data.schedule);
        data.schedule.sort(
          (a: Schedule, b: Schedule) =>
            a.startTime.getTime() - b.startTime.getTime()
        );

        const UtcStart = convertStart.getTime();
        const UtcEnd = convertEnd.getTime();
        const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);
        const dayContainers: DayContainer[] = [];

        for (let i = 0; i <= length; i++) {
          if (i === 0) {
            const day = new Intl.DateTimeFormat("en-us", {
              weekday: "long",
              timeZone: "UTC",
            }).format(convertStart);
            const date = new Intl.DateTimeFormat("en-us", {
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            }).format(convertStart);

            dayContainers.push({
              day: convertStart.toISOString().split("T")[0],
              label: `${day} - ${date}`,
            });
          } else {
            convertStart.setDate(convertStart.getDate() + 1); // adding a day in local time, and then converting to UTC in method below: timeZone: "UTC"
            const day = new Intl.DateTimeFormat("en-us", {
              weekday: "long",
              timeZone: "UTC",
            }).format(convertStart);
            const date = new Intl.DateTimeFormat("en-us", {
              year: "numeric",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            }).format(convertStart);
            dayContainers.push({
              day: convertStart.toISOString().split("T")[0],
              label: `${day} - ${date}`,
            });
          }
        }

        const bucketizeItems: DaySchedule = {};
        dayContainers.forEach(
          (dayObj: DayContainer) =>
            (bucketizeItems[dayObj.day] = data.schedule.filter(
              (v: Schedule) =>
                v.startTime.toISOString().split("T")[0] === dayObj.day
            ))
        );
        setDays(dayContainers);
        setSchedule(bucketizeItems);
        setLoading(false);
        props.loadFirst();
      }
    };

    getTrip();
  }, []);

  const reSort = (arr: Array<Schedule>) => {
    arr.map((v) => {
      v.startTime = new Date(v.startTime);
      v.endTime = new Date(v.endTime);
      return v;
    });
    arr.sort(
      (a: Schedule, b: Schedule) =>
        a.startTime.getTime() - b.startTime.getTime()
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
    const handleKeyDown = (e: KeyboardEvent) => {
      /*
      if (
        e.key === "Enter" &&
        editLineId &&
        !textAreaFocus &&
        !endError &&
        !startError
      ) {
        submitEdit(dayOfTripRef.current, editLineId);
      }*/
      if (e.key === "Enter") {
        editSubmitButtonRef?.current?.focus();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cancelAdd();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editLineId, textAreaFocus, dayOfTripRef, endError, startError]);

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
    if (multiDayEditRef.current) {
      setEditMultiDay(preFill.multiDay);
    }
  }, [editLineId]);

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
          const addingReq = await fetch(`${apiURL}/schedule/${tripId}`, {
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
              return {
                ...prev,
                [dateAdded]: reSort([...prev[dateAdded], data.addedItem]),
              };
            });
            setIndividualAddition((prev) => {
              prev[index] = false;
              return [...prev];
            });
            setCostTotal((prev) => prev + Number(formData.get("cost")));
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

  /*
  const handleDragStart = (
    e: React.DragEvent<HTMLTableCellElement>,
    itemID: number,
    index: number
  ) => {
    dragIndexRef.current = index;
    e.dataTransfer.setData("text/plain", String(itemID));
    const cell = e.currentTarget as HTMLTableCellElement;
    const row = cell.closest("tr") as HTMLTableRowElement;
    const rect = row.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.nativeEvent.offsetX;
    e.dataTransfer.setDragImage(row, x, y);
  };

  const handleDragDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    if (e.dataTransfer.getData("application/json/list-item")) {
      console.log(
        "from list! ",
        e.dataTransfer.getData("application/json/list-item")
      );
      console.log(
        "this should be empty: ",
        e.dataTransfer.getData("text/plain")
      );
      return;
    }

    const target = e.target as HTMLElement;
    let targetIndex = Number(target.closest("tr")?.dataset.index);
    const copy = schedule.slice();
    let removedElement: Schedule[];
    if (e.dataTransfer.getData("application/json/list-item")) {
      // if we drag from list, let's make an empty Schedule item so we can use the rest of this function seemlessly, and add empty fields
      const itemFromList: Item = JSON.parse(
        e.dataTransfer.getData("application/json/list-item")
      );
      removedElement = [
        {
          id: -1,
          tripId: Number(tripId),
          location: itemFromList.value,
          details: "",
          startTime: new Date(),
          endTime: new Date(),
          cost: 0,
          multiDay: false,
        },
      ];
    } else {
      removedElement = copy.splice(dragIndexRef.current, 1);
    }
    const multiDayCheck = removedElement[0].multiDay;
    let finalArr: Schedule[] = schedule;

    const tableTarget = String(target.closest("table")?.id);
    const dropDay: Date = new Date(tableTarget);

    if (isNaN(targetIndex)) {
      //if we drag to an empty day

      const UTCDestination: number = dropDay.getTime();

      // find the spot where it eclipses the date we are trying to place it in and the hop back one index
      targetIndex =
        schedule.findIndex(
          // do we need thiss? why not just use drop day and paste the time
          (v) => v.startTime.getTime() > UTCDestination
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
      finalArr = changeDropTime(
        assembleArr,
        targetIndex,
        multiDayCheck,
        true,
        dropDay,
        e.dataTransfer.getData("application/json/list-item") ? true : false
      );
    } else if (targetIndex === dragIndexRef.current) {
      //if some one picks it up but doesn't drop it elsewhere
      dragIndexRef.current = -1;
      return;
    } else {
      console.log("place in between");
      const assembleArr: Schedule[] = [
        ...copy.slice(0, targetIndex), // explanation here - our target index is now going to look different in an array with one less element (for any elements that come after the one we remove)
        removedElement[0],
        ...copy.slice(targetIndex),
      ];
      finalArr = changeDropTime(
        assembleArr,
        targetIndex,
        multiDayCheck,
        false,
        dropDay,
        e.dataTransfer.getData("application/json/list-item") ? true : false
      );
    }

    if (e.dataTransfer.getData("application/json/list-item")) {
      // TO DO FOR NEXT TIME: Test backend query. We will have a problem with new items being able to be placed at the bottom of the total array, because adding a new item with our current algorithm, will place the new item above the target index - the new item then becomes the targetIndex. I think we might have to start incorporation a drag over to visually indicate where to drop an item.
      const updatedItem = finalArr[targetIndex];
      const result = await fetch(`${apiURL}/schedule/${tripId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start: updatedItem.startTime,
          end: updatedItem.endTime,
          location: updatedItem.location,
          cost: updatedItem.cost,
          details: updatedItem.details,
          multiDay: updatedItem.multiDay,
        }),
      });
      if (result.ok) {
        const data = await result.json();
        finalArr[targetIndex] = data.addedItem;
        setSchedule(finalArr);
      } else {
        alert("error processing change");
      }
    }
    // for a new item from list, let's add a post request instead but do the same result.ok
    const updatedItem = finalArr[targetIndex];
    const result = await fetch(`${apiURL}/update-time/${updatedItem.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        start: updatedItem.startTime,
        end: updatedItem.endTime,
      }),
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

  /*
  const getLocalDate = (toBeConverted: Date): string => {
    const year = toBeConverted.getUTCFullYear();
    const month = prefixZero(toBeConverted.getUTCMonth() + 1);
    const day = prefixZero(toBeConverted.getUTCDate());
    return year + "-" + month + "-" + day;
  };*/

  /*
  const changeDropTime = (
    finalArr: Schedule[],
    targetIndex: number,
    multiDayCheck: boolean,
    emptyTable?: boolean,
    newDay?: Date,
    fromList?: boolean
  ) => {
    // shockingly all we need is the final arr and target index. Why?? Because our value always becomes the targetIndex whether we go above or below. because we slice where the target is never included but then added immedialtely after which then becomes the targetIndex. It can get confusing because it seems to get added above or below our original target, which visually is true but, we are working with indexes, which make it more simple - it's as simple as hey give me your spot. Especially with the idea of removing an element from the array and then placing it back in, our ideas can turn quickly into whats indexes get shifted where what goes
    if (emptyTable) {
      if (!newDay) {
        console.log("error in finding new date to place on");
        return schedule;
      }
      const preserveTime = finalArr[targetIndex].startTime
        .toISOString()
        .split("T")[1];
      const day = newDay.toISOString().split("T")[0];

      const constructDate = new Date(`${day}T${preserveTime}`);
      finalArr[targetIndex].startTime = constructDate;
      finalArr[targetIndex].endTime = setEndDate(
        constructDate,
        finalArr[targetIndex].endTime,
        multiDayCheck,
        fromList
      );
      console.log("end date:" + finalArr[targetIndex].endTime);
      return finalArr;
    }
    if (targetIndex === 0) {
      const dateAfter: Date = finalArr[targetIndex + 1].startTime;
      const newDate = finalArr[targetIndex + 1].startTime
        .toISOString()
        .split("T")[0];
      if (dateAfter.getUTCHours() === 0) {
        const constructDate = new Date(`${newDate}T00:00:00Z`);
        finalArr[targetIndex].endTime = setEndDate(
          constructDate,
          finalArr[targetIndex].endTime,
          multiDayCheck,
          fromList
        );
        finalArr[targetIndex].startTime = constructDate;
        return finalArr;
      } else {
        const newHour = dateAfter.getUTCHours() - 1;
        const newHourMod = prefixZero(newHour);
        const minutes: string = prefixZero(
          finalArr[targetIndex].startTime.getUTCMinutes()
        );
        const constructDate = new Date(
          `${newDate}T${newHourMod}:${minutes}:00Z`
        );
        finalArr[targetIndex].startTime = constructDate;
        finalArr[targetIndex].endTime = setEndDate(
          constructDate,
          finalArr[targetIndex].endTime,
          multiDayCheck,
          fromList
        );
        return finalArr;
      }
    } else {
      const dateBefore: Date = finalArr[targetIndex - 1]?.startTime; // we will be comparing adjacent days of the target to make sure it gets placed in the right day and not the day above
      const dateAfter: Date = finalArr[targetIndex + 1]?.startTime;

      const dayDrop = newDay?.toISOString().split("T")[0];
      let dayReference;
      let newHour: number | null = null;
      if (dateAfter && dateBefore) {
        if (
          dateAfter.toISOString().split("T")[0] === dayDrop &&
          dateBefore.toISOString().split("T")[0] === dayDrop
        ) {
          dayReference = dateBefore;
        } else if (dateBefore.toISOString().split("T")[0] === dayDrop) {
          dayReference = dateBefore;
        } else {
          dayReference = dateAfter;
          newHour =
            dayReference.getUTCHours() === 0
              ? 0
              : dayReference.getUTCHours() - 1;
        }
      } else {
        dayReference = dateBefore;
      }
      const newDate: string = dayReference.toISOString().split("T")[0];
      if (dayReference.getUTCHours() === 23) {
        newHour = 23;
      }
      newHour = newHour ?? dayReference.getUTCHours() + 1;
      const newHourMod: string = prefixZero(newHour);
      const minutes: string = prefixZero(dayReference.getUTCMinutes());

      const constructDate = new Date(`${newDate}T${newHourMod}:${minutes}:00Z`);
      finalArr[targetIndex].startTime = constructDate;
      finalArr[targetIndex].endTime = setEndDate(
        constructDate,
        finalArr[targetIndex].endTime,
        multiDayCheck,
        fromList
      );
      return finalArr;
    }
  };
  */

  useEffect(() => {
    if (holdStartTime && holdEndTime) {
      const startD: Date = new Date(holdStartTime);
      const endD: Date = new Date(holdEndTime);
      let oneProblemAtATime = 0;
      const differenceInHours: number = Math.floor(
        (endD.getTime() - startD.getTime()) / (1000 * 60 * 60)
      );
      if (endD.getTime() < startD.getTime()) {
        setEndError(true);
        setStartError(true);
        setErrMessage("Error, end time cannot be before start time");
        oneProblemAtATime++;
      } else {
        setEndError(false);
        setStartError(false);
        setErrMessage("");
        setMultiDayStyle(false);
      }

      if (!oneProblemAtATime) {
        if (differenceInHours >= 24) {
          console.log("checked:", editMultiDay);
          if (!editMultiDay) {
            setEndError(true);
            setStartError(true);
            setErrMessage(
              "Error, event greater than 24 hours, please select multi-day"
            );
            setMultiDayStyle(true);
          }
        } else if (differenceInHours < 24 && editMultiDay) {
          setErrMessage("Error, item is not multiple days");
          setEndError(true);
          setMultiDayStyle(true);
        } else {
          setEndError(false);
          setStartError(false);
          setErrMessage("");
          setMultiDayStyle(false);
        }
      }
    }
  }, [holdEndTime, holdStartTime, editMultiDay]);

  return loading ? (
    <p>{message}</p>
  ) : (
    <div className={styles.pageWrapper}>
      {days.map((dayObj: DayContainer, index) => {
        return (
          <div key={dayObj.day} className={styles.tableNButtonContainer}>
            <div className={styles.tableCaption}>{dayObj.label}</div>
            <div className={styles.tableContainer}></div>
            <CustomTableComponent
              dayObj={dayObj}
              schedule={schedule}
              //ind={index} // DO we need this? i dont think so.
              errMessage={errMessage}
              setSchedule={setSchedule}
              setCostTotal={setCostTotal}
              //here
              //submitDelete={submitDelete} moved entirety
            />
            <DragOverlay>
              {props.dragRow ? (
                <tr className={styles.tableRow}>
                  <NormalRow value={props.dragRow} dayContainer={dayObj.day} />
                </tr>
              ) : null}{" "}
              {/* will need container logic and finding index of id once we find container. Hmm, how do we access what's active? I think it will have to be a series of props and callbacks from EditCanvas right?*/}
            </DragOverlay>

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
              //                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Adding item divider: below~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

              <div className={styles.formWrapper}>
                <form
                  className={styles.form}
                  onSubmit={(e) => submitAddItem(e, dayObj.day, index)}
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
                    {/*<div className={styles.fakeContainer}>*/}
                    {/*<textarea
                        onInput={handleTextInput}
                        ref={textAreaRef}
                        className={`${styles.input} 
                      ${styles.textArea}`}
                        rows={4}
                        cols={50}
                        name="details"
                        id="details"
                        maxLength={500}
                      /> */}
                    <textarea
                      onInput={handleTextInput}
                      className={`${styles.textArea} ${styles.addTextArea}`}
                      rows={50}
                      cols={5}
                      name="details"
                      id="details"
                      maxLength={500}
                      ref={textAreaRef}
                    />
                    {/*</div>*/}
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

export default EditVacationSchedule;
