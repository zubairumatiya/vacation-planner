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

const boern = {
  id: 37,
  trip_id: 1,
  location: "eh",
  details: "beh",
  start_time: "2025-07-16T00:00:00.000Z",
  end_time: "2025-07-16T08:00:00.000Z",
  cost: "3.00",
  multi_day: false,
};

const s = {
  "jul 15": [
    { index: 1, cells: boern },
    { index: 2, cells: boern },
  ],
  "jul 16": [
    { index: 3, cells: boern },
    { index: 4, cells: boern },
  ],
};

Object.values(s)
  .flatMap((value) => value)
  .map((v) => console.log(v.cells.id));

// make dragging responsive to all platforms
// not showing table when no items are in there
// TEST end time function
// add end time to db query
// ADD date to edit
// make multi-day mode for when editing a multiday where it shows only date and not time ehh actually maybe time too
//incorporate multi-day
// add cost total
// add during trip cost trackers
// add want to see list
// add google maps API window

// nice to have -  anki deck for react
// nice to have - can add a bunch of things to the todo from google maps
// nice to have - can show pins from the items in the todo into google maps (will prob need some sort of ai interprettur on locations that can't be found)
// nice to have - can automate all the planning given the items in the want to see list and add it to the schedule
// nice to have - can also add things to the trip like popular destiantions if option is selected
// nice to have - plan it for me feature where user gives destinations, length of time, must see sights, activity levels, budget, hotel fanciness, focus(history, art, live events, etc)
// nice to have - ease the booking process by sending users to the links of places that need booking, would be nice if we can go through up until the confirm booking page (maybe we can utilize browser information like credit card, user info, and address)
// nice to have - and can house confirmation number maybe
// nice to have  -  maybe add deletion warning on if something has a lot of details
