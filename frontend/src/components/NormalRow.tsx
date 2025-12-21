import type { Schedule } from "../pages/EditVacationSchedule";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { addMeridiem, fourDigitTime, prefixZero } from "../utils/timeHelpers";
import styles from "../styles/EditSchedule.module.css";
import editIcon from "../assets/edit-icon.svg";
import dragIcon from "../assets/dragger.svg";
import { useContext } from "react";
import { EditScheduleContext } from "../context/EditScheduleContext";

type NormalRowProps = {
  value: Schedule;
  dayContainer: string;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes | undefined;
};

const NormalRow = ({ value, dayContainer, ...restOfProps }: NormalRowProps) => {
  const { handleEdit } = useContext(EditScheduleContext);
  let sTime;
  if (value.startTime) {
    sTime = addMeridiem(fourDigitTime(value.startTime));
  } else {
    sTime = "12:00 AM";
  }
  let eTime;
  if (value.endTime) {
    eTime = addMeridiem(fourDigitTime(value.endTime));
  } else {
    eTime = "12:01 AM";
  }

  const startDate: string = value.startTime.toISOString().split("T")[0];

  const endDate: string = value.endTime.toISOString().split("T")[0];

  const endDateFormatted: string = `${prefixZero(
    value.endTime.getUTCMonth() + 1
  )}-${prefixZero(
    value.endTime.getUTCDate()
  )}-${value.endTime.getUTCFullYear()}`;

  return (
    <>
      <td
        //onDragStart={(e) =>
        //  handleDragStart(e, value.id, index)
        //}
        className={styles.dragCells}
        {...restOfProps}
      >
        <div className={styles.dragWrapper}>
          <img className={styles.dragButton} src={dragIcon} alt="drag" />
        </div>
      </td>
      <td>{sTime}</td>
      {startDate !== endDate ? (
        <td>
          {endDateFormatted}
          <br />
          {eTime}
        </td>
      ) : (
        <td>{eTime}</td>
      )}
      <td className={`${styles.locationTd}`}>{value.location}</td>
      <td className={styles.costTd}>{`$${value.cost}`}</td>
      <td className={styles.detailsTd}>
        <div>{value.details}</div>
      </td>
      <td>{value.multiDay ? "yes" : "no"}</td>
      <td>
        <img
          className={styles.editIcon}
          src={editIcon}
          alt="edit-icon"
          onClick={(e) =>
            handleEdit(
              e,
              value.id,
              value.location,
              value.cost,
              value.details,
              value.multiDay,
              startDate,
              endDate,
              dayContainer
            )
          }
        />
      </td>
    </>
  );
};

export default NormalRow;
