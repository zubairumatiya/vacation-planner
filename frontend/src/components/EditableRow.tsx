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
  toSchedule,
  toScheduleList,
} from "../utils/timeHelpers";
import CustomTimePicker from "./CustomTimePicker";
import type { UniqueIdentifier } from "@dnd-kit/core";
import { AuthContext } from "../context/AuthContext";
import { useParams } from "react-router-dom";
import { EditScheduleContext } from "../context/EditScheduleContext";
import { BannerContext } from "../context/BannerContext";
import refreshFn from "../utils/refreshFn";
import { updateGuestScheduleItem } from "../utils/guestStorage";

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
    errMessage,
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
    {} as TimeObj,
  );
  const [editEndTimeObject, setEditEndTimeObject] = useState<TimeObj>(
    {} as TimeObj,
  );
  const startDateEditRef = useRef<HTMLInputElement>(null);
  const endDateEditRef = useRef<HTMLInputElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const initialStart = useRef<string>("");
  const initialEnd = useRef<string>("");
  const initialLocation = useRef<string>("");
  const initialCost = useRef<number | null>(null);
  const initialDetails = useRef<string>("");
  const initialMultiDay = useRef<boolean | null>(null);
  const [disabled, setDisabled] = useState<boolean>(true);
  const renderCount = useRef<number>(0);
  const apiURL = import.meta.env.VITE_API_URL;
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const isGuest = !token && tripId === "guest";

  useEffect(() => {
    deleteButtonRef?.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      setHoldEndTime("");
      setHoldStartTime("");
    };
  }, []);

  useEffect(() => {
    if (holdStartTime && holdEndTime) {
      if (renderCount.current === 0) {
        initialEnd.current = holdEndTime;
        initialStart.current = holdStartTime;
        renderCount.current++;
      }
      const startD: Date = new Date(holdStartTime);
      const endD: Date = new Date(holdEndTime);
      let oneProblemAtATime = 0;
      const differenceInHours: number = Math.floor(
        (endD.getTime() - startD.getTime()) / (1000 * 60 * 60),
      );
      if (endD.getTime() < startD.getTime()) {
        setEndError(true);
        setStartError(true);
        setErrMessage("Error, end time cannot be before start time");
        oneProblemAtATime++;
      } else {
        setEndError(false);
        setStartError(false);
        setErrMessage(null);
        setMultiDayStyle(false);
      }

      if (!oneProblemAtATime) {
        if (differenceInHours >= 24) {
          if (!editMultiDay) {
            setEndError(true);
            setStartError(true);
            setErrMessage(
              "Error, event greater than 24 hours, please select multi-day",
            );
            setMultiDayStyle(true);
          }
        } else if (differenceInHours < 24 && editMultiDay) {
          setErrMessage("Error, item is not multiple days");
          setEndError(true);
          setMultiDayStyle(true);
        } else if (location === "") {
          setErrMessage("Location cannot be empty");
        } else {
          setEndError(false);
          setStartError(false);
          setErrMessage(null);
          setMultiDayStyle(false);
        }
      }
    }
  }, [holdEndTime, holdStartTime, editMultiDay, location]);

  useEffect(() => {
    if (locationEditRef.current) {
      locationEditRef.current.value = preFill.location;
      initialLocation.current = preFill.location;
      setLocation(preFill.location);
    }
    if (costEditRef.current) {
      costEditRef.current.value = String(preFill.cost);
      setCost(preFill.cost);
      initialCost.current = preFill.cost;
    }
    if (detailEditRef.current) {
      detailEditRef.current.value = preFill.details;
      initialDetails.current = preFill.details;
      setDetails(preFill.details);
    }
    if (multiDayEditRef.current) {
      setEditMultiDay(preFill.multiDay);
      initialMultiDay.current = preFill.multiDay;
    }
  }, [editLineId]);

  useEffect(() => {
    if (
      location !== initialLocation.current ||
      holdStartTime !== initialStart.current ||
      holdEndTime !== initialEnd.current ||
      cost != initialCost.current ||
      details !== initialDetails.current ||
      editMultiDay !== initialMultiDay.current
    ) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [location, holdEndTime, holdStartTime, editMultiDay, cost, details]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !textAreaFocus) {
        e.preventDefault();
        if (!(endError || startError || errMessage !== null || disabled)) {
          submitEdit(dayContainer, value.id);
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cancelAdd();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editLineId, textAreaFocus, dayOfTripRef, endError, startError, errMessage, disabled, dayContainer, value.id]);

  const submitDelete = async (
    e: React.MouseEvent,
    itemID: UniqueIdentifier,
    index: number,
    dateAdded: string,
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
        const continueReq: { token: string | null; err: boolean } =
          await refreshFn(apiURL, refreshInFlightRef);
        if (!continueReq.err) {
          if (login && continueReq.token) {
            login(String(continueReq.token));
          }
          const retryReq = await fetch(`${apiURL}/schedule/${itemID}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${continueReq.token}`,
            },
            body: JSON.stringify({
              tripId,
              lastModified: schedule[dateAdded][index].lastModified,
            }),
          });
          if (!retryReq.ok) {
            alert("Trouble completing request, please try again");
          } else if (retryReq.ok) {
            setEditLineId(null);
            setAddingItem(false);
            setSchedule((prev) => ({
              ...prev,
              [dateAdded]: prev[dateAdded].filter((v) => v.id !== itemID),
            }));
          }
        } else if (continueReq.err) {
          if (logout) {
            await logout();
          }
          return;
        }
      } else if (response.status === 403) {
        setEditLineId(null);
        setAddingItem(false);
        setBannerMsg("You do not have permission to access this resource");
      } else if (response.status === 404) {
        setEditLineId(null);
        setAddingItem(false);
        const data = (await response.json()) as ScheduleDeleteResponse;
        if (data.queryComplete != null) {
          setSchedule((prev) => ({
            ...prev,
            [dateAdded]: prev[dateAdded].filter((v) => v.id !== data.deletedId),
          }));
        } else {
          setBannerMsg("Error: Trip not found");
        }
      } else if (response.status === 409) {
        const data = (await response.json()) as ScheduleConflictResponse;
        setEditLineId(null);
        setAddingItem(false);
        const scheduleItems = toScheduleList(data.newData);
        const length = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
        const dayContainers: DayContainer[] = makeContainers(
          length,
          new Date(utcStart),
        );
        const bucketizeItems: DaySchedule = bucketizeSchedule(
          dayContainers,
          scheduleItems,
        );
        setSchedule(bucketizeItems);

        setBannerMsg(
          "Another user has updated this resource, your change was not applied",
        );
      } else if (response.status >= 500) {
        setEditLineId(null);
        setAddingItem(false);
        setBannerMsg(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
        );
      } else {
        console.error("error deleting item");
      }
    } catch (err) {
      console.error(err);
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
        a.startTime.getTime() - b.startTime.getTime(),
    );
    return arr;
  };

  const submitEdit = async (
    dateAdded: string,
    itemID: UniqueIdentifier,
    e?: React.MouseEvent | React.KeyboardEvent,
  ) => {
    e?.preventDefault();

    const startDateAssembler = holdStartTime;

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
    const tempItem: Schedule = {
      startTime: new Date(startDateAssembler),
      id: itemID,
      endTime: new Date(endDateAssembler),
      location: "",
      details: "",
      cost: 0,
      multiDay: false,
      sortIndex: 0,
      tripId: tripId ?? "",
      lastModified: "",
      isLocked: false,
    };
    const tempArr = reSort(
      newTable
        ? [...schedule[postEditDate], tempItem]
        : schedule[postEditDate].map((v) => (v.id === itemID ? tempItem : v)),
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
    if (isGuest) {
      const data = updateGuestScheduleItem(String(itemID), {
        ...sItem,
        startTime: startDateAssembler,
        endTime: endDateAssembler,
      });
      setEditLineId(null);
      setAddingItem(false);
      if (data.updatedData != null) {
        const updated = toSchedule(data.updatedData);
        setSchedule((prev) =>
          newTable
            ? {
                ...prev,
                [dateAdded]: prev[dateAdded].filter((v) => v.id !== itemID),
                [postEditDate]: tempArr.map((v) =>
                  v.id === itemID ? updated : v,
                ),
              }
            : {
                ...prev,
                [postEditDate]: tempArr.map((v) =>
                  v.id === itemID ? updated : v,
                ),
              },
        );
      }
    } else {
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
          const data = (await response.json()) as ScheduleUpdateResponse;
          setEditLineId(null);
          setAddingItem(false);
          if (data.newlyIndexedSchedule != null) {
            const scheduleItems = toScheduleList(data.newlyIndexedSchedule);
            const length = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
            const dayContainers: DayContainer[] = makeContainers(
              length,
              new Date(utcStart),
            );
            const bucketizeItems: DaySchedule = bucketizeSchedule(
              dayContainers,
              scheduleItems,
            );
            setSchedule(bucketizeItems);
          } else if (data.updatedData != null) {
            const updated = toSchedule(data.updatedData);
            setSchedule((prev) =>
              newTable
                ? {
                    ...prev,
                    [dateAdded]: prev[dateAdded].filter((v) => v.id !== itemID),
                    [postEditDate]: tempArr.map((v) =>
                      v.id === itemID ? updated : v,
                    ),
                  }
                : {
                    ...prev,
                    [postEditDate]: tempArr.map((v) =>
                      v.id === itemID ? updated : v,
                    ),
                  },
            );
          }
        } else if (response.status === 401) {
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
          const continueReq: { token: string | null; err: boolean } =
            await refreshFn(apiURL, refreshInFlightRef);
          if (!continueReq.err) {
            if (login && continueReq.token) {
              login(String(continueReq.token));
            }
            const retryReq = await fetch(`${apiURL}/schedule/${itemID}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${continueReq.token}`,
              },
              body: JSON.stringify({
                ...sItem,
                chunk,
                tripId,
                start: startDateAssembler,
                end: endDateAssembler,
              }),
            });
            if (!retryReq.ok) {
              alert("Trouble completing request, please try again");
            } else if (retryReq.ok) {
              const data = (await retryReq.json()) as ScheduleUpdateResponse;
              setEditLineId(null);
              setAddingItem(false);
              if (data.newlyIndexedSchedule != null) {
                const scheduleItems = toScheduleList(data.newlyIndexedSchedule);
                const length = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
                const dayContainers: DayContainer[] = makeContainers(
                  length,
                  new Date(utcStart),
                );
                const bucketizeItems: DaySchedule = bucketizeSchedule(
                  dayContainers,
                  scheduleItems,
                );
                setSchedule(bucketizeItems);
              } else if (data.updatedData != null) {
                const updated = toSchedule(data.updatedData);
                setSchedule((prev) =>
                  newTable
                    ? {
                        ...prev,
                        [dateAdded]: prev[dateAdded].filter(
                          (v) => v.id !== itemID,
                        ),
                        [postEditDate]: tempArr.map((v) =>
                          v.id === itemID ? updated : v,
                        ),
                      }
                    : {
                        ...prev,
                        [postEditDate]: tempArr.map((v) =>
                          v.id === itemID ? updated : v,
                        ),
                      },
                );
              }
            }
          } else if (continueReq.err) {
            if (logout) {
              await logout();
            }
            return;
          }
        } else if (response.status === 403) {
          setEditLineId(null);
          setAddingItem(false);
          setBannerMsg("You do not have permission to access this resource");
        } else if (response.status === 404) {
          setEditLineId(null);
          setAddingItem(false);
          setBannerMsg("Error: Trip not found");
        } else if (response.status === 409) {
          const data = (await response.json()) as ScheduleConflictResponse;
          setEditLineId(null);
          setAddingItem(false);
          const scheduleItems = toScheduleList(data.newData);
          const length = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
          const dayContainers: DayContainer[] = makeContainers(
            length,
            new Date(utcStart),
          );
          const bucketizeItems: DaySchedule = bucketizeSchedule(
            dayContainers,
            scheduleItems,
          );
          setSchedule(bucketizeItems);
          const holdIntent: Schedule = {
            ...sItem,
            id: itemID,
            sortIndex: calculateNewSortIndex(chunk),
            tripId: tripId ?? "",
            startTime: new Date(startDateAssembler),
            endTime: new Date(endDateAssembler),
            isLocked: false,
          };
          setHoldOverwrite(holdIntent);
          setBannerMsg(
            "Another user has updated this resource, your change was not applied",
          );
        } else if (response.status >= 500) {
          setEditLineId(null);
          setAddingItem(false);
          setBannerMsg(
            "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
          );
        } else {
          console.error("something went wrong editing");
        }
      } catch (err) {
        console.error("failed to update item", err);
      }
    }
  };

  return (
    <>
      <td>
        <button
          type="button"
          className={styles.xButton}
          ref={deleteButtonRef}
          onClick={(e) => submitDelete(e, value.id, index, dayContainer)}
          onKeyDown={(e) => (e.key === " " ? e.preventDefault() : undefined)}
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
                setHoldEndTime,
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
              setHoldEndTime,
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
                setHoldEndTime,
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
              setHoldEndTime,
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
          onChange={(e) => setLocation(e.target.value)}
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
          onChange={(e) => setCost(Number(e.target.value))}
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
          onChange={(e) => setDetails(e.target.value)}
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
              endError || startError || disabled ? "" : styles.submitEditButton
            }`}
            onClick={(e) => submitEdit(dayContainer, value.id, e)}
            disabled={endError || startError || errMessage !== null || disabled}
            ref={editSubmitButtonRef}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                submitEdit(dayContainer, value.id, e);
              }
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
