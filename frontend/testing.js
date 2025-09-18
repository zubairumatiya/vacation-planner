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

const test = new Date("2025-08-01"); // test is now in UTC 00:00Z -> great
console.log(test.toISOString());

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

// need to add 24 hour limit when editing times --
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
