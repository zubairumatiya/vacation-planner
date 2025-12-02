import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import MyMapComponent from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState, useCallback, useContext, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
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
import {
  type DaySchedule,
  type DraggingState,
  type Schedule,
} from "./EditVacationSchedule";
import type { CollisionDetection } from "@dnd-kit/core/dist/utilities/algorithms/types";
import { arrayMove } from "@dnd-kit/sortable";

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
  const recentlyMovedToNewContainer = useRef<boolean>(false);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const customCollisionsDetectionAlgorithm: CollisionDetection = useCallback(
    (args) => {
      const pointerCollisions = pointerWithin(args); // we will use this for touch and pointer sensor

      const intersections =
        pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args); // fallback on closest corners in case of keyboard sensor

      let overId = getFirstCollision(intersections, "id"); // i guess this will always be the container first? According to source code example?

      if (overId !== null) {
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

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id);
    const containerAndIndex = findContainerAndIndex(e.active.id);
    if (containerAndIndex.container && containerAndIndex.index)
      setDragRow(
        schedule[containerAndIndex?.container][containerAndIndex.index]
      );
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    // sorting animation and shuffling seems to be the deafult within the same container!
    // see if dragged to new container
    if (!over) return;
    const activeInfo = findContainerAndIndex(active.id);
    const activeContainer = activeInfo.container;
    const overInfo = findContainerAndIndex(over.id);
    const overContainer = overInfo.container;

    if (!overContainer || !activeContainer) {
      return;
    }

    if (activeContainer !== overContainer) {
      setSchedule((prevSchedule) => {
        const activeItems = prevSchedule[activeContainer];
        const overItems = prevSchedule[overContainer];
        const activeIndex = activeInfo.index;
        const overIndex = overInfo.index;

        let newIndex: number;

        if (over.id in schedule || overIndex === null) {
          newIndex = overItems.length + 1;
        } else {
          const isBelowOverItem = // we have to decide if our item is going above or below the item we are over (which is returned from our collion alg). Specifically when switching containers, we need a simple calc to see where to place it
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height;

          const modifier = isBelowOverItem ? 1 : 0;

          newIndex =
            overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
        }

        recentlyMovedToNewContainer.current = true;

        return {
          ...prevSchedule,
          [activeContainer]: activeItems.filter((v) => v.id !== active.id),
          [overContainer]: [
            ...overItems.slice(0, newIndex),
            activeItems[activeIndex ?? 0],
            ...overItems.slice(newIndex, overItems.length),
          ],
        };
      });
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over?.id == null) {
      setActiveId(null);
      return;
    }
    const activeInfo = findContainerAndIndex(active.id);
    const activeIndex = activeInfo.index;
    const overInfo = findContainerAndIndex(over.id);
    const overIndex = overInfo.index;
    const overContainer = overInfo.container;

    if (activeIndex == null) {
      return;
    }

    if (activeInfo.container == null || overContainer == null) {
      setActiveId(null);
      return;
    }
    if (activeInfo.index !== overInfo.index) {
      setSchedule((prevSchedule) => {
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
    }
    setActiveId(null);
    // will prob just end up moving time change and api end point fetch request here instead, will be easier since we are wanting to incorporate drag across components
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

  const prefixZero = (x: number): string => {
    if (x <= 9) {
      return "0" + x;
    }
    return "" + x;
  };

  const changeDropTime = (
    currentSchedule: DaySchedule,
    activeIndex: number,
    overIndex: number | null,
    overContainer: string
  ): Date => {
    // ts-ignore
    let activeStartTime: Date =
      currentSchedule[overContainer][activeIndex].startTime;
    const holdTime = activeStartTime.toISOString().split("T")[1]; // the time should already be in UTC so going to ISOString should not change time: format hh:mm:ss.sssZ

    if (!overIndex) {
      // dropping on empty container
      activeStartTime = new Date(`${overContainer}T${holdTime}`);
    } else if (activeIndex === 0) {
      // will need time of below item
      activeStartTime = new Date(`${overContainer}T${holdTime}`);
      const timeBelow =
        currentSchedule[overContainer][activeIndex + 1].startTime;
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
      } else {
        // item is at the top of day, day is correct, time is before item below, no change needed.
      }
    } else {
      //otherwise we can just grab the time from above
      const timeAbove =
        currentSchedule[overContainer][activeIndex - 1].startTime;
      const timeBelow =
        currentSchedule[overContainer][activeIndex + 1]?.startTime;
      if (!timeBelow) {
        if (timeAbove.getUTCHours() === 23) {
          activeStartTime = new Date(
            `${overContainer}T23:${prefixZero(
              activeStartTime.getUTCMinutes()
            )}:00Z`
          );
        } else {
          if (activeStartTime.getTime() < timeAbove.getTime()) {
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
            activeStartTime = timeAbove;
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
                    timeBelow.getUTCMinutes() > activeStartTime.getUTCMinutes()
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
    return activeStartTime;
  };

  // NEXT: Move api end point calls to frontend -- make list draggable -- need to make list ID's more unique because rn there can be a mistaken identity in findContainer, actually can prob just add data arg.

  const findContainerAndIndex = (
    id: UniqueIdentifier | undefined | string
  ): DraggingState => {
    const containerAndIndex: DraggingState = { container: null, index: null };
    if (!id) return containerAndIndex;
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
    return containerAndIndex;
  };

  const gValuesFn = (vp: Vp, gLocation: string, gId: string) => {
    setVp(vp);
    setLocation(gLocation);
    setGId(gId);
  };

  const handleSubmitItem = useCallback(async (value: string, id?: string) => {
    const val = value;
    const response = await fetch(`${apiURL}/list/${tripId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: val, id: id ?? null }),
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
  }, []);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    const response = await fetch(`${apiURL}/list/${itemId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
      setWishList((prev) => prev.filter((v) => v.id !== itemId));
      return 200;
    }
  }, []);

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      sensors={sensors}
      collisionDetection={customCollisionsDetectionAlgorithm}
    >
      <div className={styles.pageWrapper}>
        <EditVacationSchedule
          loadFirst={() => setLoading(false)}
          getMapValues={gValuesFn}
          schedule={schedule}
          setSchedule={setSchedule}
          dragRow={dragRow}
          setCostTotal={setCostTotal}
        />
        {!loading && (
          <WantToSeeList
            loadSecond={() => setLoading2(false)}
            setList={setWishList}
            list={wishList}
            handleSubmitItem={handleSubmitItem}
            handleDeleteItem={handleDeleteItem}
          />
        )}
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
