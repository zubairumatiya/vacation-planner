const EditableRow = ({
  value,
  index,
  dayContainer,
}: {
  value: Schedule;
  index: number;
  dayContainer: string;
}) => {
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
