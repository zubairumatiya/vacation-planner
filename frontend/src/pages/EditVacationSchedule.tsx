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
import {
  bucketizeSchedule,
  customISOTime,
  indexChunk,
  makeContainers,
} from "../utils/timeHelpers";
import NormalRow from "../components/NormalRow";
import addToSchedule from "../assets/add-to-schedule.svg";
import { BannerContext } from "../context/BannerContext";

polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
});
const apiURL = import.meta.env.VITE_API_URL;

export type DraggingState = {
  container: string | null;
  index: number | null;
};

type ScheduleProps = {
  loadFirst: () => void;
  getMapValues: (a: Vp, b: string, c: string) => void;
  schedule: DaySchedule;
  setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
  activeItem: UniqueIdentifier | null;
  dragRow: Schedule | null;
  overlayWidthRef: OverlayWidths | null;
  dragFrom: string;
};

const EditVacationSchedule = ({
  schedule,
  setSchedule,
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
    setUtcEnd,
    setUtcStart,
    utcEnd,
    utcStart,
    individualAddition,
    setIndividualAddition,
  } = useContext(EditScheduleContext);

  const { bannerMsg, setBannerMsg } = useContext(BannerContext);

  const { tripId } = useParams();
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayContainer[]>([]);

  const [itemError, setItemError] = useState(false);

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
      if (response.status === 401) {
        navigate("/login", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      } else if (response.status === 403) {
        setBannerMsg("You do not have permission to access this resource");
      } else if (response.status === 404) {
        setBannerMsg("Error: Trip not found");
      } else if (response.status >= 500) {
        setBannerMsg(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
      } else if (response.ok) {
        const data = await response.json();
        props.getMapValues(data.gVp, data.location, data.gId);
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

        setUtcEnd(UtcEnd);
        setUtcStart(UtcStart);

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

  const addItemHelper = (dayContainer: string, cancel?: string) => {
    if (cancel) {
      setAddingItem(false);
    } else {
      setAddingItem(true);
    }
    setIndividualAddition((prev) =>
      prev.addingContainer
        ? { addingContainer: "" }
        : { addingContainer: dayContainer }
    );
  };

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
    dateAdded: string
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

      // tweak and test this
      if (!startTimePick) {
        error = true;
        setStartError(true);
        setBannerMsg("start time invalid");
        return;
      }
      if (!startTimePick || startTimePick === ": ") {
        startDateAssembler = customISOTime(dateAdded, "00:00 AM");
      } else {
        startDateAssembler = customISOTime(dateAdded, startTimePick);
      }
      // tweak and test this
      if (!endTimePick) {
        error = true;
        setEndError(true);
        setBannerMsg("end time invalid");
        return;
      }

      if (!endTimePick || endTimePick === ": ") {
        endDateAssembler = customISOTime(dateAdded, "00:00 AM");
      } else {
        endDateAssembler = customISOTime(dateAdded, endTimePick);
      }
      if (!location) {
        error = true;
        setLocationError(true);
        setBannerMsg("location invalid value");
        return;
      }
      console.log("startTimePick:", startTimePick, "endTimePick:", endTimePick);
      console.log("start:", startDateAssembler, "end:", endDateAssembler);
      if (error) {
        return;
      } else {
        const tempItem = {
          startTime: new Date(startDateAssembler),
          id: "temp",
          endTime: new Date(endDateAssembler),
          location: "",
          details: "",
          cost: 0,
          multiDay: false,
          sortIndex: 0,
          tripId: tripId ?? 0,
        } as Schedule;
        const tempArr = reSort([...schedule[dateAdded].slice(), tempItem]);
        const chunk = indexChunk("temp", tempArr);
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
              chunk,
            }),
          });
          if (addingReq.ok) {
            const data = await addingReq.json();
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
            } else if (data.addedItem != null) {
              setSchedule((prev) => {
                return {
                  ...prev,
                  [dateAdded]: tempArr.map((v) =>
                    v.id === "temp"
                      ? {
                          ...data.addedItem,
                          startTime: new Date(data.addedItem.startTime),
                          endTime: new Date(data.addedItem.endTime),
                        }
                      : v
                  ),
                };
              });
            }
            setIndividualAddition({ addingContainer: "" });
          } else if (addingReq.status === 401) {
            navigate("/redirect", {
              state: { message: "Session expired, redirecting to log in..." },
            });
          } else if (addingReq.status === 403) {
            setIndividualAddition({ addingContainer: "" });
            setBannerMsg("You do not have permission to access this resource");
          } else if (addingReq.status === 404) {
            setIndividualAddition({ addingContainer: "" });
            setBannerMsg("Error: Trip not found");
          } else if (addingReq.status >= 500) {
            setIndividualAddition({ addingContainer: "" });
            setBannerMsg(
              "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
            );
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
    <p>{bannerMsg}</p>
  ) : (
    <div className={styles.pageWrapper}>
      {days.map((dayObj: DayContainer) => {
        return (
          <div key={dayObj.day} className={styles.tableNButtonContainer}>
            <div className={styles.tableCaption}>{dayObj.label}</div>
            <div
              id={"tablesContainer"}
              className={`${styles.tableContainer} ${
                props.activeItem && styles.tableContainerDragging
              } ${props.dragFrom === "list" ? styles.listDropZone : null}`}
            >
              <CustomTableComponent
                key={dayObj.day}
                dayObj={dayObj}
                schedule={schedule}
                errMessage={errMessage}
                setSchedule={setSchedule}
                activeId={props.activeItem}
              />
            </div>
            {individualAddition.addingContainer !== dayObj.day ? (
              <button
                type="button"
                disabled={addingItem}
                onClick={() => addItemHelper(dayObj.day)}
                className={`${styles.addButton} btnPrimary`}
              >
                Add Item
              </button>
            ) : (
              //                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Adding item divider: below~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

              <div className={styles.formWrapper}>
                <form
                  className={styles.form}
                  onSubmit={(e) => submitAddItem(e, dayObj.day)}
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
                      preTime={() => undefined}
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
                      preTime={() => undefined}
                    />
                  </div>
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
                      onClick={() => addItemHelper(dayObj.day, "cancel")}
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
      {
        <DragOverlay dropAnimation={null}>
          {props.dragRow ? (
            props.dragFrom === "schedule" ? (
              <div
                className={`${styles.dragOverlayContainer}`}
                style={{
                  width: props.overlayWidthRef?.container,
                }}
              >
                <table
                  className={styles.dragOverlayTable}
                  style={{ minWidth: props.overlayWidthRef?.table }}
                >
                  <colgroup>
                    <col className={styles.dragCol} />
                    <col className={styles.startTimeCol} />
                    <col className={styles.endTimeCol} />
                    <col className={styles.placeCol} />
                    <col className={styles.costCol} />
                    <col className={styles.detailsCol} />
                    <col className={styles.multiDayCol} />
                    <col className={editLineId ? "w-20" : styles.editCol} />
                  </colgroup>
                  <tbody className={styles.dragOverlayTbody}>
                    <tr className={styles.dragOverlayTableRow}>
                      <NormalRow
                        value={props.dragRow}
                        dayContainer={"won't need this"}
                      />
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.listDragOverlayContainer}>
                <div className={styles.addToScheduleIconWrapper}>
                  <img src={addToSchedule} alt="addToSchedule" />
                </div>
                <div className={styles.listDragOverlay}>
                  {props.dragRow.location}
                </div>
              </div>
            )
          ) : null}{" "}
        </DragOverlay>
      }
    </div>
  );
};

export default EditVacationSchedule;
