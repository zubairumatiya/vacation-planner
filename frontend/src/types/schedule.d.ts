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
    schedule: DaySchedule;
    errMessage: string;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    setCostTotal: React.Dispatch<React.SetStateAction<number>>;
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
  };

  type EditRowProps = {
    value: Schedule;
    index: number;
    dayContainer: string;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    setCostTotal: React.Dispatch<React.SetStateAction<number>>;
    schedule: DaySchedule;
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
