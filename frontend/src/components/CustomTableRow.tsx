import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "../styles/EditSchedule.module.css";
import EditableRow from "./EditableRow";
import NormalRow from "./NormalRow";
import { useContext } from "react";
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
  // FOR NEXT TIME: need to either add ref
  const { handleEdit, editLineId } = useContext(EditScheduleContext);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: scheduleItem.id,
      data: { type: "schedule" } as DragData,
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <tr
      key={scheduleItem.id}
      style={style}
      ref={setNodeRef}
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
