import { createContext, useState, useRef } from "react";
import type { UniqueIdentifier } from "@dnd-kit/core";

export type EditScheduleContext = {
  // need to consume in edit schedule mostly*
  preFill: Prefill;
  editLineId: UniqueIdentifier | null;
  setEditLineId: React.Dispatch<React.SetStateAction<UniqueIdentifier | null>>;
  addingItem: boolean;
  setAddingItem: React.Dispatch<React.SetStateAction<boolean>>;
  dayOfTripRef: React.RefObject<string>;
  setEndError: React.Dispatch<React.SetStateAction<boolean>>;
  setStartError: React.Dispatch<React.SetStateAction<boolean>>;
  startTimePick: null | string;
  endTimePick: null | string;
  setLocationError: React.Dispatch<React.SetStateAction<boolean>>;
  // drilled that we need to switch to context
  handleEdit: HandleEdit;
  constructDate: ConstructDate;
  editStartDate: string;
  setEditStartDate: React.Dispatch<React.SetStateAction<string>>;
  editEndDate: string;
  setEditEndDate: React.Dispatch<React.SetStateAction<string>>;
  startError: boolean;
  endError: boolean;
  locationError: boolean;
  locationEditRef: React.RefObject<HTMLInputElement | null>;
  costEditRef: React.RefObject<HTMLInputElement | null>;
  handleTextInput: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}; // Does context get recreated each time a child component is re-rendered??

export const EditScheduleContext = createContext<EditScheduleContext>(
  {} as EditScheduleContext // Not using null because i am confident i will only use this context in components who are wrapped by the provider.
);

export function EditScheduleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preFill, setPreFill] = useState<Prefill>({
    location: "",
    cost: 0,
    details: "",
    multiDay: false,
  });

  const [editLineId, setEditLineId] = useState<UniqueIdentifier | null>(null);
  const [addingItem, setAddingItem] = useState<boolean>(false);
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editEndDate, setEditEndDate] = useState<string>("");
  const dayOfTripRef = useRef<string>("");
  const [startError, setStartError] = useState<boolean>(false);
  const [endError, setEndError] = useState<boolean>(false);
  const [startTimePick, setStartTimePick] = useState<string | null>(null); // i think we will need two of these for start and end, which means we can't have multiple adding schedules open
  const [endTimePick, setEndTimePick] = useState<string | null>(null);
  const [locationError, setLocationError] = useState(false);
  const locationEditRef = useRef<HTMLInputElement>(null);
  const costEditRef = useRef<HTMLInputElement>(null);

  const handleEdit = (
    e: React.MouseEvent,
    id: UniqueIdentifier,
    preFilledLocation: string,
    preFilledCost: number,
    preFilledDetails: string,
    preFilledMultiDay: boolean,
    startDate: string,
    endDate: string,
    dayOfTrip: string
  ) => {
    e.preventDefault();

    setPreFill({
      location: preFilledLocation,
      cost: preFilledCost,
      details: preFilledDetails,
      multiDay: preFilledMultiDay,
    });
    setEditLineId(id);
    setAddingItem(true); // let's not allow adding items when editing an item
    setEditStartDate(startDate);
    setEditEndDate(endDate);
    dayOfTripRef.current = dayOfTrip;
  };

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

  const handleTextInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const MAX_HEIGHT = 5 * 16;
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + "px";
  };

  return (
    <EditScheduleContext.Provider
      value={{
        preFill,
        editLineId,
        setEditLineId,
        addingItem,
        setAddingItem,
        dayOfTripRef,
        setEndError,
        setStartError,
        startTimePick,
        endTimePick,
        setLocationError,
        handleEdit,
        constructDate,
        editStartDate,
        setEditStartDate,
        editEndDate,
        setEditEndDate,
        startError,
        endError,
        locationError,
        locationEditRef,
        costEditRef,
        handleTextInput,
      }}
    >
      {children}
    </EditScheduleContext.Provider>
  );
}
