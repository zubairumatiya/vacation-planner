const startTimePick = "02:00 AM";
const dateAdded = "2025-07-15";

const customISOTime = (date, time) => {
  const timeSplit = time.split(" ");
  const meridiem = timeSplit[1];
  const hourNMinutes = timeSplit[0].split(":");
  let hours = hourNMinutes[0];
  const minutes = hourNMinutes[1];
  if (meridiem.toLowerCase() === "pm") {
    hours = Number(hours) + 12;
  }

  return new Date(`${date}T${hours}:${minutes}:00Z`);
};

const result = customISOTime(dateAdded, startTimePick);
console.log(result);

const arr = [1, 2, 4, 5];

console.log(arr.slice(3));

const prefixZero = (x) => {
  if (x <= 9) {
    return "0" + x;
  }
  return "" + x;
};

const getLocalDate = (toBeConverted) => {
  const year = toBeConverted.getFullYear();
  const month = prefixZero(toBeConverted.getMonth() + 1);
  const day = prefixZero(toBeConverted.getDate());
  return year + "-" + month + "-" + day;
};

const addMeridiem = (militaryTime) => {
  let hour = Number(militaryTime.split(":")[0]);
  const minute = militaryTime.split(":")[1];
  let meridiem;
  if (hour > 12) {
    hour = hour - 12;
    meridiem = "PM";
  } else {
    meridiem = "AM";
  }
  return `${hour}:${minute} ${meridiem}`;
};

const day = "2025-07-16T05:00:00Z";

const date = new Date(day); //reSort mimic
const whatWeAreDoingForDisplayButInUTC = addMeridiem(
  date.toUTCString().slice(-12, -7)
);
console.log(whatWeAreDoingForDisplayButInUTC);

const display = new Date(date).toLocaleTimeString([], {
  hour: "numeric",
  minute: "2-digit",
}); //sTime
console.log("LocaleTimeString: " + display);

const nextDay = new Date("2025-07-15T02:00:00.000Z");
console.log(nextDay);
console.log(nextDay.toISOString().slice(11, 19));
console.log(nextDay.toLocaleString());
console.log(nextDay.getUTCMinutes());
