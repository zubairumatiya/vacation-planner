import { addMeridiem, fourDigitTime, prefixZero } from "../utils/timeHelpers";
import styles from "../styles/EditSchedule.module.css";

type ViewNormalRowProps = {
  value: Schedule;
};

const ViewNormalRow = ({ value }: ViewNormalRowProps) => {
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
    <tr key={value.id} className={`${styles.tableRow}`}>
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
    </tr>
  );
};

export default ViewNormalRow;
