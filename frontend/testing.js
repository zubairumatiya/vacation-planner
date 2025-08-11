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

const date = new Date("2025-07-23T20:00:00");
console.log(date.toISOString());
