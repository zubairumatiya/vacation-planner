import type { UniqueIdentifier } from "@dnd-kit/core";

export const toSchedule = (item: ScheduleFromApi): Schedule => ({
  ...item,
  id: String(item.id),
  startTime: new Date(item.startTime),
  endTime: new Date(item.endTime),
});

export const toScheduleList = (items: ScheduleFromApi[]): Schedule[] =>
  items.map(toSchedule);

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
  setHoldEndTime: React.Dispatch<React.SetStateAction<string>>,
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
      `${obj.hour}:${obj.minute} ${obj.meridiem}`,
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
      `${obj.hour}:${obj.minute} ${obj.meridiem}`,
    );
    setHoldEndTime(endISO);
  }
};

export const indexChunk = (
  id: UniqueIdentifier,
  newArray: Schedule[],
): Chunk => {
  if (newArray.length <= 1) {
    return {};
  }
  const newIndex = newArray.findIndex((v) => v.id === id);
  console.log(
    "making our chunk - above:",
    newArray[newIndex - 1]?.sortIndex,
    "below:",
    newArray[newIndex + 1]?.sortIndex,
  );
  if (newIndex === newArray.length - 1) {
    // non-empty and at the bottom
    return {
      above: {
        id: newArray[newIndex - 1].id,
        sortIndex: newArray[newIndex - 1].sortIndex,
      },
    };
  } else if (newIndex === 0) {
    return {
      below: {
        id: newArray[newIndex + 1].id,
        sortIndex: newArray[newIndex + 1].sortIndex,
      },
    };
  } else {
    return {
      above: {
        id: newArray[newIndex - 1].id,
        sortIndex: newArray[newIndex - 1].sortIndex,
      },
      below: {
        id: newArray[newIndex + 1].id,
        sortIndex: newArray[newIndex + 1].sortIndex,
      },
    };
  }
};

export const calculateNewSortIndex = (chunk: Chunk): number => {
  const above = chunk.above?.sortIndex;
  const below = chunk.below?.sortIndex;

  if (above == null && below == null) {
    return 0;
  } else if (above == null) {
    console.log("No above in chunk");
    if (below != null) {
      return below - 1000;
    }
  } else if (below == null) {
    console.log("No below in chunk");
    return above + 1000;
  } else {
    console.log("our middle spot:", Math.floor((above + below) / 2));
    return Math.floor((above + below) / 2);
  }
  return 0;
};

export const makeContainers = (length: number, startDate: Date) => {
  const dayContainers: DayContainer[] = [];

  for (let i = 0; i <= length; i++) {
    if (i === 0) {
      const day = new Intl.DateTimeFormat("en-us", {
        weekday: "long",
        timeZone: "UTC",
      }).format(startDate);
      const date = new Intl.DateTimeFormat("en-us", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(startDate);

      dayContainers.push({
        day: startDate.toISOString().split("T")[0],
        label: `${day} - ${date}`,
      });
    } else {
      startDate.setDate(startDate.getDate() + 1); // adding a day in local time, and then converting to UTC in method below: timeZone: "UTC"
      const day = new Intl.DateTimeFormat("en-us", {
        weekday: "long",
        timeZone: "UTC",
      }).format(startDate);
      const date = new Intl.DateTimeFormat("en-us", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(startDate);
      dayContainers.push({
        day: startDate.toISOString().split("T")[0],
        label: `${day} - ${date}`,
      });
    }
  }
  return dayContainers;
};

export const bucketizeSchedule = (
  dayContainers: DayContainer[],
  arr: Schedule[],
) => {
  const bucketizeItems: DaySchedule = {};
  dayContainers.forEach(
    (dayObj: DayContainer) =>
      (bucketizeItems[dayObj.day] = arr.filter(
        (v: Schedule | ScheduleFromApi) =>
          new Date(v.startTime).toISOString().split("T")[0] === dayObj.day,
      )),
  );
  return bucketizeItems;
};
