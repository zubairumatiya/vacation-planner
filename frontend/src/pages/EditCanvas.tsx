import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import MyMapComponent from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState, useCallback, useContext, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { EditScheduleProvider } from "../context/EditScheduleContext";
import {
  closestCorners,
  DndContext,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,

  //type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { type DraggingState } from "./EditVacationSchedule";
import type { CollisionDetection } from "@dnd-kit/core/dist/utilities/algorithms/types";
import { arrayMove } from "@dnd-kit/sortable";
import type { AnyData } from "@dnd-kit/core/dist/store/types";
import {
  bucketizeSchedule,
  indexChunk,
  makeContainers,
  prefixZero,
} from "../utils/timeHelpers";

import clearCircle from "../assets/clear-circle.svg";

const apiURL = import.meta.env.VITE_API_URL;

const EditCanvas = ({
  setCostTotal,
}: {
  setCostTotal: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { tripId } = useParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [loading2, setLoading2] = useState<boolean>(true);
  const [vp, setVp] = useState<null | Vp>(null);
  const [location, setLocation] = useState<string>("");
  const [gId, setGId] = useState<string>("");
  const [wishList, setWishList] = useState<Item[]>([]);
  const [wishListClone, setWishListClone] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  //const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule>({});
  //const [dragItem, setDragItem] = useState<DraggingState | null>(null);
  const [dragRow, setDragRow] = useState<Schedule | null>(null);
  const [dragFrom, setDragFrom] = useState<string>("");
  const [clonedSchedule, setClonedSchedule] = useState<DaySchedule>({});
  const recentlyMovedToNewContainer = useRef<boolean>(false);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const auth = useContext(AuthContext);
  const tempScheduleItem = useRef<Schedule | null>(null);
  const navigate = useNavigate();
  const initialListDrag = useRef<boolean>(true);
  const overlayWidthRef = useRef<OverlayWidths | null>(null);
  const [activeListId, setActiveListId] = useState<UniqueIdentifier | null>(
    null
  );
  const [utcStart, setUtcStart] = useState(0);
  const [utcEnd, setUtcEnd] = useState(0);
  const [holdOverwrite, setHoldOverwrite] = useState<Schedule | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const lastEditWasDrag = useRef<boolean>(false);
  const [harmlessFlipper, setHarmlessFlipper] = useState<boolean>(false);
  const [individualAddition, setIndividualAddition] = useState<{
    addingContainer: string;
  }>({ addingContainer: "" });
  const [editLineId, setEditLineId] = useState<UniqueIdentifier | null>(null);
  const [addingItem, setAddingItem] = useState<boolean>(false);
  const refTimerStarted = useRef<boolean>(false);

  useEffect(() => {
    if (bannerMsg && !refTimerStarted.current) {
      refTimerStarted.current = true;
      setTimeout(() => {
        refTimerStarted.current = false;
        clearOverwriteBanner();
      }, 8000);
    }
  }, [bannerMsg]);

  useEffect(() => {
    lastEditWasDrag.current = false;
  }, [harmlessFlipper, individualAddition, addingItem, editLineId]);
  // lastEditWasDragRef is an imperative flag used to coordinate effects

  useEffect(() => {
    if (!lastEditWasDrag.current) {
      setCostTotal(
        Object.keys(schedule).reduce(
          (acc, v) =>
            acc + schedule[v].reduce((acc, v) => acc + Number(v.cost), 0),
          0
        )
      );
    }
  }, [schedule]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 3 },
    }),
    useSensor(KeyboardSensor)
  );

  const customCollisionsDetectionAlgorithm: CollisionDetection = useCallback(
    (args) => {
      const pointerCollisions = pointerWithin(args); // we will use this for touch and pointer sensor
      let intersections;
      if (initialListDrag.current) {
        intersections = pointerCollisions;
      } else {
        intersections =
          pointerCollisions.length > 0
            ? pointerCollisions
            : closestCorners(args);
      }
      //pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args); // fallback on closest corners in case of keyboard sensor
      let overId = getFirstCollision(intersections, "id"); // i guess this will always be the container first? According to source code example?
      if (overId != null) {
        if (overId in schedule) {
          const containerItems = schedule[overId];

          if (containerItems.length > 0) {
            overId = closestCorners({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.find((v) => container.id === v.id)
              ),
            })[0]?.id; // return closest container that is not our parent container and is actually inside the parent container we are over. Not just closest in general.
          }
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }

      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, schedule]
  );

  const token = auth?.token;

  function isDragData(data: DragData | AnyData | undefined): data is DragData {
    if (data === undefined) {
      return false;
    }
    return data && "type" in data;
  }

  const handleDragStart = (e: DragStartEvent) => {
    initialListDrag.current = true;
    lastEditWasDrag.current = true;
    const container = document.querySelector("#tablesContainer") as HTMLElement;
    const tableId = Object.keys(schedule)[0];
    const table = document.getElementById(tableId) as HTMLElement;

    overlayWidthRef.current = {
      container: container.getBoundingClientRect().width,
      table: table.getBoundingClientRect().width,
    };
    if (!isDragData(e.active.data.current)) return; // runtime and compile time type check function. DRY for the other drag functions to type check.
    const typeOfDrag = e.active.data.current;
    setDragFrom(typeOfDrag.type);
    setActiveId(e.active.id);
    setClonedSchedule(schedule);
    setWishListClone(wishList);
    document.body.classList.add("freezeScroll");
    if (typeOfDrag?.type === "list") {
      setActiveListId(e.active.id);
      const listValue =
        wishList.find((item) => item.id == e.active.id)?.value ?? "";
      tempScheduleItem.current = {
        id: e.active.id,
        tripId: String(tripId),
        location: listValue,
        details: "",
        startTime: new Date(),
        endTime: new Date(),
        cost: 0,
        multiDay: false,
        sortIndex: 0,
        lastModified: "",
      };
      setDragRow(tempScheduleItem.current);
    } else if (typeOfDrag?.type === "schedule") {
      initialListDrag.current = false;
      const containerAndIndex = findContainerAndIndex(e.active.id);
      if (containerAndIndex.container && containerAndIndex.index != null) {
        setDragRow(
          schedule[containerAndIndex?.container][containerAndIndex.index]
        );
      }
    }
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    // sorting animation and shuffling seems to be the deafult within the same container!
    // see if dragged to new container
    if (!over) return;
    const activeInfo =
      tempScheduleItem.current && initialListDrag.current
        ? { container: "-1", index: -1 }
        : findContainerAndIndex(active.id); // list items wont be in schedule yet, AND list and schedule id's can clash so active.id won't be reliable moving forward
    const activeContainer = activeInfo.container;
    const overInfo = findContainerAndIndex(over.id);
    const overContainer = overInfo.container;
    if (!overContainer || !activeContainer) {
      //handleDragCancel();
      return;
    }
    if (activeContainer !== overContainer) {
      initialListDrag.current = false;
      setSchedule((prevSchedule) => {
        const activeItems = prevSchedule[activeContainer]; // could be undefined
        const overItems = prevSchedule[overContainer];
        const activeIndex = activeInfo.index;
        const overIndex = overInfo.index;

        let newIndex: number;
        if (over.id in schedule || overIndex === null) {
          newIndex = overItems.length + 1;
        } else {
          const isBelowOverItem = // we have to decide if our item is going above or below the item we are over (which is returned from our colision alg). Specifically when switching containers, we need a simple calc to see where to place it
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height;

          const modifier = isBelowOverItem ? 1 : 0;

          newIndex =
            overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
        }

        recentlyMovedToNewContainer.current = true;
        return activeItems === undefined &&
          activeIndex === -1 &&
          tempScheduleItem.current //  could make the conditional argument just my tempScheduleItem but I want to trust the process of my drag and have flow with my variables, maybe just being pedantic
          ? {
              ...prevSchedule,
              [overContainer]: [
                ...overItems.slice(0, newIndex),
                tempScheduleItem.current,
                ...overItems.slice(newIndex, overItems.length),
              ],
            }
          : {
              ...prevSchedule,
              [activeContainer]: activeItems.filter((v) => v.id !== active.id),
              [overContainer]: [
                ...overItems.slice(0, newIndex),
                activeItems[activeIndex ?? 0],
                ...overItems.slice(newIndex, overItems.length),
              ],
            };
        // FOR NEXT TIME ADD POSITION ALG FOR NEW CONTAINER BOYS, Easiest case would prob be to compare with clone. We can also look if the isBelow alg is working properly.
      });
    } else {
      // when true, it means our active will be below our over, otherwise it will be above. This is diff than above, we will use this to modify where we get our start time from.
      //let's see if we can change the start time as we drag - TBD if worth it
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    // for next time, let's continue to incorporate adding a list item to schedule.
    document.body.classList.remove("freezeScroll");
    console.log(over);
    if (over?.id == null) {
      console.log("cancelled");
      handleDragCancel();
      return;
    }
    const activeInfo = findContainerAndIndex(active.id);
    const activeIndex = activeInfo.index;
    const overInfo = findContainerAndIndex(over.id);
    const overIndex = overInfo.index;
    const overContainer = overInfo.container;
    let previous: DaySchedule;
    let chunk: Chunk;
    if (
      activeIndex === null ||
      activeInfo.container === null ||
      overContainer === null
    ) {
      // this is not like drag over where a null index indicates an empty table, since we will have already set the active item in schedule, it should return an index. This is a catch all check.
      handleDragCancel();
      return;
    }
    const refIdSnapshot = tempScheduleItem.current?.id; // need closure, ref always points to current
    const originalPosition = findContainerAndIndex(active.id, clonedSchedule); // will have to check against clone because moving to different containers resets our state
    if (
      overInfo.container !== originalPosition.container ||
      overInfo.index !== originalPosition.index
    ) {
      setSchedule((prevSchedule) => {
        previous = prevSchedule;
        const newStartTime = changeDropTime(
          prevSchedule,
          activeIndex,
          overIndex,
          overContainer
        );
        const newEndTime = changeEndDate(
          newStartTime,
          prevSchedule[overContainer][activeIndex].multiDay
        );
        const newArr = arrayMove(
          prevSchedule[overContainer],
          activeIndex,
          overIndex ?? 0
        );
        chunk = indexChunk(active.id, newArr);
        const newItem = {
          ...prevSchedule[overContainer][activeIndex],
          startTime: newStartTime,
          endTime: newEndTime,
        };
        newArr[overIndex ?? 0] = newItem;
        // new obj inserted into new array

        prevSchedule[overContainer][activeIndex] = newItem;
        // changing it here so changes are reflected in "previous" variable

        return {
          ...prevSchedule,
          [overContainer]: newArr,
        };
      });
      if (refIdSnapshot) {
        setWishList((prev) =>
          prev.map((v) =>
            v.id === refIdSnapshot ? { ...v, itemAdded: true } : v
          )
        );
      }
    } else {
      handleDragCancel();
    }
    // will be using optimistic UI updates for fast and snappy dragging.

    const sendScheduleToDb = async () => {
      try {
        if (refIdSnapshot) {
          // combining check mark fetch and schedule new item post request.
          const responses = await Promise.all([
            fetch(`${apiURL}/schedule/${tripId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                start: previous[overContainer][activeIndex].startTime,
                end: previous[overContainer][activeIndex].endTime,
                location: previous[overContainer][activeIndex].location,
                cost: previous[overContainer][activeIndex].cost,
                details: previous[overContainer][activeIndex].details,
                multiDay: previous[overContainer][activeIndex].multiDay,
                sortIndex: previous[overContainer][activeIndex].sortIndex,
                chunk,
              }),
            }),
            fetch(`${apiURL}/check-list-item/${refIdSnapshot}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                newValue: true,
                tripId,
              }),
            }),
          ]);
          if (!responses[0].ok) {
            if (responses[0].status === 401) {
              navigate("/login", {
                state: { message: "Session expired, redirecting to log in..." },
              });
            }
            handleDragCancel();
            alert("error processing drag change");
            return;
          }
          if (!responses[1].ok) {
            if (responses[1].status === 401) {
              navigate("/login", {
                state: { message: "Session expired, redirecting to log in..." },
              });
            }
            handleDragCancel();
            alert("Error: List not found");
            return;
          }
          const data = await responses[0].json();
          if (data.newlyIndexedSchedule != null) {
            for (const i of data.newlyIndexedSchedule) {
              // times are already stored in db with timezone (should be UTC), so doing this just makes date objects in utc time.
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
            data.addedItem.startTime = new Date(data.addedItem.startTime);
            data.addedItem.endTime = new Date(data.addedItem.endTime);
            setSchedule((prev) => ({
              ...prev,
              [overContainer]: prev[overContainer].map((v) =>
                refIdSnapshot === v.id ? data.addedItem : v
              ),
            }));
          }
          setActiveListId(null);
        } else {
          // for an existing item in schedule
          const updatedItem = previous[overContainer][activeIndex];
          const result = await fetch(
            `${apiURL}/update-time/${updatedItem.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                start: updatedItem.startTime,
                end: updatedItem.endTime,
                sortIndex: updatedItem.sortIndex,
                tripId,
                chunk,
                lastModified: updatedItem.lastModified,
              }),
            }
          );
          if (!result.ok) {
            let b: boolean = false;
            if (result.status === 401) {
              navigate("/login", {
                state: { message: "Session expired, redirecting to log in..." },
              });
            } else if (result.status === 403) {
              alert("You do not have permission to access this resource");
            } else if (result.status === 404) {
              alert("Error: Trip not found");
            } else if (result.status === 409) {
              const data = await result.json();
              b = true;
              for (const i of data.newData) {
                // times are already stored in db with timezone (should be UTC), so doing this just makes date objects in utc time.
                i.startTime = new Date(i.startTime);
                i.endTime = new Date(i.endTime);
                i.id = String(i.id);
              }
              console.log("ERROR NEW DATA:", data.newData);
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
              setHoldOverwrite(previous[overContainer][activeIndex]);
              setBannerMsg(
                "Another user has updated this resource, your change was not applied"
              );
            } else if (result.status >= 500) {
              alert(
                "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
              );
            } else {
              console.log("something went wrong editing");
            }
            if (!b) {
              handleDragCancel();
            } else {
              handleDragCancel(null, true);
            }
          } else if (result.ok) {
            const data: {
              updatedData?: Schedule;
              newlyIndexedSchedule?: Schedule[];
            } = await result.json();
            if (data.newlyIndexedSchedule != null) {
              for (const i of data.newlyIndexedSchedule) {
                // times are already stored in db with timezone (should be UTC), so doing this just makes date objects in utc time.
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
              data.updatedData.startTime = new Date(data.updatedData.startTime);
              data.updatedData.endTime = new Date(data.updatedData.endTime);
              setSchedule((prev) => {
                {
                  const obj: DaySchedule = {
                    ...prev,
                    [overContainer]: prev[overContainer].map((v) =>
                      v.id === data.updatedData?.id ? data.updatedData : v
                    ),
                  };
                  return obj;
                }
              });
            }
          }
        }
      } catch {
        setActiveListId(null);
        setSchedule(clonedSchedule);
      }
    };
    sendScheduleToDb();
    handleDragCancel(true);
  };

  const changeEndDate = (
    newStartTime: Date,
    multiDayCheck: boolean,
    fromList?: boolean
  ): Date => {
    if (fromList) {
      return new Date(newStartTime.getTime() + 60 * 60 * 1000);
    }
    if (multiDayCheck) {
      return new Date(newStartTime.getTime() + 60 * 60 * 24 * 1000);
    } else {
      return new Date(newStartTime.getTime() + 60 * 60 * 1000);
    }
  };

  const changeDropTime = (
    currentSchedule: DaySchedule,
    activeIndex: number,
    overIndex: number | null,
    overContainer: string
  ): Date => {
    console.log("active index: ", activeIndex);
    console.log("over index: ", overIndex);
    // active index is still the original index despite it shifting around (for same table items)
    // ts-ignore
    let activeStartTime: Date =
      currentSchedule[overContainer][activeIndex].startTime;
    const holdTime = activeStartTime.toISOString().split("T")[1]; // the time should already be in UTC so going to ISOString should not change time: format hh:mm:ss.sssZ
    activeStartTime = new Date(`${overContainer}T${holdTime}`);
    console.log("time at start: ", activeStartTime);
    console.log("flag");
    //debugger;
    if (currentSchedule[overContainer].length <= 0) {
      // this should never run with the way we have dragging over empty containers (new containers) set up.
      handleDragCancel();
      return new Date();
    }
    if (currentSchedule[overContainer].length === 1) {
      // dropping on empty container but changing table resets state so we can't check with overIndex === null, we can instead check for a length of one. (Non-moved objects are omitted before calling changeDropTime)
      activeStartTime = new Date(`${overContainer}T${holdTime}`);
    } else {
      if (overIndex === activeIndex) {
        // will trigger on new table items (zero index, end of table, or dragging from list)
        const timeAbove =
          currentSchedule[overContainer][activeIndex - 1]?.startTime;
        const timeBelow =
          currentSchedule[overContainer][activeIndex + 1]?.startTime;
        if (overIndex === 0) {
          // top of container
          if (activeStartTime.getTime() > timeBelow.getTime()) {
            if (timeBelow.getUTCHours() === 0) {
              activeStartTime = new Date(`${overContainer}T00:00:00Z`);
            } else {
              const newHour = prefixZero(timeBelow.getUTCHours() - 1);
              const sameMinute = prefixZero(activeStartTime.getUTCMinutes());
              activeStartTime = new Date(
                `${overContainer}T${newHour}:${sameMinute}:00Z`
              );
            }
          }
        } else if (overIndex === currentSchedule[overContainer].length - 1) {
          // bottom of container
          if (timeAbove.getUTCHours() === 23) {
            activeStartTime = new Date(`${overContainer}T23:59:00Z`);
          } else {
            activeStartTime = new Date(
              `${overContainer}T${prefixZero(
                timeAbove.getUTCHours() + 1
              )}:${prefixZero(activeStartTime.getUTCMinutes())}:00Z`
            );
          }
        } else {
          // somewhere inbetween (will be a list item)
          if (
            timeAbove.getTime() <= activeStartTime.getTime() &&
            timeBelow.getTime() >= activeStartTime.getTime()
          ) {
            // perfect squeeze, no action needed
          } else {
            if (
              timeAbove.getTime() === timeBelow.getTime() ||
              timeAbove.getUTCHours() === 23
            ) {
              activeStartTime = new Date(timeAbove.toISOString());
            } else {
              if (timeBelow.getUTCHours() - timeAbove.getUTCHours() > 1) {
                activeStartTime = new Date(
                  `${overContainer}T${prefixZero(
                    timeAbove.getUTCHours() + 1
                  )}:${prefixZero(activeStartTime.getUTCMinutes())}:00Z`
                );
              } else {
                // will either be the same hour or 1 hour apart
                if (timeBelow.getUTCHours() - timeAbove.getUTCHours() === 1) {
                  if (timeBelow.getUTCMinutes() > timeAbove.getUTCMinutes()) {
                    // greater than an hour gap
                    if (
                      timeBelow.getUTCMinutes() >
                      activeStartTime.getUTCMinutes()
                    ) {
                      // current minutes less than time below, can freely add an hour and keep minutes
                      activeStartTime = new Date(
                        `${overContainer}T${prefixZero(
                          timeAbove.getUTCHours() + 1
                        )}:${prefixZero(activeStartTime.getUTCMinutes())}:00Z`
                      );
                    } else {
                      // current minutes greater. just add hour and zero the minutes instead of microing minutes
                      activeStartTime = new Date(
                        `${overContainer}T${prefixZero(
                          timeAbove.getUTCHours() + 1
                        )}:00:00Z`
                      );
                    }
                  } else {
                    // less than an hour gap when including minutes
                    activeStartTime = new Date(
                      `${overContainer}T${prefixZero(
                        timeAbove.getUTCHours() + 1
                      )}:00:00Z`
                    );
                  }
                } else {
                  // same hour
                  activeStartTime = timeAbove;
                }
              }
            }
          }
        }
      } else {
        if (overIndex === 0 && currentSchedule[overContainer].length > 1) {
          const timeBelow = currentSchedule[overContainer][overIndex].startTime;
          if (activeStartTime.getTime() > timeBelow.getTime()) {
            if (timeBelow.getUTCHours() === 0) {
              activeStartTime = new Date(`${overContainer}T00:00:00Z`);
            } else {
              const newHour = prefixZero(timeBelow.getUTCHours() - 1);
              const sameMinute = prefixZero(activeStartTime.getUTCMinutes());
              activeStartTime = new Date(
                `${overContainer}T${newHour}:${sameMinute}:00Z`
              );
            }
          }
        } else {
          //otherwise we can just grab the time from above
          if (overIndex === null) return activeStartTime;
          const positionModifier = activeIndex < overIndex ? 0 : 1;
          const timeAbove =
            currentSchedule[overContainer][overIndex - positionModifier]
              .startTime;
          const timeBelow =
            currentSchedule[overContainer][overIndex - positionModifier + 1]
              ?.startTime;
          if (timeBelow == null && timeAbove != null) {
            // last item in list
            if (timeAbove.getUTCHours() === 23) {
              activeStartTime = new Date(`${overContainer}T23:59:00Z`);
            } else {
              if (activeStartTime.getTime() <= timeAbove.getTime()) {
                activeStartTime = new Date(
                  `${overContainer}T${prefixZero(
                    timeAbove.getUTCHours() + 1
                  )}:${prefixZero(activeStartTime.getUTCMinutes())}:00Z`
                );
              } else {
                // day is correct, no item below, time is after item above, no action needed
              }
            }
          } else {
            // squeeze new item between two item start times
            if (
              timeAbove.getTime() <= activeStartTime.getTime() &&
              timeBelow.getTime() >= activeStartTime.getTime()
            ) {
              // perfect squeeze, no action needed
            } else {
              if (
                timeAbove.getTime() === timeBelow.getTime() ||
                timeAbove.getUTCHours() === 23
              ) {
                activeStartTime = new Date(timeAbove.toISOString());
              } else {
                if (timeBelow.getUTCHours() - timeAbove.getUTCHours() > 1) {
                  activeStartTime = new Date(
                    `${overContainer}T${prefixZero(
                      timeAbove.getUTCHours() + 1
                    )}:${prefixZero(activeStartTime.getUTCMinutes())}:00Z`
                  );
                } else {
                  // will either be the same hour or 1 hour apart
                  if (timeBelow.getUTCHours() - timeAbove.getUTCHours() === 1) {
                    if (timeBelow.getUTCMinutes() > timeAbove.getUTCMinutes()) {
                      // greater than an hour gap
                      if (
                        timeBelow.getUTCMinutes() >
                        activeStartTime.getUTCMinutes()
                      ) {
                        // current minutes less than time below, can freely add an hour and keep minutes
                        activeStartTime = new Date(
                          `${overContainer}T${prefixZero(
                            timeAbove.getUTCHours() + 1
                          )}:${prefixZero(activeStartTime.getUTCMinutes())}:00Z`
                        );
                      } else {
                        // current minutes greater. just add hour and zero the minutes instead of microing minutes
                        activeStartTime = new Date(
                          `${overContainer}T${prefixZero(
                            timeAbove.getUTCHours() + 1
                          )}:00:00Z`
                        );
                      }
                    } else {
                      // less than an hour gap when including minutes
                      activeStartTime = new Date(
                        `${overContainer}T${prefixZero(
                          timeAbove.getUTCHours() + 1
                        )}:00:00Z`
                      );
                    }
                  } else {
                    // same hour
                    activeStartTime = timeAbove;
                  }
                }
              }
            }
          }
        }
      }
    }
    console.log("time at end: ", activeStartTime);
    return activeStartTime;
  };

  const handleDragCancel = (
    noErrEnd?: boolean | null,
    skipTheClone?: boolean
  ) => {
    if (noErrEnd == null) {
      if (skipTheClone == null) {
        setSchedule(clonedSchedule);
      }
      setWishList(wishListClone);
      document.body.classList.remove("freezeScroll");
      setActiveListId(null);
    }
    setActiveId(null);
    setDragRow(null);
    setDragFrom("");
    tempScheduleItem.current = null;
    recentlyMovedToNewContainer.current = false;
    initialListDrag.current = true;
    lastOverId.current = null;
  };

  const findContainerAndIndex = (
    id: UniqueIdentifier | undefined | string,
    specificSchedule?: DaySchedule
  ): DraggingState => {
    const containerAndIndex: DraggingState = { container: null, index: null };
    if (!id) return containerAndIndex;
    if (specificSchedule) {
      if (id in specificSchedule) {
        // check if our id is actually just an empty table (container)
        containerAndIndex["container"] = String(id);
        return containerAndIndex;
      }
      for (const v of Object.keys(specificSchedule)) {
        for (let i = 0; i < specificSchedule[v].length; i++) {
          if (specificSchedule[v][i].id === id) {
            containerAndIndex["container"] = v;
            containerAndIndex["index"] = i;
            return containerAndIndex;
          }
        }
      }
    } else {
      if (id in schedule) {
        // check if our id is actually just an empty table (container)
        containerAndIndex["container"] = String(id);
        return containerAndIndex;
      }
      for (const v of Object.keys(schedule)) {
        for (let i = 0; i < schedule[v].length; i++) {
          if (schedule[v][i].id === id) {
            containerAndIndex["container"] = v;
            containerAndIndex["index"] = i;
            return containerAndIndex;
          }
        }
      }
    }
    return containerAndIndex;
  };

  const gValuesFn = (vp: Vp, gLocation: string, gId: string) => {
    setVp(vp);
    setLocation(gLocation);
    setGId(gId);
  };

  const handleSubmitItem = useCallback(
    async (value: string, id?: UniqueIdentifier) => {
      const val = value;
      const response = await fetch(`${apiURL}/list/${tripId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: val, fromGoogle: id ?? null }),
      });
      if (response.status === 401) {
        navigate("/login", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      } else if (response.status === 403) {
        alert("You do not have permission to access this resource");
        return 400;
      } else if (response.status === 404) {
        alert("Error: Trip not found");
        return 400;
      } else if (response.status >= 500) {
        alert(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
        return 500;
      } else if (response.ok) {
        const apiData: { data: Item } = await response.json();
        setWishList((prev) => [...prev, apiData.data]);
        return 200;
      }
    },
    []
  );

  const handleDeleteItem = useCallback(
    async (itemId: UniqueIdentifier, isGoogleId: boolean) => {
      const response = await fetch(`${apiURL}/list/${itemId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isGoogleId, tripId }),
      });

      if (response.status === 401) {
        navigate("/login", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      } else if (response.status === 403) {
        alert("You do not have permission to access this resource");
        return 400;
      } else if (response.status === 404) {
        alert("Error: Trip not found");
        return 400;
      } else if (response.status >= 500) {
        alert(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
        return 500;
      } else if (response.ok) {
        const data = await response.json();
        setWishList((prev) =>
          prev.filter((v) => v.id !== data.deletedData[0].id)
        );
        return 200;
      }
    },
    []
  );

  const placeItemInSchedule = (
    oldArr: Schedule[],
    item: Schedule
  ): Schedule[] => {
    const itemStartItem = item.startTime.getTime();
    let index: number = oldArr.findIndex((v) => {
      if (v.startTime.getTime() > itemStartItem) {
        // if our item should be at the end our index will be -1, will place same time items at the bottom of same time stack
        return true;
      } else {
        return false;
      }
    });
    index =
      index - 1 === -2 ? oldArr.length - 1 : index - 1 === -1 ? 0 : index - 1;
    return [...oldArr.slice(0, index), item, ...oldArr.slice(index)];
  };

  const handleOverwrite = async (e: React.MouseEvent) => {
    // have to find the item inside the new schedule, if found, PATCH if not POST
    e.preventDefault();
    setHarmlessFlipper((prev) => !prev);
    setEditLineId(null);
    setAddingItem(false);
    if (holdOverwrite == null) {
      return;
    }
    const idToFind = holdOverwrite.id;
    let itemFound: number = -1;
    let newItemContainer: string = "";
    let newItemIndex: number = -1;
    for (const day of Object.keys(schedule)) {
      itemFound = schedule[day].findIndex((v, i) => {
        if (v.id === idToFind) {
          newItemIndex = i;
          return true;
        }
      });
      if (itemFound !== -1) {
        newItemContainer = day;
        break;
      }
    }
    const previousItemContainer = holdOverwrite.startTime
      .toISOString()
      .split("T")[0];
    let chunk: Chunk;

    // will still need to filter out the dupe when setting state later after fetch returns
    let newArrOldItem: Schedule[];
    if (itemFound === -1 || newItemContainer !== previousItemContainer) {
      newArrOldItem = placeItemInSchedule(
        schedule[previousItemContainer].slice(),
        holdOverwrite
      );
      chunk = indexChunk(holdOverwrite.id, newArrOldItem);
    } else {
      //newItemContainer === previousItemContainer
      const arrOfDay = schedule[newItemContainer]
        .slice()
        .filter((v) => v.id !== holdOverwrite.id);
      newArrOldItem = placeItemInSchedule(arrOfDay, holdOverwrite);
      chunk = indexChunk(holdOverwrite.id, newArrOldItem);
    }

    try {
      if (itemFound === -1) {
        console.log("Previously deleted, restoring...");
        const addingReq = await fetch(`${apiURL}/schedule/${tripId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: holdOverwrite.id,
            start: holdOverwrite.startTime,
            end: holdOverwrite.endTime,
            location: holdOverwrite.location,
            details: holdOverwrite.details,
            cost: holdOverwrite.cost,
            multiDay: holdOverwrite.multiDay,
            chunk: chunk,
          }),
        });
        if (addingReq.ok) {
          const data = await addingReq.json();
          const startTime = new Date(data.addedItem.startTime);
          const day = startTime.toISOString().split("T")[0];
          console.log("sched", schedule);
          setSchedule((prev) => {
            const addedItem = {
              ...data.addedItem,
              startTime: new Date(data.addedItem.startTime),
              endTime: new Date(data.addedItem.endTime),
            };
            console.log(addedItem);
            prev[day].push(addedItem);
            prev[day].sort(
              (a: Schedule, b: Schedule) =>
                a.startTime.getTime() - b.startTime.getTime()
            );
            return {
              ...prev,
              [day]: [...prev[day]],
            };
          });
        } else if (addingReq.status === 401) {
          navigate("/redirect", {
            state: { message: "Session expired, redirecting to log in..." },
          });
          // should prob replace this with a function inside auth to renew token via refresh token, and if i can't find any or the refresh is expired then navigate to login
        } else if (addingReq.status === 403) {
          clearOverwriteBanner();
          alert("You do not have permission to access this resource");
        } else if (addingReq.status === 404) {
          clearOverwriteBanner();
          alert("Error: Trip not found");
        } else if (addingReq.status >= 500) {
          clearOverwriteBanner();
          alert(
            "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
          );
        }
      } else {
        const patchRes = await fetch(`${apiURL}/schedule/${holdOverwrite.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            start: holdOverwrite.startTime,
            end: holdOverwrite.endTime,
            location: holdOverwrite.location,
            details: holdOverwrite.details,
            cost: holdOverwrite.cost,
            multiDay: holdOverwrite.multiDay,
            chunk,
            tripId,
            lastModified: schedule[newItemContainer][newItemIndex].lastModified,
          }),
        });
        if (patchRes.ok) {
          const data = await patchRes.json();
          clearOverwriteBanner();
          setSchedule((prev) =>
            newItemContainer !== previousItemContainer
              ? {
                  ...prev,
                  [newItemContainer]: prev[newItemContainer].filter(
                    (v) => v.id !== holdOverwrite.id
                  ),
                  [previousItemContainer]: newArrOldItem.map((v: Schedule) =>
                    v.id === holdOverwrite.id
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
                  [previousItemContainer]: newArrOldItem.map((v) =>
                    v.id === holdOverwrite.id
                      ? {
                          ...data.updatedData,
                          startTime: new Date(data.updatedData.startTime),
                          endTime: new Date(data.updatedData.endTime),
                        }
                      : v
                  ),
                }
          );
        } else if (patchRes.status === 401) {
          navigate("/redirect", {
            state: { message: "Session expired, redirecting to log in..." },
          });
          // should prob replace this with a function inside auth to renew token via refresh token, and if i can't find any or the refresh is expired then navigate to login
        } else if (patchRes.status === 403) {
          clearOverwriteBanner();
          alert("You do not have permission to access this resource");
        } else if (patchRes.status === 404) {
          clearOverwriteBanner();
          alert("Error: Trip not found");
        } else if (patchRes.status === 409) {
          const data = await patchRes.json();
          for (const i of data.newData) {
            // times are already stored in db with timezone (should be UTC), so doing this just makes date objects in utc time.
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
          setHoldOverwrite({ ...holdOverwrite });
          setBannerMsg(
            "Another user has updated this resource AGAIN, your change was not applied"
          );
          alert(
            "Another user has updated this resource, your change was not applied"
          );
        } else if (patchRes.status >= 500) {
          clearOverwriteBanner();
          alert(
            "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
          );
        } else {
          console.log("something went wrong editing");
        }
      }
    } catch (err) {
      console.log(err);
      return;
    }
  };

  const Overwrite = () => {
    return (
      <div className={styles.overwrite}>
        {
          holdOverwrite && (
            <button
              className={styles.overwriteButton}
              onClick={handleOverwrite}
            >
              Overwrite change?
            </button>
          ) /* can add a way to do 500 status retries later */
        }
      </div>
    );
  };

  const Banner = () => {
    return (
      <div className={`${styles.bannerAndOverwrite}`}>
        <div className={styles.clearBnO}>
          <button className={styles.clearButton} onClick={clearOverwriteBanner}>
            <img src={clearCircle} alt="clearCircle" />
          </button>
        </div>
        <div className={styles.banner}>
          {bannerMsg && <div className={styles.bannerMsg}>{bannerMsg}</div>}
        </div>
        <div className={styles.timerBar}></div>
        {holdOverwrite && <Overwrite />}
      </div>
    );
  };

  const clearOverwriteBanner = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setBannerMsg(null);
    setHoldOverwrite(null);
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => handleDragCancel()}
      sensors={sensors}
      collisionDetection={customCollisionsDetectionAlgorithm}
      autoScroll={{
        enabled: true,
        threshold: { x: 0.08, y: 0.25 },
        acceleration: 2.5,
      }}
      //measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      //layoutMeasuring={{strategy: LayoutMeasuringStrategy.Always}}
      //modifiers={[restrictToFirstScrollableAncestor]}
    >
      <div className={styles.pageWrapper}>
        <div className={styles.tableAndList}>
          <EditScheduleProvider
            utcStart={utcStart}
            utcEnd={utcEnd}
            setUtcStart={setUtcStart}
            setUtcEnd={setUtcEnd}
            individualAddition={individualAddition}
            setIndividualAddition={setIndividualAddition}
            editLineId={editLineId}
            setEditLineId={setEditLineId}
            addingItem={addingItem}
            setAddingItem={setAddingItem}
            setHoldOverwrite={setHoldOverwrite}
            setBannerMsg={setBannerMsg}
          >
            <EditVacationSchedule
              loadFirst={() => setLoading(false)}
              getMapValues={gValuesFn}
              schedule={schedule}
              setSchedule={setSchedule}
              activeItem={activeId}
              dragRow={dragRow}
              overlayWidthRef={overlayWidthRef.current}
              dragFrom={dragFrom}
            />
          </EditScheduleProvider>
          {!loading && (
            <WantToSeeList
              loadSecond={() => setLoading2(false)}
              setList={setWishList}
              list={wishList}
              handleSubmitItem={handleSubmitItem}
              handleDeleteItem={handleDeleteItem}
              activeListId={activeListId} // FOR NEXT TIME, work on fixing same ID drag not working in list (consecutive drags from list of same item), possibly get rid of active list id state.
            />
          )}
        </div>
        {!loading2 && (
          <MyMapComponent
            bounds={vp}
            startLocation={location}
            gId={gId}
            list={wishList}
            handleSubmitItem={handleSubmitItem}
            handleDeleteItem={handleDeleteItem}
          />
        )}
      </div>
      {bannerMsg && <Banner />}
    </DndContext>
  );
};

export default EditCanvas;
