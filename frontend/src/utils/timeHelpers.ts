export const addMeridiem = (militaryTime: string) => {
  let hour = Number(militaryTime.split(":")[0]);
  const minute = militaryTime.split(":")[1];
  let meridiem;
  if (hour > 11) {
    if (hour !== 12) {
      hour = hour - 12;
    }
    meridiem = "PM";
  } else {
    if (hour === 0) {
      hour = 12;
    }
    meridiem = "AM";
  }
  return `${hour}:${minute} ${meridiem}`;
};

export const fourDigitTime;

export const prefixZero;

export const testLessThan24 = (obj: {
  which: string;
  date: string | undefined;
  hour: string;
  minute: string;
  meridiem: string;
}) => {
  let startISO: string = "";
  let endISO: string = "";
  if (
    obj.date &&
    obj.hour &&
    obj.minute &&
    obj.meridiem &&
    obj.which === "start"
  ) {
    startISO = customISOTime(
      obj.date,
      `${obj.hour}:${obj.minute} ${obj.meridiem}`
    );
    setHoldStartTime(startISO);
  }
  if (
    obj.date &&
    obj.hour &&
    obj.minute &&
    obj.meridiem &&
    obj.which === "end"
  ) {
    endISO = customISOTime(
      obj.date,
      `${obj.hour}:${obj.minute} ${obj.meridiem}`
    );
    setHoldEndTime(endISO);
  }
};
