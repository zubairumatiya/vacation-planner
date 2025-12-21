import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import MyMapComponent from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState, useCallback, useContext, useRef } from "react";
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
import { type DraggingState, type Schedule } from "./EditVacationSchedule";
import type { CollisionDetection } from "@dnd-kit/core/dist/utilities/algorithms/types";
import { arrayMove } from "@dnd-kit/sortable";
import type { AnyData } from "@dnd-kit/core/dist/store/types";
//import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { prefixZero } from "../utils/timeHelpers";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";

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
    document.body.classList.add("freezeScroll");
    if (typeOfDrag?.type === "list") {
      setActiveListId(e.active.id);
      const listValue =
        wishList.find((item) => item.id == e.active.id)?.value ?? "";
      tempScheduleItem.current = {
        id: e.active.id, //-1,
        tripId: Number(tripId),
        location: listValue,
        details: "",
        startTime: new Date(),
        endTime: new Date(),
        cost: 0,
        multiDay: false,
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
        console.log("dragover info: ", {
          overId: over.id,
          activeId: active.id,
          overContainer,
          overIndex,
          activeIndex,
        });
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

    if (
      activeIndex === null ||
      activeInfo.container === null ||
      overContainer === null
    ) {
      // this is not like drag over where a null index indicates an empty table, since we will have already set the active item in schedule, it should return an index. This is a catch all check.
      handleDragCancel();
      return;
    }
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
        prevSchedule[overContainer][activeIndex] = {
          // mutation but we make a new ref upon returning
          ...prevSchedule[overContainer][activeIndex],
          startTime: newStartTime,
          endTime: newEndTime,
        };
        return {
          ...prevSchedule,
          [overContainer]: arrayMove(
            prevSchedule[overContainer],
            activeIndex,
            overIndex ?? 0
          ),
        };
      });
    } else {
      handleDragCancel();
    }
    // will be using optimistic UI updates for fast and snappy dragging.
    const refIdSnapshot = tempScheduleItem.current?.id; // need closure, ref always points to current

    const sendScheduleToDb = async () => {
      try {
        if (refIdSnapshot) {
          const result = await fetch(`${apiURL}/schedule/${tripId}`, {
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
            }),
          });
          if (result.ok) {
            const data = await result.json();
            data.addedItem.startTime = new Date(data.addedItem.startTime);
            data.addedItem.endTime = new Date(data.addedItem.endTime);
            setSchedule((prev) => ({
              ...prev,
              [overContainer]: prev[overContainer].map((v) =>
                refIdSnapshot === v.id ? data.addedItem : v
              ),
            }));
            setActiveListId(null);
            setWishList((prev) =>
              prev.map(
                (v) => (v.id === refIdSnapshot ? { ...v, itemAdded: true } : v) // TODO: the new itemAdded boolean value is not added to the db i think
              )
            );
          } else {
            if (result.status === 401) {
              navigate("/login", {
                state: { message: "Session expired, redirecting to log in..." },
              });
            }
            handleDragCancel();
            alert("error processing change");
          }
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
              }),
            }
          );
          if (!result.ok) {
            if (result.status === 401) {
              navigate("/login", {
                state: { message: "Session expired, redirecting to log in..." },
              });
            }
            handleDragCancel();
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

  const handleDragCancel = (noErrEnd?: boolean) => {
    if (noErrEnd == null) {
      setSchedule(clonedSchedule);
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
      }
      if (response.status === 404) {
        alert("Error: List not found");
      }
      if (response.ok) {
        const apiData: { data: Item } = await response.json();
        setWishList((prev) => [...prev, apiData.data]);
        return 200;
      }
    },
    []
  );

  const handleDeleteItem = useCallback(
    async (itemId: UniqueIdentifier, fromGoogle: boolean) => {
      const response = await fetch(`${apiURL}/list/${itemId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fromGoogle }),
      });

      if (response.status === 401) {
        navigate("/login", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      }
      if (response.status === 404) {
        alert("Error: List not found");
      }
      if (response.ok) {
        setWishList((prev) => prev.filter((v) => v.id != itemId));
        return 200;
      }
    },
    []
  );

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
      modifiers={[restrictToFirstScrollableAncestor]}
    >
      <div className={styles.pageWrapper}>
        <div className={styles.tableAndList}>
          <EditScheduleProvider>
            <EditVacationSchedule
              loadFirst={() => setLoading(false)}
              getMapValues={gValuesFn}
              schedule={schedule}
              setSchedule={setSchedule}
              activeItem={activeId}
              dragRow={dragRow}
              setCostTotal={setCostTotal}
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
    </DndContext>
  );
};

export default EditCanvas;
