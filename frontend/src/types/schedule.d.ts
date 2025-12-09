export {};

import type { UniqueIdentifier } from "@dnd-kit/core";

declare global {
  interface WantToSeeListProps {
    loadSecond: () => void;
    list: Item[];
    setList: React.Dispatch<React.SetStateAction<Item[] | []>>;
    handleDeleteItem: (
      a: UniqueIdentifier
    ) => Promise<UniqueIdentifier | undefined>;
    handleSubmitItem: (
      val: string,
      id?: UniqueIdentifier
    ) => Promise<UniqueIdentifier | undefined>;
  }

  type Prefill = {
    location: string;
    cost: number;
    details: string;
    multiDay: boolean;
  };

  type DragData = {
    type: string;
  };

  type Item = {
    id: UniqueIdentifier;
    value: string;
    fromGoogle: boolean;
    itemAdded: boolean;
  };

  interface CheckBubbleProps {
    checked: boolean;
  }

  type DayContainer = {
    day: string;
    label: string;
  };

  type DaySchedule = {
    [day: string]: Schedule[];
  };

  type TableComponentProps = {
    dayObj: DayContainer;
    editLineId: UniqueIdentifier | null;
    schedule: DaySchedule;
    startError: boolean;
    endError: boolean;
    errMessage: string;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    setCostTotal: React.Dispatch<React.SetStateAction<number>>;
    //here
    handleEdit: HandleEdit;
    editStartDate: string;
    setEditStartDate: React.Dispatch<React.SetStateAction<string>>;
    constructDate: ConstructDate;
    editEndDate: string;
    setEditEndDate: React.Dispatch<React.SetStateAction<string>>;
    locationError: boolean;
    locationEditRef: React.RefObject<HTMLInputElement | null>;
    costEditRef: React.RefObject<HTMLInputElement | null>;
  };

  type TableRowProps = {
    scheduleItem: Schedule;
    index: number;
    dayContainer: string;
    startDate: string;
    endDate: string;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    setCostTotal: React.Dispatch<React.SetStateAction<number>>;
    schedule: DaySchedule;
    handleEdit: HandleEdit;
    editLineId: UniqueIdentifier | null;
    startError: boolean;
    endError: boolean;
    editStartDate: string;
    setEditStartDate: React.Dispatch<React.SetStateAction<string>>;
    constructDate: ConstructDate;
    editEndDate: string;
    setEditEndDate: React.Dispatch<React.SetStateAction<string>>;
    locationError: boolean;
    locationEditRef: React.RefObject<HTMLInputElement | null>;
    costEditRef: React.RefObject<HTMLInputElement | null>;
  };

  type EditRowProps = {
    value: Schedule;
    index: number;
    dayContainer: string;
    startError: boolean;
    endError: boolean;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    setCostTotal: React.Dispatch<React.SetStateAction<number>>;
    schedule: DaySchedule;
    editStartDate: string;
    setEditStartDate: React.Dispatch<React.SetStateAction<string>>;
    constructDate: ConstructDate;
    editEndDate: string;
    setEditEndDate: React.Dispatch<React.SetStateAction<string>>;
    locationError: boolean;
    locationEditRef: React.RefObject<HTMLInputElement | null>;
    costEditRef: React.RefObject<HTMLInputElement | null>;
  };

  type HandleEdit = (
    e: React.MouseEvent,
    id: UniqueIdentifier,
    preFilledLocation: string,
    preFilledCost: number,
    preFilledDetails: string,
    preFilledMultiDay: boolean,
    startDate: string,
    endDate: string,
    dayOfTrip: string
  ) => void;

  type SubmitDeleteScheduleItem = (
    e: React.MouseEvent,
    itemID: UniqueIdentifier,
    index: number,
    dateAdded: string
  ) => void;

  type TimeObj = {
    hour: string;
    minute: string;
    meridiem: string;
  };

  type ConstructDate = (
    which: "start" | "end",
    hour: string,
    minute: string,
    meridiem: string
  ) => void;
}
