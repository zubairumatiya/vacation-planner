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

  type TableRowProps = {
    scheduleItem: Schedule;
    index: number;
    dayContainer: string;
    startDate: string;
    endDate: string;
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

  type TableComponentProps = {
    dayObj: DayContainer;
  };
}
