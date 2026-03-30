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
  toSchedule,
  toScheduleList,
} from "../utils/timeHelpers";
import NormalRow from "../components/NormalRow";
import addToSchedule from "../assets/icons/add-to-schedule.svg";
import { BannerContext } from "../context/BannerContext";
import refreshFn from "../utils/refreshFn";
import {
  getGuestSchedule,
  addGuestScheduleItem,
  updateGuestScheduleItem,
} from "../utils/guestStorage";

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
    editLineId,
    addingItem,
    setAddingItem,
    startTimePick,
    endTimePick,
    setLocationError,
    constructDate,
    locationError,
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
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayContainer[]>([]);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [itemError, setItemError] = useState(false);
  const [location, setLocation] = useState<string>("");
  const locationRef = useRef<HTMLInputElement | null>(null);
  const [addingErrMessage, setAddingErrMessage] = useState("");
  const [eError, setEError] = useState<boolean>(false);
  const [sError, setSError] = useState<boolean>(false);
  const [day, setDay] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [multiDay, setMultiDay] = useState<boolean>(false);
  const moniterInputRef = useRef<boolean>(false);
  const tabStartRef = useRef<HTMLInputElement>(null);
  const loggingOutRef = auth?.loggingOutRef;
  useEffect(() => {
    if (loggingOutRef?.current) return;
    if (tripId === "guest") {
      const data = getGuestSchedule();
      props.getMapValues(data.gVp, data.location, data.gId);
      const convertStart = new Date(data.startDate);
      const convertEnd = new Date(data.endDate);
      const scheduleItems = toScheduleList(data.schedule);
      const UtcStart = convertStart.getTime();
      const UtcEnd = convertEnd.getTime();
      setUtcEnd(UtcEnd);
      setUtcStart(UtcStart);
      const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);
      const dayContainers: DayContainer[] = makeContainers(length, convertStart);
      const bucketizeItems: DaySchedule = bucketizeSchedule(dayContainers, scheduleItems);
      setDays(dayContainers);
      setSchedule(bucketizeItems);
      setLoading(false);
      props.loadFirst();
      return;
    }
    const getTrip = async () => {
      const response = await fetch(`${apiURL}/schedule/${tripId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

        if (loggingOutRef?.current) return;
        const continueReq: { token: string | null; err: boolean } =
          await refreshFn(apiURL, refreshInFlightRef);
        if (!continueReq.err) {
          if (login && continueReq.token) {
            login(String(continueReq.token));
          }
          const retryReq = await fetch(`${apiURL}/schedule/${tripId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${continueReq.token}`,
            },
          });
          if (!retryReq.ok) {
            alert("Trouble completing request, please try again");
          } else if (retryReq.ok) {
            const data = (await retryReq.json()) as TripScheduleResponse;
            props.getMapValues(data.gVp, data.location, data.gId);
            const convertStart = new Date(data.startDate);
            const convertEnd = new Date(data.endDate);
            const scheduleItems = toScheduleList(data.schedule);

            const UtcStart = convertStart.getTime();
            const UtcEnd = convertEnd.getTime();

            setUtcEnd(UtcEnd);
            setUtcStart(UtcStart);

            const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);

            const dayContainers: DayContainer[] = makeContainers(
              length,
              convertStart,
            );

            const bucketizeItems: DaySchedule = bucketizeSchedule(
              dayContainers,
              scheduleItems,
            );

            setDays(dayContainers);
            setSchedule(bucketizeItems);
            setLoading(false);
            props.loadFirst();
          }
        } else if (continueReq.err) {
          if (logout) {
            await logout();
          }
          return;
        }
      } else if (response.status === 403) {
        setBannerMsg("You do not have permission to access this resource");
      } else if (response.status === 404) {
        setBannerMsg("Error: Trip not found");
      } else if (response.status >= 500) {
        setBannerMsg(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
        );
      } else if (response.ok) {
        const data = (await response.json()) as TripScheduleResponse;
        props.getMapValues(data.gVp, data.location, data.gId);
        const convertStart = new Date(data.startDate);
        const convertEnd = new Date(data.endDate);
        const scheduleItems = toScheduleList(data.schedule);

        const UtcStart = convertStart.getTime();
        const UtcEnd = convertEnd.getTime();

        setUtcEnd(UtcEnd);
        setUtcStart(UtcStart);

        const length = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);

        const dayContainers: DayContainer[] = makeContainers(
          length,
          convertStart,
        );

        const bucketizeItems: DaySchedule = bucketizeSchedule(
          dayContainers,
          scheduleItems,
        );

        setDays(dayContainers);
        setSchedule(bucketizeItems);
        setLoading(false);
        props.loadFirst();
      }
    };

    getTrip();
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      tabStartRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [individualAddition]);

  useEffect(() => {
    const keyHandle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        clearAdd();
      }
    };

    document.addEventListener("keydown", keyHandle);

    return () => document.removeEventListener("keydown", keyHandle);
  }, []);

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

  useEffect(() => {
    if (multiDay === true) {
      if (day) {
        const nextDayDate = new Date(
          (new Date(`${day}T00:00:00Z`).getTime() / (1000 * 60 * 60) + 24) *
            1000 *
            60 *
            60,
        )
          .toISOString()
          .slice(0, 10);
        setEndDate(nextDayDate);
      }
    }
  }, [multiDay]);

  const addItemHelper = (dayContainer: string, cancel?: string) => {
    if (cancel) {
      setAddingItem(false);
      clearAdd();
    } else {
      setAddingItem(true);
      setIndividualAddition({ addingContainer: dayContainer });

      setDay(dayContainer);
    }
  };

  const submitAddItem = async (
    e: React.FormEvent<HTMLFormElement>,
    dateAdded: string,
  ) => {
    e.preventDefault();
    setAddingItem(false);
    if (tripId === "guest") {
      const formData = new FormData(e.currentTarget);
      const location = formData.get("location");
      if (testSubmission(dateAdded) !== true) {
        setItemError(true);
        moniterInputRef.current = true;
        return;
      }
      const startDateAssembler = customISOTime(dateAdded, startTimePick!);
      const endDateAssembler = customISOTime(dateAdded, endTimePick!);
      const result = addGuestScheduleItem({
        start: startDateAssembler,
        end: endDateAssembler,
        location: String(location ?? ""),
        details: String(formData.get("details") ?? ""),
        cost: Number(formData.get("cost") ?? 0),
        multiDay: formData.get("multiday") === "on",
      });
      if (result.addedItem) {
        const addedSchedule = toSchedule(result.addedItem);
        const tempItem: Schedule = {
          startTime: new Date(startDateAssembler),
          id: "temp",
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
        const tempArr = reSort([...schedule[dateAdded].slice(), tempItem]);
        setSchedule((prev) => ({
          ...prev,
          [dateAdded]: tempArr.map((v) => (v.id === "temp" ? addedSchedule : v)),
        }));
      }
      clearAdd();
      return;
    }
    if (token) {
      const formData = new FormData(e.currentTarget);
      const location = formData.get("location");
      let startDateAssembler;
      let endDateAssembler;
      if (testSubmission(dateAdded) !== true) {
        setItemError(true);
        moniterInputRef.current = true;
        return;
      } else {
        startDateAssembler = customISOTime(dateAdded, startTimePick!);
        endDateAssembler = customISOTime(dateAdded, endTimePick!);
      }
      const tempItem: Schedule = {
        startTime: new Date(startDateAssembler),
        id: "temp",
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
          const data = (await addingReq.json()) as ScheduleAddResponse;
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
          } else if (data.addedItem != null) {
            const addedSchedule = toSchedule(data.addedItem);
            setSchedule((prev) => {
              return {
                ...prev,
                [dateAdded]: tempArr.map((v) =>
                  v.id === "temp" ? addedSchedule : v,
                ),
              };
            });
          }
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
                start: startDateAssembler,
                end: endDateAssembler,
                location,
                details: formData.get("details"),
                cost: formData.get("cost"),
                multiDay: formData.get("multiday"),
                chunk,
              }),
            });
            if (!retryReq.ok) {
              alert("Trouble completing request, please try again");
            } else if (retryReq.ok) {
              const data = (await retryReq.json()) as ScheduleAddResponse;
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
              } else if (data.addedItem != null) {
                const addedSchedule = toSchedule(data.addedItem);
                setSchedule((prev) => {
                  return {
                    ...prev,
                    [dateAdded]: tempArr.map((v) =>
                      v.id === "temp" ? addedSchedule : v,
                    ),
                  };
                });
              }
            }
          } else if (continueReq.err) {
            if (logout) {
              await logout();
            }
            return;
          }
        } else if (addingReq.status === 403) {
          setBannerMsg("You do not have permission to access this resource");
        } else if (addingReq.status === 404) {
          setBannerMsg("Error: Trip not found");
        } else if (addingReq.status >= 500) {
          setBannerMsg(
            "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
          );
        }
        clearAdd();
      } catch {
        return;
      }
    } else {
      navigate("/redirect", {
        state: { message: "Session expired, redirecting to log in..." },
      });
    }
  };

  /*
  const formChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (locationError) {
      if (e.target.name === "location") {
        if (e.target.value) {
          setLocationError(false);
        }
      }
    }
  };*/

  useEffect(() => {
    if (moniterInputRef.current) {
      if (testSubmission(day!) !== true) {
        setItemError(true);
      }
    }
  }, [startTimePick, endTimePick, endDate, location, multiDay]);

  const testSubmission = (date: string) => {
    if (
      !startTimePick ||
      isNaN(new Date(customISOTime(date, startTimePick)).getTime())
    ) {
      setSError(true);
      setAddingErrMessage("Invalid start time");
      return;
    } else {
      setSError(false);
    }
    if (
      !endTimePick ||
      isNaN(new Date(customISOTime(date, endTimePick)).getTime())
    ) {
      setEError(true);
      setAddingErrMessage("Invalid end time");
      return;
    } else {
      setEError(false);
    }

    if (
      new Date(customISOTime(date, endTimePick)).getTime() <
        new Date(customISOTime(date, startTimePick)).getTime() &&
      !multiDay
    ) {
      setEError(true);
      setAddingErrMessage("End time cannot be before start time");
      return;
    } else {
      setEError(false);
    }

    if (multiDay) {
      if (
        !endDate ||
        isNaN(new Date(customISOTime(endDate, endTimePick)).getTime())
      ) {
        setEError(true);
        setAddingErrMessage("Invalid end time");
        return;
      } else {
        setEError(false);
      }

      const differenceInHours: number = Math.floor(
        (new Date(customISOTime(endDate, endTimePick)).getTime() -
          new Date(customISOTime(date, startTimePick)).getTime()) /
          (1000 * 60 * 60),
      );

      if (differenceInHours < 24) {
        setEError(true);
        setAddingErrMessage(
          "Multi-day selection must be greater than 24 hours",
        );
        return;
      } else {
        setEError(false);
      }
    }

    if (locationRef.current?.value === "") {
      setLocationError(true);
      setAddingErrMessage("Invalid location");
      return;
    } else {
      setLocationError(false);
    }

    setAddingErrMessage("");
    setItemError(false);
    return true;
  };

  const clearAdd = () => {
    setDay(null);
    setEndDate(null);
    setMultiDay(false);
    setAddingErrMessage("");
    moniterInputRef.current = false;
    setLocation("");
    setSError(false);
    setEError(false);
    setItemError(false);
    locationRef.current = null;
    setAddingItem(false);
    setIndividualAddition({ addingContainer: "" });
  };

  const handleToggleLock = async (item: Schedule) => {
    if (tripId === "guest") {
      const res = updateGuestScheduleItem(String(item.id), {
        isLocked: !item.isLocked,
      });
      if (res.updatedData) {
        setSchedule((prev) => {
          const updated = { ...prev };
          for (const day in updated) {
            updated[day] = updated[day].map((s) =>
              s.id === item.id
                ? { ...s, isLocked: !item.isLocked, lastModified: res.updatedData!.lastModified }
                : s,
            );
          }
          return updated;
        });
      }
      return;
    }
    if (!token) {
      navigate("/redirect", {
        state: { message: "Session expired, redirecting to log in..." },
      });
      return;
    }
    try {
      const res = await fetch(`${apiURL}/toggle-lock/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripId }),
      });
      if (res.ok) {
        const data: ScheduleUpdateResponse = await res.json();
        if (data.updatedData) {
          setSchedule((prev) => {
            const updated = { ...prev };
            for (const day in updated) {
              updated[day] = updated[day].map((s) =>
                s.id === item.id
                  ? {
                      ...s,
                      isLocked: !item.isLocked,
                      lastModified: data.updatedData!.lastModified,
                    }
                  : s,
              );
            }
            return updated;
          });
        }
      }
    } catch {
      // silent fail for lock toggle
    }
  };

  const handleToggleMapPin = async (item: Schedule) => {
    if (tripId === "guest") {
      const res = updateGuestScheduleItem(String(item.id), {
        showOnMap: !item.showOnMap,
      });
      if (res.updatedData) {
        setSchedule((prev) => {
          const updated = { ...prev };
          for (const day in updated) {
            updated[day] = updated[day].map((s) =>
              s.id === item.id
                ? { ...s, showOnMap: !item.showOnMap, lastModified: res.updatedData!.lastModified }
                : s,
            );
          }
          return updated;
        });
      }
      return;
    }
    if (!token) {
      navigate("/redirect", {
        state: { message: "Session expired, redirecting to log in..." },
      });
      return;
    }
    try {
      const res = await fetch(`${apiURL}/toggle-map-pin/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripId }),
      });
      if (res.ok) {
        const data: ScheduleUpdateResponse = await res.json();
        if (data.updatedData) {
          setSchedule((prev) => {
            const updated = { ...prev };
            for (const day in updated) {
              updated[day] = updated[day].map((s) =>
                s.id === item.id
                  ? {
                      ...s,
                      showOnMap: !item.showOnMap,
                      lastModified: data.updatedData!.lastModified,
                    }
                  : s,
              );
            }
            return updated;
          });
        }
      }
    } catch {
      // silent fail for map pin toggle
    }
  };

  const duplicateItem = async (item: Schedule, dayContainer: string) => {
    if (tripId === "guest") {
      const result = addGuestScheduleItem({
        start: item.startTime.toISOString(),
        end: item.endTime.toISOString(),
        location: item.location,
        details: item.details,
        cost: item.cost,
        multiDay: item.multiDay || false,
      });
      if (result.addedItem) {
        const addedSchedule = toSchedule(result.addedItem);
        const currentDayItems = schedule[dayContainer] ?? [];
        const originalIndex = currentDayItems.findIndex((v) => v.id === item.id);
        const newArr = [
          ...currentDayItems.slice(0, originalIndex + 1),
          addedSchedule,
          ...currentDayItems.slice(originalIndex + 1),
        ];
        setSchedule((prev) => ({ ...prev, [dayContainer]: newArr }));
      }
      return;
    }
    if (!token) {
      navigate("/redirect", {
        state: { message: "Session expired, redirecting to log in..." },
      });
      return;
    }

    const startISO = item.startTime.toISOString();
    const endISO = item.endTime.toISOString();

    const tempItem: Schedule = {
      ...item,
      id: "temp-dup",
      sortIndex: 0,
      lastModified: "",
    };

    const currentDayItems = schedule[dayContainer] ?? [];
    const originalIndex = currentDayItems.findIndex((v) => v.id === item.id);
    const newArr = [
      ...currentDayItems.slice(0, originalIndex + 1),
      tempItem,
      ...currentDayItems.slice(originalIndex + 1),
    ];
    const chunk = indexChunk("temp-dup", newArr);

    setSchedule((prev) => ({
      ...prev,
      [dayContainer]: newArr,
    }));

    try {
      const addingReq = await fetch(`${apiURL}/schedule/${tripId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start: startISO,
          end: endISO,
          location: item.location,
          details: item.details,
          cost: item.cost,
          multiDay: item.multiDay || undefined,
          chunk,
        }),
      });
      if (addingReq.ok) {
        const data = (await addingReq.json()) as ScheduleAddResponse;
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
        } else if (data.addedItem != null) {
          const addedSchedule = toSchedule(data.addedItem);
          setSchedule((prev) => ({
            ...prev,
            [dayContainer]: prev[dayContainer].map((v) =>
              v.id === "temp-dup" ? addedSchedule : v,
            ),
          }));
        }
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
              start: startISO,
              end: endISO,
              location: item.location,
              details: item.details,
              cost: item.cost,
              multiDay: item.multiDay || undefined,
              chunk,
            }),
          });
          if (!retryReq.ok) {
            setSchedule((prev) => ({
              ...prev,
              [dayContainer]: prev[dayContainer].filter(
                (v) => v.id !== "temp-dup",
              ),
            }));
            setBannerMsg("Trouble completing request, please try again");
          } else {
            const data = (await retryReq.json()) as ScheduleAddResponse;
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
            } else if (data.addedItem != null) {
              const addedSchedule = toSchedule(data.addedItem);
              setSchedule((prev) => ({
                ...prev,
                [dayContainer]: prev[dayContainer].map((v) =>
                  v.id === "temp-dup" ? addedSchedule : v,
                ),
              }));
            }
          }
        } else {
          if (logout) {
            await logout();
          }
        }
      } else {
        setSchedule((prev) => ({
          ...prev,
          [dayContainer]: prev[dayContainer].filter((v) => v.id !== "temp-dup"),
        }));
        if (addingReq.status === 403) {
          setBannerMsg("You do not have permission to access this resource");
        } else if (addingReq.status === 404) {
          setBannerMsg("Error: Trip not found");
        } else if (addingReq.status >= 500) {
          setBannerMsg(
            "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
          );
        }
      }
    } catch {
      setSchedule((prev) => ({
        ...prev,
        [dayContainer]: prev[dayContainer].filter((v) => v.id !== "temp-dup"),
      }));
    }
  };

  return loading ? (
    <p>{bannerMsg}</p>
  ) : (
    <div className={styles.pageWrapper} tabIndex={-1}>
      {days.map((dayObj: DayContainer) => {
        return (
          <div key={dayObj.day} className={styles.tableNButtonContainer}>
            <div className={styles.tableCaption}>{dayObj.label}</div>
            <div
              id={"tablesContainer"}
              className={`${styles.tableContainer} ${
                props.activeItem && styles.tableContainerDragging
              } ${props.dragFrom === "list" ? styles.listDropZone : null}`}
              tabIndex={-1}
            >
              <CustomTableComponent
                key={dayObj.day}
                dayObj={dayObj}
                schedule={schedule}
                setSchedule={setSchedule}
                activeId={props.activeItem}
                viewMode={false}
                onDuplicate={duplicateItem}
                onToggleLock={handleToggleLock}
                onToggleMapPin={handleToggleMapPin}
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
                <div className={styles.formHeader}>New Item</div>
                <div className={itemError ? styles.errFormBorder : undefined}>
                  <form
                    className={styles.form}
                    onSubmit={(e) => submitAddItem(e, dayObj.day)}
                  >
                    <div className={styles.addItemFirstGroup}>
                      <div
                        className={`${styles.itemElement} ${styles.timeWrapper}`}
                      >
                        <span>Start </span>
                        <CustomTimePicker
                          className={sError ? "border-red-500" : undefined}
                          onChange={(
                            hour: string,
                            minute: string,
                            meridiem: string,
                          ) => constructDate("start", hour, minute, meridiem)}
                          preTime={() => undefined}
                          focusRef={tabStartRef}
                        />
                      </div>
                      <div className={styles.endTimeWrapper}>
                        {multiDay && (
                          <input
                            type="date"
                            name="startDate"
                            id="startDate"
                            className={`${styles.dateEditInput} `}
                            value={endDate ?? ""}
                            min={endDate ?? ""}
                            onChange={(e) => {
                              setEndDate(e.target.value);
                            }}
                          />
                        )}
                        <div
                          className={`${styles.itemElement} ${styles.timeWrapper}`}
                        >
                          <span>End </span>
                          <CustomTimePicker
                            className={eError ? "border-red-500" : undefined}
                            onChange={(
                              hour: string,
                              minute: string,
                              meridiem: string,
                            ) => constructDate("end", hour, minute, meridiem)}
                            preTime={() => undefined}
                          />
                        </div>
                      </div>
                      <div className={`${styles.itemElement}`}>
                        <label htmlFor="location">Location</label>
                        <input
                          type="text"
                          name="location"
                          id="location"
                          maxLength={300}
                          value={location}
                          ref={locationRef}
                          className={`${locationError && "border-red-500"} ${
                            styles.input
                          }`}
                          onChange={(e) => setLocation(e.target.value)}
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
                        className={`${styles.input} ${styles.multiDay} ${styles.multiDayCheckbox}`}
                        name="multiday"
                        checked={multiDay}
                        onChange={() => setMultiDay((prev) => !prev)}
                        id="multiday"
                      />
                    </div>
                    <div className={`${styles.itemElement}`}>
                      <button
                        type="submit"
                        tabIndex={0}
                        className={styles.addItemSubmit}
                        disabled={itemError}
                      >
                        Add item
                      </button>
                    </div>
                    <div className={`${styles.itemElement}`}>
                      <button
                        className={styles.addItemCancel}
                        type="button"
                        onClick={() => addItemHelper(dayObj.day, "cancel")}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
                {itemError && (
                  <div className={styles.addingErrMessage}>
                    {addingErrMessage}
                  </div>
                )}
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
                        viewMode={false}
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
