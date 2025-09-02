const nextDay = new Date("2025-08-01T02:00:00.000Z");

console.log(nextDay.toISOString().slice(11, 19));

console.log(
  Date.UTC(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth(),
    nextDay.getUTCDate(),
    nextDay.getUTCHours()
  )
);

console.log(nextDay.toUTCString());

const test = new Date("2025-08-01"); // test is now in UTC 00:00Z -> great
console.log(test);

console.log(new Date("2025-07-15"));

console.log(nextDay.toLocaleDateString());
console.log();
console.log(nextDay.toLocaleDateString("en-GB"));

let options = {
  weekday: "long",
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

const dayy = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "UTC",
}).format(nextDay);
const intl = new Intl.DateTimeFormat("en-US", options).format(nextDay);
console.log(intl);
console.log(dayy);

const monthsArr = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const d = "Aug 01, 2025";
const splits = d.split(" ");
const month = monthsArr.findIndex((v) => splits[0] === v) + 1;
const day = splits[1].slice(0, 2);
const year = splits[2];

console.log(d);
console.log(year, month, day);
const sp = new Date(`${year}-0${month}-${day}T00:00:00Z`);
console.log(sp.toISOString().split("T")[0]);
console.log(new Date(d).toISOString().split("T")[0]);

// FIX edit visual because time is cramped at the moment
// TEST end time function
// add end time to db query
//incorporate multi-day
// anki deck for react
