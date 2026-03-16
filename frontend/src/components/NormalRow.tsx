import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { addMeridiem, fourDigitTime, prefixZero } from "../utils/timeHelpers";
import styles from "../styles/EditSchedule.module.css";
import editIcon from "../assets/icons/edit-icon.svg";
import duplicateIcon from "../assets/icons/duplicate-icon.svg";
import lockIcon from "../assets/icons/lock-icon.svg";
import unlockIcon from "../assets/icons/unlock-icon.svg";
import dragIcon from "../assets/icons/dragger.svg";
import { useContext } from "react";
import { EditScheduleContext } from "../context/EditScheduleContext";

type NormalRowProps = {
  value: Schedule;
  dayContainer: string;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes | undefined;
  viewMode: boolean;
  onDuplicate?: (item: Schedule, dayContainer: string) => void;
  onToggleLock?: (item: Schedule) => void;
};

const NormalRow = ({
  value,
  dayContainer,
  viewMode,
  onDuplicate,
  onToggleLock,
  ...restOfProps
}: NormalRowProps) => {
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
    value.endTime.getUTCMonth() + 1,
  )}-${prefixZero(
    value.endTime.getUTCDate(),
  )}-${value.endTime.getUTCFullYear()}`;

  return (
    <>
      {!viewMode && (
        <td className={styles.dragCells} {...restOfProps}>
          <div className={styles.dragWrapper}>
            <img className={styles.dragButton} src={dragIcon} alt="drag" />
          </div>
        </td>
      )}
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
        <div className={styles.detailsContent}>{value.details}</div>
      </td>
      <td>{value.multiDay ? "yes" : "no"}</td>
      {!viewMode && (
        <td className={styles.actionsTd}>
          <div className={styles.leftActionsCol}>
            <img
              className={styles.editIcon}
              src={editIcon}
              alt="edit-icon"
              title="Edit"
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
                  dayContainer,
                )
              }
            />
            <img
              className={styles.duplicateIcon}
              src={duplicateIcon}
              alt="duplicate-icon"
              title="Duplicate"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate?.(value, dayContainer);
              }}
            />
          </div>
          <div className={styles.rightActionsCol}>
            <img
              className={`${styles.editIcon} ${value.isLocked ? styles.lockActive : ""}`}
              src={value.isLocked ? lockIcon : unlockIcon}
              alt={value.isLocked ? "locked" : "unlocked"}
              title={
                value.isLocked
                  ? "Unlock (AI can move this)"
                  : "Lock (AI won't move this)"
              }
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock?.(value);
              }}
            />
          </div>
        </td>
      )}
    </>
  );
};

export default NormalRow;
