import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import styles from "../styles/EditSchedule.module.css";
import { Fragment } from "react/jsx-runtime";
import CustomTableRow from "./CustomTableRow";
import { useContext } from "react";
import { EditScheduleContext } from "../context/EditScheduleContext";

const CustomTableComponent = ({
  dayObj,
  schedule,
  setSchedule,
  activeId,
}: TableComponentProps) => {
  const { startError, endError, editLineId, errMessage } =
    useContext(EditScheduleContext);

  const { setNodeRef } = useDroppable({ id: dayObj.day });
  return (
    <table className={styles.table} id={dayObj.day} ref={setNodeRef}>
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
      <thead>
        <tr>
          <th className={editLineId ? undefined : styles.dragHeader}></th>
          <th className={styles.startTimeHeader}>Start Time</th>
          <th className={styles.endTimeHeader}>End Time</th>
          <th className={styles.locationHeader}>Place</th>
          <th className={styles.costHeader}>Cost</th>
          <th className={styles.detailsHeader}>Details</th>
          <th className={styles.multiDayHeader}>Multi-day</th>
          <th className={styles.editFieldHeader}></th>
        </tr>
      </thead>
      <tbody>
        <SortableContext
          items={schedule[dayObj.day]}
          strategy={verticalListSortingStrategy}
        >
          {schedule[dayObj.day].map((item: Schedule, ind) => {
            const startDate: string = item.startTime
              .toISOString()
              .split("T")[0];

            const endDate: string = item.endTime.toISOString().split("T")[0];
            return (
              <Fragment key={item.id}>
                <CustomTableRow
                  scheduleItem={item}
                  index={ind}
                  dayContainer={dayObj.day}
                  startDate={startDate}
                  endDate={endDate}
                  setSchedule={setSchedule}
                  schedule={schedule}
                  activeId={activeId}
                ></CustomTableRow>
                {editLineId === item.id && (
                  <tr className={styles.errDiv}>
                    {(endError || startError || errMessage !== null) && (
                      <td colSpan={8} className={"text-red-600"}>
                        {errMessage}
                      </td>
                    )}
                  </tr>
                )}
              </Fragment>
            );
          })}
        </SortableContext>
      </tbody>
    </table>
  );
};

export default CustomTableComponent;
