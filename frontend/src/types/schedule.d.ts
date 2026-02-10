export {};

import type { UniqueIdentifier } from "@dnd-kit/core";

declare global {
  interface WantToSeeListProps {
    loadSecond: () => void;
    list: Item[];
    setList: React.Dispatch<React.SetStateAction<Item[] | []>>;
    handleDeleteItem: (
      a: UniqueIdentifier,
      fromGoogle: boolean
    ) => Promise<UniqueIdentifier | undefined>;
    handleSubmitItem: (
      val: string,
      id?: UniqueIdentifier
    ) => Promise<UniqueIdentifier | undefined>;
    activeListId: UniqueIdentifier | null;
  }

  type HideDay = {
    [date: string]: boolean;
  };

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
    fromGoogle: string | null;
    itemAdded: boolean;
    lastModified: string;
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
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    activeId: UniqueIdentifier | null | undefined;
    viewMode: boolean;
  };

  type TableRowProps = {
    scheduleItem: Schedule;
    index: number;
    dayContainer: string;
    startDate: string;
    endDate: string;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
    schedule: DaySchedule;
    activeId: UniqueIdentifier | null | undefined;
    viewMode: boolean;
  };

  type EditRowProps = {
    value: Schedule;
    index: number;
    dayContainer: string;
    setSchedule: React.Dispatch<React.SetStateAction<DaySchedule>>;
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

  type ListItemProps = {
    v: Item;
    i: number;
    editItem: (
      e: React.MouseEvent,
      index: number,
      itemId: UniqueIdentifier
    ) => void;
    handleCheckItem: (
      e: React.MouseEvent,
      currentState: boolean,
      itemId: UniqueIdentifier,
      index: number
    ) => void;
    activeListId: UniqueIdentifier | null;
  };

  type OverlayWidths = {
    container: number;
    table: number;
  };
}
