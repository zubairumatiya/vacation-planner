import type { UniqueIdentifier } from "@dnd-kit/core";
import type { Schedule } from "../pages/EditVacationSchedule";

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

export const fourDigitTime = (time: Date) => {
  return time.toUTCString().slice(-12, -7);
};

export const prefixZero = (x: number): string => {
  if (x >= 0 && x < 10) {
    return "0" + x;
  }
  return "" + x;
};

export const customISOTime = (date: string, time: string) => {
  const timeSplit = time.split(" ");
  const meridiem = timeSplit[1];
  const hourNMinutes = timeSplit[0].split(":");
  let hours = hourNMinutes[0];
  const minutes = hourNMinutes[1];
  if (meridiem.toLowerCase() === "pm" && hours !== "12") {
    hours = String(Number(hours) + 12);
  }
  if (meridiem.toLowerCase() === "am" && hours === "12") {
    hours = "00";
  }

  return `${date}T${hours}:${minutes}:00Z`;
};

export const testLessThan24 = (
  obj: {
    which: string;
    date: string | undefined;
    hour: string;
    minute: string;
    meridiem: string;
  },
  setHoldStartTime: React.Dispatch<React.SetStateAction<string>>,
  setHoldEndTime: React.Dispatch<React.SetStateAction<string>>
) => {
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

export const newSortIndex = (id: UniqueIdentifier, newArray: Schedule[]) => {
  if (newArray.length <= 1) {
    return 0;
  }
  const newIndex = newArray.findIndex((v) => v.id === id);
  if (newIndex === newArray.length - 1) {
    // non-empty and at the bottom
    return newArray[newIndex - 1].sortIndex + 10;
  } else if (newIndex === 0) {
    return newArray[newIndex + 1].sortIndex - 10;
  } else {
    const sortIndexAbove = newArray[newIndex - 1].sortIndex;
    const sortIndexBelow = newArray[newIndex + 1].sortIndex;
    return (sortIndexAbove + sortIndexBelow) / 2;
  }
};
