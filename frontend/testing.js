const nextDay = new Date("2025-08-01T02:00:00.000Z");
console.log(nextDay);
console.log(nextDay.toISOString().slice(11, 19));

console.log(nextDay.toLocaleString());

console.log(
  Date.UTC(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth(),
    nextDay.getUTCDate(),
    nextDay.getUTCHours()
  )
);

console.log(nextDay.getTime());

console.log(nextDay.toUTCString());

const test = new Date("2025-08-01");
console.log(test);

console.log(new Date("Jul 15, 2025"));

console.log(nextDay.toLocaleDateString());
console.log();
console.log(nextDay.toLocaleDateString());

const day = nextDay.toLocaleDateString("en-US", {
  weekday: "long",
  timeZone: "UTC",
});

console.log(day);

let options = {
  weekday: "long",
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};
const intl = new Intl.DateTimeFormat("en-US", options).format(nextDay);
console.log(intl);
// FIX days arrs from locale time to UTC format

// FIX all .gets since they use local time, ensure getUTC is being  used instead, better yet, might be better to use getTime() altogether.

// TEST - we need to see what happens when we pull a date type field into out JS and convert it to a date. Unless i can put it into JS as UTC with Z.
// --- hmm it would seem when inserting just a plain old date, it keeps it as is and converts it to UTC as is. GOOD!

// ADD last modified field updates upon patches

//SWITCH locales to Intl.DateTimeFormat and force UTC
