import styles from "../styles/EditSchedule.module.css";
import { useState, useRef, useContext } from "react";
import {
  testLessThan24,
  addMeridiem,
  fourDigitTime,
} from "../utils/timeHelpers";
import CustomTimePicker from "./CustomTimePicker";
import type { UniqueIdentifier } from "@dnd-kit/core";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const EditableRow = ({
  value,
  index,
  dayContainer,
  startError,
  endError,
  setSchedule,
  setCostTotal,
  schedule,
  editStartDate,
  setEditStartDate,
  constructDate,
  editEndDate,
  setEditEndDate,
  locationError,
  locationEditRef,
  costEditRef,
}: EditRowProps) => {
  const [editStartTimeObject, setEditStartTimeObject] = useState<TimeObj>(
    {} as TimeObj
  );
  const [editEndTimeObject, setEditEndTimeObject] = useState<TimeObj>(
    {} as TimeObj
  );
  const startDateEditRef = useRef<HTMLInputElement>(null);
  const endDateEditRef = useRef<HTMLInputElement>(null);
  const apiURL = import.meta.env.VITE_API_URL;
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const submitDelete = async (
    e: React.MouseEvent,
    itemID: UniqueIdentifier,
    index: number,
    dateAdded: string
  ) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiURL}/schedule/${itemID}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setEditLineId(null);
        setAddingItem(false);
        setCostTotal((prev) => prev - schedule[dateAdded][index].cost);
        setSchedule((prev) => ({
          ...prev,
          [dateAdded]: prev[dateAdded].filter((v) => v.id !== itemID),
        }));
        // might have to remove from our react schedule item using itemID
      } else if (response.status === 401) {
        navigate("/redirect", {
          state: { message: "Session expired, redirecting to log in..." },
        });
        // should prob replace this with a function inside auth to renew token via refresh token, and if i can't find any or the refresh is expired then navigate to login
      } else {
        console.log("~~~~ error deleting item");
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <td>
        <button
          type="button"
          className={styles.xButton}
          onClick={(e) => submitDelete(e, value.id, index, dayContainer)}
        >
          delete
        </button>
      </td>
      <td
        className={`border-2 ${
          startError ? " border-red-500" : "border-transparent"
        }`}
      >
        {
          <input
            type="date"
            name="startDate"
            id="startDate"
            className={`${styles.dateEditInput} `}
            value={editStartDate}
            onChange={(e) => {
              setEditStartDate(e.target.value);
              testLessThan24({
                which: "start",
                date: e.target.value,
                ...editStartTimeObject,
              });
            }}
            ref={startDateEditRef}
          />
        }
        <CustomTimePicker
          className={startError ? "border-red-500" : undefined}
          onChange={(hour: string, minute: string, meridiem: string) => {
            constructDate("start", hour, minute, meridiem);
            setEditStartTimeObject({
              hour,
              minute,
              meridiem,
            });
            testLessThan24({
              which: "start",
              date: startDateEditRef?.current?.value,
              hour,
              minute,
              meridiem,
            });
          }}
          preTime={addMeridiem(fourDigitTime(value.startTime))}
        />
      </td>

      <td
        className={`border-2 ${
          endError ? " border-red-500" : "border-transparent"
        }`}
      >
        {
          <input
            type="date"
            name="endDate"
            id="endDate"
            value={editEndDate}
            className={`${styles.dateEditInput}`}
            onChange={(e) => {
              setEditEndDate(e.target.value);
              testLessThan24({
                which: "end",
                date: e.target.value,
                ...editEndTimeObject,
              });
            }}
            ref={endDateEditRef}
          />
        }
        <CustomTimePicker
          className={endError ? "border-red-500" : undefined}
          onChange={(
            // im pretty sure using a callback function here is not necessary, could just put constructDate, however we will lose "end" since it's closed over
            hour: string,
            minute: string,
            meridiem: string
          ) => {
            constructDate("end", hour, minute, meridiem);
            setEditEndTimeObject({
              hour,
              minute,
              meridiem,
            });
            testLessThan24({
              which: "end",
              date: endDateEditRef?.current?.value,
              hour,
              minute,
              meridiem,
            });
          }}
          preTime={addMeridiem(fourDigitTime(value.endTime))}
        />
      </td>

      <td>
        <input
          type="text"
          name="location"
          id="location"
          maxLength={300}
          className={`${locationError && "border-red-500"} ${styles.input}`}
          ref={locationEditRef}
        />
      </td>

      <td>
        <input
          className={`${styles.input} ${styles.costEditInput}`}
          type="number"
          name="cost"
          id="cost"
          step="0.01"
          min="0"
          ref={costEditRef}
        />
      </td>

      <td>
        <textarea
          onInput={handleTextInput}
          className={`${styles.textArea}`}
          rows={50}
          cols={5}
          name="details"
          id="details"
          maxLength={500}
          ref={detailEditRef}
          onFocus={() => setTextAreaFocus(true)}
          onBlur={() => setTextAreaFocus(false)}
        />
      </td>
      <td>
        <input
          type="checkbox"
          className={`${multiDayStyle && styles.checkBoxHighlight}`}
          name="editMultDay"
          id="editMultiDay"
          checked={editMultiDay}
          onChange={(e) => setEditMultiDay(e.target.checked)}
          ref={multiDayEditRef}
        />
      </td>

      <td>
        <div className={styles.editButtonCluster}>
          <button
            type="button"
            className={`${styles.buttonsWhileEditing} ${styles.cancelButton}`}
            onClick={cancelAdd}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.buttonsWhileEditing}  ${
              endError || startError ? "" : styles.submitEditButton
            }`}
            onClick={(e) => submitEdit(dayContainer, value.id, e)}
            disabled={endError || startError}
            ref={editSubmitButtonRef}
            onKeyUp={(e) => {
              submitEdit(dayContainer, value.id, e);
            }}
          >
            Submit
          </button>
        </div>
      </td>
    </>
  );
};

export default EditableRow;
