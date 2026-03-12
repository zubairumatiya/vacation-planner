import styles from "../styles/EditSchedule.module.css";
import { Fragment } from "react/jsx-runtime";
import { useContext } from "react";
import { EditScheduleContext } from "../context/EditScheduleContext";
import ViewNormalRow from "./ViewNormalRow";

const CustomViewTableComponent = ({
  dayObj,
  schedule,
  viewMode,
}: ViewTableComponentProps) => {
  const { startError, endError, editLineId, errMessage } =
    useContext(EditScheduleContext);

  return (
    <table
      className={`${styles.table} ${viewMode && styles.viewTable}`}
      id={dayObj.day}
    >
      <colgroup>
        <col className={styles.dragCol} />
        <col className={styles.startTimeCol} />
        <col className={styles.endTimeCol} />
        <col className={styles.placeCol} />
        <col className={styles.costCol} />
        <col className={styles.detailsCol} />

        {!viewMode && (
          <>
            <col className={styles.multiDayCol} />
            <col className={editLineId ? "w-20" : styles.editCol} />
          </>
        )}
      </colgroup>
      <thead>
        <tr>
          {!viewMode && (
            <th className={editLineId ? undefined : styles.dragHeader}></th>
          )}

          <th className={styles.startTimeHeader}>Start Time</th>
          <th className={styles.endTimeHeader}>End Time</th>
          <th className={styles.locationHeader}>Place</th>
          <th className={styles.costHeader}>Cost</th>
          <th className={styles.detailsHeader}>Details</th>
          <th className={styles.multiDayHeader}>Multi-day</th>
          {!viewMode && <th className={styles.editFieldHeader}></th>}
        </tr>
      </thead>
      <tbody>
        {schedule[dayObj.day].map((item: Schedule) => {
          return (
            <Fragment key={item.id}>
              <ViewNormalRow value={item}></ViewNormalRow>

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
      </tbody>
    </table>
  );
};

export default CustomViewTableComponent;
