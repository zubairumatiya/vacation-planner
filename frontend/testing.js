const nextDay = new Date("2025-08-01T02:00:00.000Z");

console.log(nextDay.toISOString());

console.log(
  Date.UTC(
    nextDay.getUTCFullYear(),
    nextDay.getUTCMonth(),
    nextDay.getUTCDate(),
    nextDay.getUTCHours()
  )
);
console.log("BELOW!");
console.log(nextDay.toUTCString());

const test = new Date("2025-07-16T00:00:00Z"); // test is now in UTC 00:00Z -> great
const test2 = new Date("2025-07-16T01:00:00Z");
console.log(test);
console.log(test2);
console.log(Math.floor((test2.getTime() - test.getTime()) / (1000 * 60 * 60)));

// make dragging responsive to all platforms // NEEDS TESTING
// should i just make end time an hour later upon drag and drop?  -- i think i should - DONE

// Thinking more about how users will use drag and drop, i wonder if i should just keep the same time and let them change it when they want.
//Maybe it's more annoying to have the time you want forcefully changed than to do more work to purposefully change it.
//Because the way planning works is, it's more scrambled than beginning to finish right? Let's think more about this. -- HOLD OFF

// ADD date when start day and end day are diff -- DONE

// add end time to db query --DONE
// ADD date to edit -- DONE
// add double click to edit -- DONE
// fix time not blurring properly even on clicking outside -- DONE

// need to add 24 hour limit when editing times -- DONE
// for the 24 hour limit make sure to reset styling after, deletion, submission, or cancellation - DONE
// incorporate multi-day -- DONE (i think)
// add cost total - DONE

// add want to see list
// -- add double click to edit, and delete button on appears over the bullet?
// -- add delete
// -- add data structure of {id:0, value:""}
// -- add token
// -- add api endpoint for list
// -- add db table for list
// add google maps API window
// add a calender view different than editing view we already have
// refresh token
// maybe find a way to log person out before they have make an api request

// nice to have - pressing enter while focused on customTimePicker does not submit the edit item
// nice to have -  anki deck for react
// nice to have - can add a bunch of things to the todo from google maps
// nice to have - can show pins from the items in the todo into google maps (will prob need some sort of ai interprettur on locations that can't be found)
// nice to have - can automate all the planning given the items in the want to see list and add it to the schedule
// nice to have - can also add things to the trip like popular destiantions if option is selected
// nice to have - plan it for me feature where user gives destinations, length of time, must see sights, activity levels, budget, hotel fanciness, focus(history, art, live events, etc)
// nice to have - ease the booking process by sending users to the links of places that need booking, would be nice if we can go through up until the confirm booking page (maybe we can utilize browser information like credit card, user info, and address)
// nice to have - and can house confirmation number maybe
// nice to have  -  maybe add deletion warning on if something has a lot of details
// nice to have - add during trip cost trackers

/* revolutionary: what is fun about planning a vacation? The destinations, finding gems, finding cool spots, getting recommendations that rock! 
What sucks? the logistics: travel, the order and sequence things have to happen. 
Sooo what if we have the fun part: we just have a page with a map and a list, we have AI that gives recommendations from google reviews, reddit, etc,
we can even give recommendation of trails at parks, foods at restaurants, etc. THEN 
we can plan all of it via proximity, and plan the route. The user will have to say what they are comfortable with, renting a car, public transport, etc.  */
