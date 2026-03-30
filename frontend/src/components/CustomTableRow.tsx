import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "../styles/EditSchedule.module.css";
import EditableRow from "./EditableRow";
import NormalRow from "./NormalRow";
import { useContext, useEffect, useRef, useState } from "react";
import { EditScheduleContext } from "../context/EditScheduleContext";

const CustomTableRow = ({
  scheduleItem,
  index,
  dayContainer,
  startDate,
  endDate,
  setSchedule,
  schedule,
  activeId,
  viewMode,
  onDuplicate,
  onToggleLock,
  onToggleMapPin,
}: TableRowProps) => {
  const [height, setHeight] = useState<number | null>(null);
  const { handleEdit, editLineId } = useContext(EditScheduleContext);
  const itemRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (itemRef.current) {
      setHeight(itemRef.current.getBoundingClientRect().height);
    }
  }, []);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: scheduleItem.id,
      data: { type: "schedule" } as DragData,
      disabled: viewMode,
    });

  const style = {
    height: height ? `${height}px` : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: activeId === scheduleItem.id ? 0.5 : 1,
  };

  const combinedRef = (el: HTMLTableRowElement) => {
    setNodeRef(el);
    itemRef.current = el;
  };

  return (
    <tr
      key={scheduleItem.id}
      style={style}
      ref={combinedRef}
      data-index={index}
      className={`${styles.tableRow}`}
      onDoubleClick={
        viewMode
          ? undefined
          : (e) =>
              handleEdit(
                e,
                scheduleItem.id,
                scheduleItem.location,
                scheduleItem.cost,
                scheduleItem.details,
                scheduleItem.multiDay,
                startDate,
                endDate,
                dayContainer
              )
      }
    >
      {scheduleItem.id === editLineId && !viewMode ? (
        <EditableRow
          value={scheduleItem}
          index={index}
          dayContainer={dayContainer}
          setSchedule={setSchedule}
          schedule={schedule}
        ></EditableRow>
      ) : (
        <NormalRow
          value={scheduleItem}
          dayContainer={dayContainer}
          viewMode={viewMode}
          onDuplicate={onDuplicate}
          onToggleLock={onToggleLock}
          onToggleMapPin={onToggleMapPin}
          {...attributes}
          {...listeners}
        ></NormalRow>
      )}
    </tr>
  );
};

export default CustomTableRow;
