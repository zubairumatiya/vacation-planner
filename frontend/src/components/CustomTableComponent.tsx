import { useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import styles from "../styles/EditSchedule.module.css";
import { Fragment } from "react/jsx-runtime";
import type { Schedule } from "../pages/EditVacationSchedule";
import CustomTableRow from "./CustomTableRow";

const CustomTableComponent = ({
  dayObj,
  editLineId,
  schedule,
  startError,
  endError,
  errMessage,
  setSchedule,
  setCostTotal,
  //HERE
  handleEdit,
  editStartDate,
  setEditStartDate,
  constructDate,
  editEndDate,
  setEditEndDate,
  locationError,
  locationEditRef,
  costEditRef,
}: TableComponentProps) => {
  const { setNodeRef } = useDroppable({ id: dayObj.day });
  return (
    <table
      //onDrop={(e) => handleDragDrop(e)}
      //onDragOver={(e) => e.preventDefault()}
      //onDragEnter={(e) => e.preventDefault()}
      className={styles.table}
      id={dayObj.day}
      ref={setNodeRef}
    >
      <colgroup>
        <col className={styles.dragCol} />
        <col span={3} />
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
        <SortableContext items={schedule[dayObj.day]}>
          {schedule[dayObj.day].map((item: Schedule, ind) => {
            const startDate: string = item.startTime
              .toISOString()
              .split("T")[0];

            const endDate: string = item.endTime.toISOString().split("T")[0];
            //        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Iterate divider~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

            return (
              <Fragment key={item.id}>
                <CustomTableRow
                  scheduleItem={item}
                  index={ind}
                  dayContainer={dayObj.day}
                  startDate={startDate}
                  endDate={endDate}
                  setSchedule={setSchedule}
                  setCostTotal={setCostTotal}
                  schedule={schedule}
                  handleEdit={handleEdit}
                  editLineId={editLineId}
                  startError={startError}
                  endError={endError}
                  editStartDate={editStartDate}
                  setEditStartDate={setEditStartDate}
                  constructDate={constructDate}
                  editEndDate={editEndDate}
                  setEditEndDate={setEditEndDate}
                  locationError={locationError}
                  locationEditRef={locationEditRef}
                  costEditRef={costEditRef}
                ></CustomTableRow>
                {editLineId === item.id && (
                  <tr className={styles.errDiv}>
                    {(endError || startError) && (
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
