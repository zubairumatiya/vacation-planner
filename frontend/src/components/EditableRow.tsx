import styles from "../styles/EditSchedule.module.css";
import { useState, useRef, useContext, useEffect } from "react";
import {
  testLessThan24,
  addMeridiem,
  fourDigitTime,
  indexChunk,
  makeContainers,
  bucketizeSchedule,
  calculateNewSortIndex,
} from "../utils/timeHelpers";
import CustomTimePicker from "./CustomTimePicker";
import type { UniqueIdentifier } from "@dnd-kit/core";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { EditScheduleContext } from "../context/EditScheduleContext";
import { BannerContext } from "../context/BannerContext";

const EditableRow = ({
  value,
  index,
  dayContainer,
  setSchedule,
  schedule,
}: EditRowProps) => {
  const {
    setEditLineId,
    setAddingItem,
    holdStartTime,
    holdEndTime,
    detailEditRef,
    locationEditRef,
    costEditRef,
    multiDayEditRef,
    editStartDate,
    setEditStartDate,
    startError,
    endError,
    setEndError,
    setStartError,
    constructDate,
    editEndDate,
    setEditEndDate,
    locationError,
    handleTextInput,
    setTextAreaFocus,
    multiDayStyle,
    editMultiDay,
    setMultiDayStyle,
    setErrMessage,
    setEditMultiDay,
    editSubmitButtonRef,
    cancelAdd,
    setHoldEndTime,
    setHoldStartTime,
    utcEnd,
    utcStart,
    preFill,
    editLineId,
    setHoldOverwrite,
    dayOfTripRef,
    textAreaFocus,
  } = useContext(EditScheduleContext);
  const auth = useContext(AuthContext);
  const { setBannerMsg } = useContext(BannerContext);
  const { tripId } = useParams();
  const [editStartTimeObject, setEditStartTimeObject] = useState<TimeObj>(
    {} as TimeObj
  );
  const [editEndTimeObject, setEditEndTimeObject] = useState<TimeObj>(
    {} as TimeObj
  );
  const startDateEditRef = useRef<HTMLInputElement>(null);
  const endDateEditRef = useRef<HTMLInputElement>(null);
  const apiURL = import.meta.env.VITE_API_URL;
  const token = auth?.token;
  const navigate = useNavigate();

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const submitDelete = async (
    e: React.MouseEvent,
    itemID: UniqueIdentifier,
    index: number,
    dateAdded: string
  ) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiURL}/schedule/${itemID}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripId,
          lastModified: schedule[dateAdded][index].lastModified,
        }),
      });
      if (response.ok) {
        setEditLineId(null);
        setAddingItem(false);
        setSchedule((prev) => ({
          ...prev,
          [dateAdded]: prev[dateAdded].filter((v) => v.id !== itemID),
        }));
      } else if (response.status === 401) {
        navigate("/redirect", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      } else if (response.status === 403) {
        setEditLineId(null);
        setAddingItem(false);
        setBannerMsg("You do not have permission to access this resource");
      } else if (response.status === 404) {
        setEditLineId(null);
        setAddingItem(false);
        const data = await response.json();
        if (data.queryComplete != null) {
          setSchedule((prev) => ({
            ...prev,
            [dateAdded]: prev[dateAdded].filter((v) => v.id !== data.deletedId),
          }));
        } else {
          setBannerMsg("Error: Trip not found");
        }
      } else if (response.status === 409) {
        const data = await response.json();
        setEditLineId(null);
        setAddingItem(false);
        for (const i of data.newData) {
          i.startTime = new Date(i.startTime);
          i.endTime = new Date(i.endTime);
          i.id = String(i.id);
        }
        const length = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
        const dayContainers: DayContainer[] = makeContainers(
          length,
          new Date(utcStart)
        );
        const bucketizeItems: DaySchedule = bucketizeSchedule(
          dayContainers,
          data.newData
        );
        setSchedule(bucketizeItems);

        setBannerMsg(
          "Another user has updated this resource, your change was not applied"
        );
      } else if (response.status >= 500) {
        setEditLineId(null);
        setAddingItem(false);
        setBannerMsg(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
      } else {
        console.log("~~~~ error deleting item");
      }
    } catch (err) {
      console.log(err);
    }
  };

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

  const submitEdit = async (
    dateAdded: string,
    itemID: UniqueIdentifier,
    e?: React.MouseEvent | React.KeyboardEvent
  ) => {
    e?.preventDefault();

    console.log("startTime", holdStartTime);
    const startDateAssembler = holdStartTime;

    console.log("endTime", holdEndTime);
    const endDateAssembler = holdEndTime;

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
    const postEditDate = startDateAssembler.split("T")[0];
    const newTable = postEditDate === dateAdded ? false : true;
    const tempItem = {
      startTime: new Date(startDateAssembler),
      id: itemID,
      endTime: new Date(endDateAssembler),
      location: "",
      details: "",
      cost: 0,
      multiDay: false,
      sortIndex: 0,
      tripId: tripId ?? 0,
    } as Schedule;
    const tempArr = reSort(
      newTable
        ? [...schedule[postEditDate], tempItem]
        : schedule[postEditDate].map((v) => (v.id === itemID ? tempItem : v))
    );

    const chunk: Chunk = indexChunk(itemID, tempArr);

    const sItem = {
      location,
      cost: Number(cost),
      details,
      multiDay,
      lastModified:
        schedule[dateAdded][
          schedule[dateAdded].findIndex((v) => v.id === itemID)
        ].lastModified,
    };

    try {
      const response = await fetch(`${apiURL}/schedule/${itemID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...sItem,
          chunk,
          tripId,
          start: startDateAssembler,
          end: endDateAssembler,
        }),
      });
      if (response.ok) {
        console.log("YAHOOOO");
        const data = await response.json();
        setEditLineId(null);
        setAddingItem(false);
        if (data.newlyIndexedSchedule != null) {
          for (const i of data.newlyIndexedSchedule) {
            i.startTime = new Date(i.startTime);
            i.endTime = new Date(i.endTime);
            i.id = String(i.id);
          }
          const length = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
          const dayContainers: DayContainer[] = makeContainers(
            length,
            new Date(utcStart)
          );
          const bucketizeItems: DaySchedule = bucketizeSchedule(
            dayContainers,
            data.newlyIndexedSchedule
          );
          setSchedule(bucketizeItems);
        } else if (data.updatedData != null) {
          setSchedule((prev) =>
            newTable
              ? {
                  ...prev,
                  [dateAdded]: prev[dateAdded].filter((v) => v.id !== itemID),
                  [postEditDate]: tempArr.map((v) =>
                    v.id === itemID
                      ? {
                          ...data.updatedData,
                          startTime: new Date(data.updatedData.startTime),
                          endTime: new Date(data.updatedData.endTime),
                        }
                      : v
                  ),
                }
              : {
                  ...prev,
                  [postEditDate]: tempArr.map((v) =>
                    v.id === itemID
                      ? {
                          ...data.updatedData,
                          startTime: new Date(data.updatedData.startTime),
                          endTime: new Date(data.updatedData.endTime),
                        }
                      : v
                  ),
                }
          );
        }
      } else if (response.status === 401) {
        navigate("/redirect", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      } else if (response.status === 403) {
        setEditLineId(null);
        setAddingItem(false);
        setBannerMsg("You do not have permission to access this resource");
      } else if (response.status === 404) {
        setEditLineId(null);
        setAddingItem(false);
        setBannerMsg("Error: Trip not found");
      } else if (response.status === 409) {
        const data = await response.json();
        setEditLineId(null);
        setAddingItem(false);
        for (const i of data.newData) {
          i.startTime = new Date(i.startTime);
          i.endTime = new Date(i.endTime);
          i.id = String(i.id);
        }
        const length = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
        const dayContainers: DayContainer[] = makeContainers(
          length,
          new Date(utcStart)
        );
        const bucketizeItems: DaySchedule = bucketizeSchedule(
          dayContainers,
          data.newData
        );
        setSchedule(bucketizeItems);
        const holdIntent = {
          ...sItem,
          id: itemID,
          sortIndex: calculateNewSortIndex(chunk),
          tripId: tripId ?? "",
          startTime: new Date(startDateAssembler),
          endTime: new Date(endDateAssembler),
        };
        setHoldOverwrite(holdIntent);
        setBannerMsg(
          "Another user has updated this resource, your change was not applied"
        );
      } else if (response.status >= 500) {
        setEditLineId(null);
        setAddingItem(false);
        setBannerMsg(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
      } else {
        console.log("something went wrong editing");
      }
    } catch (err) {
      console.log("failed to update item ~~~~~ ", err);
    }
  };

  return (
    <>
      <td>
        <button
          type="button"
          className={styles.xButton}
          onClick={(e) => submitDelete(e, value.id, index, dayContainer)}
        >
          delete
        </button>
      </td>
      <td
        className={`border-2 ${
          startError ? " border-red-500" : "border-transparent"
        }`}
      >
        {
          <input
            type="date"
            name="startDate"
            id="startDate"
            className={`${styles.dateEditInput} `}
            value={editStartDate}
            onChange={(e) => {
              setEditStartDate(e.target.value);
              testLessThan24(
                {
                  which: "start",
                  date: e.target.value,
                  ...editStartTimeObject,
                },
                setHoldStartTime,
                setHoldEndTime
              );
            }}
            ref={startDateEditRef}
          />
        }
        <CustomTimePicker
          className={startError ? "border-red-500" : undefined}
          onChange={(hour: string, minute: string, meridiem: string) => {
            constructDate("start", hour, minute, meridiem);
            setEditStartTimeObject({
              hour,
              minute,
              meridiem,
            });
            testLessThan24(
              {
                which: "start",
                date: startDateEditRef?.current?.value,
                hour,
                minute,
                meridiem,
              },
              setHoldStartTime,
              setHoldEndTime
            );
          }}
          preTime={() => addMeridiem(fourDigitTime(value.startTime))}
        />
      </td>

      <td
        className={`border-2 ${
          endError ? " border-red-500" : "border-transparent"
        }`}
      >
        {
          <input
            type="date"
            name="endDate"
            id="endDate"
            value={editEndDate}
            className={`${styles.dateEditInput}`}
            onChange={(e) => {
              setEditEndDate(e.target.value);
              testLessThan24(
                {
                  which: "end",
                  date: e.target.value,
                  ...editEndTimeObject,
                },
                setHoldStartTime,
                setHoldEndTime
              );
            }}
            ref={endDateEditRef}
          />
        }
        <CustomTimePicker
          className={endError ? "border-red-500" : undefined}
          onChange={(hour: string, minute: string, meridiem: string) => {
            constructDate("end", hour, minute, meridiem);
            setEditEndTimeObject({
              hour,
              minute,
              meridiem,
            });
            testLessThan24(
              {
                which: "end",
                date: endDateEditRef?.current?.value,
                hour,
                minute,
                meridiem,
              },
              setHoldStartTime,
              setHoldEndTime
            );
          }}
          preTime={() => addMeridiem(fourDigitTime(value.endTime))}
        />
      </td>

      <td>
        <input
          type="text"
          name="location"
          id="location"
          maxLength={300}
          className={`${locationError && "border-red-500"} ${styles.input}`}
          ref={locationEditRef}
        />
      </td>

      <td>
        <input
          className={`${styles.input} ${styles.costEditInput}`}
          type="number"
          name="cost"
          id="cost"
          step="0.01"
          min="0"
          ref={costEditRef}
        />
      </td>

      <td>
        <textarea
          onInput={handleTextInput}
          className={`${styles.textArea}`}
          rows={50}
          cols={5}
          name="details"
          id="details"
          maxLength={500}
          ref={detailEditRef}
          onFocus={() => setTextAreaFocus(true)}
          onBlur={() => setTextAreaFocus(false)}
        />
      </td>
      <td>
        <input
          type="checkbox"
          className={`${multiDayStyle && styles.checkBoxHighlight}`}
          name="editMultDay"
          id="editMultiDay"
          checked={editMultiDay}
          onChange={(e) => setEditMultiDay(e.target.checked)}
          ref={multiDayEditRef}
        />
      </td>

      <td>
        <div className={styles.editButtonCluster}>
          <button
            type="button"
            className={`${styles.buttonsWhileEditing} ${styles.cancelButton}`}
            onClick={cancelAdd}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.buttonsWhileEditing}  ${
              endError || startError ? "" : styles.submitEditButton
            }`}
            onClick={(e) => submitEdit(dayContainer, value.id, e)}
            disabled={endError || startError}
            ref={editSubmitButtonRef}
            onKeyUp={(e) => {
              submitEdit(dayContainer, value.id, e);
            }}
          >
            Submit
          </button>
        </div>
      </td>
    </>
  );
};

export default EditableRow;
