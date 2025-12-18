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
  setCostTotal,
  schedule,
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
    });

  const style = {
    height: height ? `${height}px` : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
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
      className={`${/*index === dragIndexRef.current &&*/ styles.dragging} ${
        // will need to see how the drag styling on dnd-kit looks for the grab cursor
        styles.tableRow
      }`}
      onDoubleClick={(e) =>
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
      {scheduleItem.id === editLineId ? (
        <EditableRow
          value={scheduleItem}
          index={index}
          dayContainer={dayContainer}
          setSchedule={setSchedule}
          setCostTotal={setCostTotal}
          schedule={schedule}
        ></EditableRow>
      ) : (
        //          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Editing above : divider~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        <NormalRow
          value={scheduleItem}
          dayContainer={dayContainer}
          {...attributes}
          {...listeners}
        ></NormalRow>
      )}
    </tr>
  );
};

export default CustomTableRow;
