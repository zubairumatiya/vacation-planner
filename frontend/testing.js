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

// FIX the drag drop by looking at the adjacent indexes and seeing which one is on the same as the drop day, i think the problem is only for the index zero of days because it grabs the time above, so we can do this by looking at adjacent times

// FIX days arrs from locale time to UTC format

// FIX all .gets since they use local time, ensure getUTC is being  used instead, better yet, might be better to use getTime() altogether.

// TEST - we need to see what happens when we pull a date type field into out JS and convert it to a date. Unless i can put it into JS as UTC with Z.
// --- hmm it would seem when inserting just a plain old date, it keeps it as is and converts it to UTC as is. GOOD!

// ADD last modified field updates upon patches

//SWITCH locales to Intl.DateTimeFormat and force UTC
