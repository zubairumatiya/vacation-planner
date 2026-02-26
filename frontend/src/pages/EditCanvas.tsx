import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import MyMapComponent from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState, useCallback, useContext, useRef, useEffect, useMemo } from "react";
import { useParams, useOutletContext, Navigate } from "react-router-dom";
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
  calculateNewSortIndex,
  indexChunk,
  makeContainers,
  prefixZero,
} from "../utils/timeHelpers";

import { BannerContextProvider } from "../context/BannerContext";

import Banner from "../components/Banner";
import refreshFn from "../utils/refreshFn";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "../components/ErrorFallback";

const apiURL = import.meta.env.VITE_API_URL;

const EditCanvas = ({
  setCostTotal,
}: {
  setCostTotal: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { tripId } = useParams();
  const { role } = useOutletContext<{ role: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [loading2, setLoading2] = useState<boolean>(true);
  const [vp, setVp] = useState<null | Vp>(null);
  const [location, setLocation] = useState<string>("");
  const [wishList, setWishList] = useState<Item[]>([]);
  const [wishListClone, setWishListClone] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule>({});
  const [dragRow, setDragRow] = useState<Schedule | null>(null);
  const [dragFrom, setDragFrom] = useState<string>("");
  const [clonedSchedule, setClonedSchedule] = useState<DaySchedule>({});
  const recentlyMovedToNewContainer = useRef<boolean>(false);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const auth = useContext(AuthContext);
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const tempScheduleItem = useRef<Schedule | null>(null);
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
  const [remountKey, setRemountKey] = useState<number>(0);
  const [mapRetries, setMapRetries] = useState<number>(0);
  const [scheduleRetries, setScheduleRetries] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(
    () => window.matchMedia("(max-width: 700px)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 700px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const days = useMemo<DayContainer[]>(() => {
    if (utcStart === 0 || utcEnd === 0) return [];
    const length = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
    return makeContainers(length, new Date(utcStart));
  }, [utcStart, utcEnd]);

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
      const pointerCollisions = pointerWithin(args);
      let intersections;
      if (initialListDrag.current) {
        intersections = pointerCollisions;
      } else {
        intersections =
          pointerCollisions.length > 0
            ? pointerCollisions
            : closestCorners(args);
      }
      let overId = getFirstCollision(intersections, "id");
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
            })[0]?.id;
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
  const login = auth?.login;
  const logout = auth?.logout;

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
      const listItem = wishList.find((item) => item.id == e.active.id);
      const listValue = listItem?.value ?? "";
      tempScheduleItem.current = {
        id: e.active.id,
        tripId: String(tripId),
        location: listValue,
        details: listItem?.details ?? "",
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
    if (!over) return;
    const activeInfo =
      tempScheduleItem.current && initialListDrag.current
        ? { container: "-1", index: -1 }
        : findContainerAndIndex(active.id); // list items wont be in schedule yet
    const activeContainer = activeInfo.container;
    const overInfo = findContainerAndIndex(over.id);
    const overContainer = overInfo.container;
    if (!overContainer || !activeContainer) {
      return;
    }
    if (activeContainer !== overContainer) {
      initialListDrag.current = false;
      setSchedule((prevSchedule) => {
        const activeItems = prevSchedule[activeContainer];
        const overItems = prevSchedule[overContainer];
        const activeIndex = activeInfo.index;
        const overIndex = overInfo.index;

        let newIndex: number;
        if (over.id in schedule || overIndex === null) {
          newIndex = overItems.length + 1;
        } else {
          const isBelowOverItem = //this formula is only for table switching, otherwise dnd is calculated w pointer
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
          tempScheduleItem.current
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
      });
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    document.body.classList.remove("freezeScroll");

    if (over?.id == null) {
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
      //it should return an index. This is a catch all check.
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
          let a: boolean = false;
          let b: boolean = false;
          const reqObj0 = {
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
          };
          const reqObj1 = {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              newValue: true,
              tripId,
            }),
          };
          const responses = await Promise.all([
            fetch(`${apiURL}/schedule/${tripId}`, reqObj0),
            fetch(`${apiURL}/check-list-item/${refIdSnapshot}`, reqObj1),
          ]);
          let hold: Response | null = null;
          if (!responses[0].ok || !responses[1].ok) {
            if (responses[0].status === 401) {
              const resData = (await responses[0].json()) as ApiErrorResponse;
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
              const continueReq = await refreshFn(apiURL, refreshInFlightRef);
              if (!continueReq.err) {
                if (login && continueReq.token) {
                  login(continueReq.token);
                }
                hold = await fetch(`${apiURL}/schedule/${tripId}`, {
                  ...reqObj0,
                  headers: {
                    ...reqObj0.headers,
                    Authorization: `Bearer ${continueReq.token}`,
                  },
                });
                if (!hold.ok) {
                  setBannerMsg("Trouble completing req, please try again");
                  a = true;
                } else if (hold.ok) {
                  // no need
                }
              } else if (continueReq.err) {
                if (logout) {
                  await logout();
                }
                return;
              }
            } else {
              handleDragCancel(); // does this need to be here? No i don't think so, we can just make one
              a = true;
              setBannerMsg("error processing drag change");
            }
            if (responses[1].status === 401) {
              const resData1 = (await responses[1].json()) as ApiErrorResponse;
              if (resData1.error === "JwtError") {
                if (logout) {
                  await logout();
                }
                return;
              }
              if (refreshInFlightRef == null) {
                console.error("Auth flight ref not set");
                return;
              }
              const continueReq = await refreshFn(apiURL, refreshInFlightRef);
              if (!continueReq.err) {
                if (login && continueReq.token) {
                  login(continueReq.token);
                }
                const retryReq1 = await fetch(
                  `${apiURL}/check-list-item/${refIdSnapshot}`,
                  {
                    ...reqObj1,
                    headers: {
                      ...reqObj1.headers,
                      Authorization: `Bearer ${continueReq.token}`,
                    },
                  }
                );
                if (!retryReq1.ok) {
                  setBannerMsg("Trouble completing req, please try again");
                }
              } else if (continueReq.err) {
                if (logout) {
                  await logout();
                }
                return;
              }
            } else {
              handleDragCancel();
              b = true;
              setBannerMsg("Error: List not found");
            }
            if (!a && !b && hold != null) {
              const data = (await hold.json()) as ScheduleAddResponse;
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
              handleDragCancel();
            }
            return;
          }
          const data = (await responses[0].json()) as ScheduleAddResponse;
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
          const reqObj = {
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
          };
          const result = await fetch(
            `${apiURL}/update-time/${updatedItem.id}`,
            reqObj
          );

          const okResFn = async (okRes: Response) => {
            const data = (await okRes.json()) as ScheduleUpdateResponse;
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
              data.updatedData.startTime = new Date(data.updatedData.startTime);
              data.updatedData.endTime = new Date(data.updatedData.endTime);
              setSchedule((prev) => ({
                ...prev,
                [overContainer]: prev[overContainer].map((v) =>
                  v.id === data.updatedData?.id ? data.updatedData : v
                ),
              }));
            }
          };
          if (!result.ok) {
            let b: boolean = false;
            if (result.status === 401) {
              const resData = (await result.json()) as ApiErrorResponse;
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
              const continueReq = await refreshFn(apiURL, refreshInFlightRef);
              if (!continueReq.err) {
                if (login && continueReq.token) {
                  login(continueReq.token);
                }
                const retryReq = await fetch(
                  `${apiURL}/update-time/${updatedItem.id}`,
                  {
                    ...reqObj,
                    headers: {
                      ...reqObj.headers,
                      Authorization: `Bearer ${continueReq.token}`,
                    },
                  }
                );
                if (!retryReq.ok) {
                  setBannerMsg("Trouble completing req, please try again");
                } else if (retryReq.ok) {
                  b = true;
                  await okResFn(retryReq);
                  // insert continuing original request
                }
              } else if (continueReq.err) {
                if (logout) {
                  await logout();
                }
                return;
              }
            } else if (result.status === 403) {
              setBannerMsg(
                "You do not have permission to access this resource"
              );
            } else if (result.status === 404) {
              setBannerMsg("Error: Trip not found");
            } else if (result.status === 409) {
              const data = (await result.json()) as ScheduleConflictResponse;
              b = true;
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
              previous[overContainer][activeIndex].sortIndex =
                calculateNewSortIndex(chunk);
              setHoldOverwrite(previous[overContainer][activeIndex]);
              setBannerMsg(
                "Another user has updated this resource, your change was not applied"
              );
            } else if (result.status >= 500) {
              setBannerMsg(
                "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
              );
            } else {
              setBannerMsg("Uh oh. Something went wrong.");
            }
            if (!b) {
              handleDragCancel();
            } else {
              handleDragCancel(null, true);
            }
          } else if (result.ok) {
            await okResFn(result);
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
    // active index is still the original index despite it shifting around (for same table items)
    // ts-ignore
    let activeStartTime: Date =
      currentSchedule[overContainer][activeIndex].startTime;
    const holdTime = activeStartTime.toISOString().split("T")[1];
    activeStartTime = new Date(`${overContainer}T${holdTime}`);
    if (currentSchedule[overContainer].length <= 0) {
      handleDragCancel();
      return new Date();
    }
    if (currentSchedule[overContainer].length === 1) {
      activeStartTime = new Date(`${overContainer}T${holdTime}`);
    } else {
      if (overIndex === activeIndex) {
        const timeAbove =
          currentSchedule[overContainer][activeIndex - 1]?.startTime;
        const timeBelow =
          currentSchedule[overContainer][activeIndex + 1]?.startTime;
        if (overIndex === 0) {
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
          if (
            timeAbove.getTime() <= activeStartTime.getTime() &&
            timeBelow.getTime() >= activeStartTime.getTime()
          ) {
            // no action needed
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
                if (timeBelow.getUTCHours() - timeAbove.getUTCHours() === 1) {
                  if (timeBelow.getUTCMinutes() > timeAbove.getUTCMinutes()) {
                    if (
                      timeBelow.getUTCMinutes() >
                      activeStartTime.getUTCMinutes()
                    ) {
                      activeStartTime = new Date(
                        `${overContainer}T${prefixZero(
                          timeAbove.getUTCHours() + 1
                        )}:${prefixZero(activeStartTime.getUTCMinutes())}:00Z`
                      );
                    } else {
                      activeStartTime = new Date(
                        `${overContainer}T${prefixZero(
                          timeAbove.getUTCHours() + 1
                        )}:00:00Z`
                      );
                    }
                  } else {
                    activeStartTime = new Date(
                      `${overContainer}T${prefixZero(
                        timeAbove.getUTCHours() + 1
                      )}:00:00Z`
                    );
                  }
                } else {
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
          if (overIndex === null) return activeStartTime;
          const positionModifier = activeIndex < overIndex ? 0 : 1;
          const timeAbove =
            currentSchedule[overContainer][overIndex - positionModifier]
              .startTime;
          const timeBelow =
            currentSchedule[overContainer][overIndex - positionModifier + 1]
              ?.startTime;
          if (timeBelow == null && timeAbove != null) {
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
                  if (timeBelow.getUTCHours() - timeAbove.getUTCHours() === 1) {
                    if (timeBelow.getUTCMinutes() > timeAbove.getUTCMinutes()) {
                      if (
                        timeBelow.getUTCMinutes() >
                        activeStartTime.getUTCMinutes()
                      ) {
                        activeStartTime = new Date(
                          `${overContainer}T${prefixZero(
                            timeAbove.getUTCHours() + 1
                          )}:${prefixZero(activeStartTime.getUTCMinutes())}:00Z`
                        );
                      } else {
                        activeStartTime = new Date(
                          `${overContainer}T${prefixZero(
                            timeAbove.getUTCHours() + 1
                          )}:00:00Z`
                        );
                      }
                    } else {
                      activeStartTime = new Date(
                        `${overContainer}T${prefixZero(
                          timeAbove.getUTCHours() + 1
                        )}:00:00Z`
                      );
                    }
                  } else {
                    activeStartTime = timeAbove;
                  }
                }
              }
            }
          }
        }
      }
    }

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

  const gValuesFn = (
    vp: Vp,
    gLocation: string /* optional gId if needed */
  ) => {
    setVp(vp);
    setLocation(gLocation);
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
          const retryReq = await fetch(`${apiURL}/list/${tripId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${continueReq.token}`,
            },
            body: JSON.stringify({ value: val, fromGoogle: id ?? null }),
          });
          if (!retryReq.ok) {
            alert("Trouble completing request, please try again");
          } else if (retryReq.ok) {
            const apiData = (await retryReq.json()) as ListAddResponse;
            setWishList((prev) => [...prev, apiData.data]);
            return 200;
          }
        } else if (continueReq.err) {
          if (logout) {
            await logout();
          }
          return;
        }
      } else if (response.status === 403) {
        setBannerMsg("You do not have permission to access this resource");
        return 400;
      } else if (response.status === 404) {
        setBannerMsg("Error: Trip not found");
        return 400;
      } else if (response.status >= 500) {
        setBannerMsg(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
        return 500;
      } else if (response.ok) {
        const apiData = (await response.json()) as ListAddResponse;
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
          const retryReq = await fetch(`${apiURL}/list/${itemId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${continueReq.token}`,
            },
            body: JSON.stringify({ isGoogleId, tripId }),
          });
          if (!retryReq.ok) {
            alert("Trouble completing request, please try again");
          } else if (retryReq.ok) {
            const data = (await retryReq.json()) as ListDeleteResponse;
            setWishList((prev) =>
              prev.filter((v) => v.id !== data.deletedData[0].id)
            );
            return 200;
          }
        } else if (continueReq.err) {
          if (logout) {
            await logout();
          }
          return;
        }
      } else if (response.status === 403) {
        setBannerMsg("You do not have permission to access this resource");
        return 400;
      } else if (response.status === 404) {
        setBannerMsg("Error: Trip not found");
        return 400;
      } else if (response.status >= 500) {
        setBannerMsg(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
        return 500;
      } else if (response.ok) {
        const data = (await response.json()) as ListDeleteResponse;
        setWishList((prev) =>
          prev.filter((v) => v.id !== data.deletedData[0].id)
        );
        return 200;
      }
    },
    []
  );

  const onMobileAddToSchedule = useCallback(
    async (
      itemId: UniqueIdentifier,
      dayKey: string,
      timeString: string
    ) => {
      if (!token) return;
      const listItem = wishList.find((item) => item.id == itemId);
      if (!listItem) return;

      const startTime = new Date(`${dayKey}T${timeString}:00Z`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      const tempItem: Schedule = {
        id: itemId,
        tripId: String(tripId),
        location: listItem.value,
        details: listItem.details ?? "",
        startTime,
        endTime,
        cost: 0,
        multiDay: false,
        sortIndex: 0,
        lastModified: "",
      };

      const currentDayItems = schedule[dayKey] ?? [];
      const newArr = [...currentDayItems, tempItem].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
      const chunk = indexChunk(itemId, newArr);

      setSchedule((prev) => ({
        ...prev,
        [dayKey]: newArr,
      }));
      setWishList((prev) =>
        prev.map((v) => (v.id === itemId ? { ...v, itemAdded: true } : v))
      );

      try {
        const [scheduleRes, checkRes] = await Promise.all([
          fetch(`${apiURL}/schedule/${tripId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              start: startTime,
              end: endTime,
              location: listItem.value,
              cost: 0,
              details: listItem.details ?? "",
              multiDay: false,
              sortIndex: 0,
              chunk,
            }),
          }),
          fetch(`${apiURL}/check-list-item/${itemId}`, {
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

        if (!scheduleRes.ok || !checkRes.ok) {
          if (scheduleRes.status === 401 || checkRes.status === 401) {
            const resData = (await (
              scheduleRes.status === 401 ? scheduleRes : checkRes
            ).json()) as ApiErrorResponse;
            if (resData.error === "JwtError") {
              if (logout) await logout();
              return;
            }
            if (refreshInFlightRef == null) return;
            const continueReq = await refreshFn(apiURL, refreshInFlightRef);
            if (!continueReq.err) {
              if (login && continueReq.token) login(continueReq.token);
            } else {
              if (logout) await logout();
              return;
            }
          } else {
            setBannerMsg("Error adding item to schedule");
            setSchedule((prev) => ({
              ...prev,
              [dayKey]: currentDayItems,
            }));
            setWishList((prev) =>
              prev.map((v) =>
                v.id === itemId ? { ...v, itemAdded: false } : v
              )
            );
          }
          return;
        }

        const data = (await scheduleRes.json()) as ScheduleAddResponse;
        if (data.newlyIndexedSchedule != null) {
          for (const i of data.newlyIndexedSchedule) {
            i.startTime = new Date(i.startTime);
            i.endTime = new Date(i.endTime);
            i.id = String(i.id);
          }
          const length = (utcEnd - utcStart) / (1000 * 60 * 60 * 24);
          const dayContainers = makeContainers(length, new Date(utcStart));
          setSchedule(bucketizeSchedule(dayContainers, data.newlyIndexedSchedule));
        } else if (data.addedItem != null) {
          data.addedItem.startTime = new Date(data.addedItem.startTime);
          data.addedItem.endTime = new Date(data.addedItem.endTime);
          setSchedule((prev) => ({
            ...prev,
            [dayKey]: prev[dayKey].map((v) =>
              v.id === itemId ? data.addedItem : v
            ),
          }));
        }
      } catch {
        setSchedule((prev) => ({
          ...prev,
          [dayKey]: currentDayItems,
        }));
        setWishList((prev) =>
          prev.map((v) =>
            v.id === itemId ? { ...v, itemAdded: false } : v
          )
        );
      }
    },
    [token, wishList, schedule, tripId, utcStart, utcEnd]
  );

  const placeItemInSchedule = (
    oldArr: Schedule[],
    item: Schedule
  ): Schedule[] => {
    return [...oldArr, item].sort((a: Schedule, b: Schedule) => {
      if (a.startTime.getTime() === b.startTime.getTime()) {
        return a.sortIndex - b.sortIndex;
      }
      return a.startTime.getTime() - b.startTime.getTime();
    });
  };

  const handleOverwrite = async (e: React.MouseEvent) => {
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
          const data = (await addingReq.json()) as ScheduleAddResponse;
          const startTime = new Date(data.addedItem.startTime);
          const day = startTime.toISOString().split("T")[0];
          setSchedule((prev) => {
            const addedItem = {
              ...data.addedItem,
              startTime: new Date(data.addedItem.startTime),
              endTime: new Date(data.addedItem.endTime),
            };
            return {
              ...prev,
              [day]: newArrOldItem.map((v) =>
                v.id === addedItem.id ? addedItem : v
              ),
            };
          });
          clearOverwriteBanner();
        } else if (addingReq.status === 401) {
          const resData = (await addingReq.json()) as ApiErrorResponse;
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
            const retryReq = await fetch(`${apiURL}/schedule/${tripId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${continueReq.token}`,
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
            if (!retryReq.ok) {
              alert("Trouble completing request, please try again");
            } else if (retryReq.ok) {
              const data = (await retryReq.json()) as ScheduleAddResponse;
              const startTime = new Date(data.addedItem.startTime);
              const day = startTime.toISOString().split("T")[0];
              setSchedule((prev) => {
                const addedItem = {
                  ...data.addedItem,
                  startTime: new Date(data.addedItem.startTime),
                  endTime: new Date(data.addedItem.endTime),
                };
                return {
                  ...prev,
                  [day]: newArrOldItem.map((v) =>
                    v.id === addedItem.id ? addedItem : v
                  ),
                };
              });
              clearOverwriteBanner();
            }
          } else if (continueReq.err) {
            if (logout) {
              await logout();
            }
            return;
          }
        } else if (addingReq.status === 403) {
          clearOverwriteBanner();
          setBannerMsg("You do not have permission to access this resource");
        } else if (addingReq.status === 404) {
          clearOverwriteBanner();
          setBannerMsg("Error: Trip not found");
        } else if (addingReq.status >= 500) {
          clearOverwriteBanner();
          setBannerMsg(
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
          const data = (await patchRes.json()) as ScheduleUpdateResponse;
          clearOverwriteBanner();
          setSchedule((prev) => {
            return newItemContainer !== previousItemContainer
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
                };
          });
        } else if (patchRes.status === 401) {
          const resData = (await patchRes.json()) as ApiErrorResponse;
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
            const retryReq = await fetch(
              `${apiURL}/schedule/${holdOverwrite.id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${continueReq.token}`,
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
                  lastModified:
                    schedule[newItemContainer][newItemIndex].lastModified,
                }),
              }
            );
            if (!retryReq.ok) {
              alert("Trouble completing request, please try again");
            } else if (retryReq.ok) {
              const data = (await retryReq.json()) as ScheduleUpdateResponse;
              clearOverwriteBanner();
              setSchedule((prev) => {
                return newItemContainer !== previousItemContainer
                  ? {
                      ...prev,
                      [newItemContainer]: prev[newItemContainer].filter(
                        (v) => v.id !== holdOverwrite.id
                      ),
                      [previousItemContainer]: newArrOldItem.map(
                        (v: Schedule) =>
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
                    };
              });
            }
          } else if (continueReq.err) {
            if (logout) {
              await logout();
            }
            return;
          }
        } else if (patchRes.status === 403) {
          clearOverwriteBanner();
          setBannerMsg("You do not have permission to access this resource");
        } else if (patchRes.status === 404) {
          clearOverwriteBanner();
          setBannerMsg("Error: Trip not found");
        } else if (patchRes.status === 409) {
          const data = (await patchRes.json()) as ScheduleConflictResponse;
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
          setHoldOverwrite({ ...holdOverwrite });
          setBannerMsg(
            "Another user has updated this resource AGAIN, your change was not applied"
          );
          setBannerMsg(
            "Another user has updated this resource, your change was not applied"
          );
        } else if (patchRes.status >= 500) {
          clearOverwriteBanner();
          setBannerMsg(
            "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
          );
          setBannerMsg(
            "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
          );
        } else {
          setBannerMsg("Uh oh. Something went wrong.");
        }
      }
    } catch (err) {
      console.error(err);
      return;
    }
  };

  const clearOverwriteBanner = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setBannerMsg(null);
    setHoldOverwrite(null);
    setRemountKey((prev) => prev + 1);
  };

  if (role === "reader") {
    return <Navigate to={`/vacation/${tripId}`} replace />;
  }

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
    >
      <BannerContextProvider bannerMsg={bannerMsg} setBannerMsg={setBannerMsg}>
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
            >
              <ErrorBoundary
                fallbackRender={(fallbackProps) => (
                  <ErrorFallback
                    {...fallbackProps}
                    retryCount={scheduleRetries}
                  />
                )}
                onReset={() => {
                  setScheduleRetries((prev) => prev + 1);
                  console.log("Resetting state...");
                }}
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
              </ErrorBoundary>
            </EditScheduleProvider>
            {!loading && (
              <WantToSeeList
                loadSecond={() => setLoading2(false)}
                setList={setWishList}
                list={wishList}
                handleSubmitItem={handleSubmitItem}
                handleDeleteItem={handleDeleteItem}
                activeListId={activeListId}
                isMobile={isMobile}
                days={days}
                onMobileAddToSchedule={onMobileAddToSchedule}
              />
            )}
          </div>
          <ErrorBoundary
            fallbackRender={(fallbackProps) => (
              <ErrorFallback {...fallbackProps} retryCount={mapRetries} />
            )}
            onReset={() => {
              setMapRetries((prev) => prev + 1);
              console.log("Resetting state...");
            }}
          >
            {!loading2 && (
              <MyMapComponent
                bounds={vp}
                startLocation={location}
                list={wishList}
                handleSubmitItem={handleSubmitItem}
                handleDeleteItem={handleDeleteItem}
              />
            )}
          </ErrorBoundary>
        </div>
        {bannerMsg && (
          <Banner
            key={remountKey}
            bannerMsg={bannerMsg}
            holdOverwrite={holdOverwrite}
            handleOverwrite={handleOverwrite}
            clearOverwriteBanner={clearOverwriteBanner}
          />
        )}
      </BannerContextProvider>
    </DndContext>
  );
};

export default EditCanvas;
