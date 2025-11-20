import fs from "fs/promises";
const nextDay = new Date("2025-08-01T02:00:00.000Z");

console.log(nextDay.toISOString());

const apiKey = "AIzaSyCniKprqPB06h2CWrWI45AAZfFkvlDIygw";

async function getPlaces() {
  try {
    const res = await fetch(`http://localhost:5000/map`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ratingFilter: null,
        reviewFilter: null,
        nextPageToken: "",
        placeType: "restaurant",
        locationName: "Austin",
      }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log(data.places);
    console.log(data.places.length);
  } catch (err) {
    console.error("Error fetching places:", err);
  }
}
//getPlaces();

const autoC = async () => {
  const query = "New York cityy";
  try {
    const result = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": `${apiKey}`,
          "X-Goog-FieldMask": "suggestions.placePrediction",
        },
        body: JSON.stringify({
          input: `${query}`,
          //includeQueryPredictions: true, // optional, want to test what this will do. If this is off, we will have place queries only, which is prob what we want so let's test this for now
          includedPrimaryTypes: ["locality", "country", "political"],
        }),
      }
    );
    if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
    const data = await result.json();
    //await fs.writeFile(
    //  "autoCompleteResponse.json",
    //  JSON.stringify(data, null, 2)
    //);
    data.suggestions.forEach((v) =>
      console.log(v.placePrediction.text.text, v.placePrediction.types)
    );
  } catch (err) {
    return err;
  }
};

//autoC();

const dbResult = [
  { user_id: 1, first_name: "Alice", created_at: "2025-01-01" },
  { user_id: 2, first_name: "Bob", created_at: "2025-01-02" },
];

const toCamelCase = (dbRows) => {
  //will change array in place
  dbRows.map((row, index) => {
    const newObj = {};
    for (const key in row) {
      //const camelKey = key.replace(/_(\w)/g, (match, p1) => p1.toUpperCase());
      const camelKey = key.replace(/_(\w)/g, (match, p1) => p1.toUpperCase());
      newObj[camelKey] = row[key];
    }
    dbRows[index] = newObj;
  });
};

//toCamelCase(dbResult);

/*
let countOfPlaces = 0;
const gatherPlaces = [];
let holdToken = "";
const repeaterCall = async () => {
  const query = "restaurants near San Saba, TX 76877, USA"; // this will need to be changed too

  while (countOfPlaces < 20 && holdToken !== undefined) {
    const result = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": `${apiKey}`,
          //"places.id,nextPageToken,places.name",
          "X-Goog-FieldMask": "places.id,nextPageToken,places.displayName",
        },
        body: JSON.stringify({
          textQuery: `${query}`,
          pageToken: holdToken,
          //minRating: 4,
          pageSize: 20,
        }),
      }
    );
    if (!result.ok) throw new Error(`HTTP error! status: ${result.status}`);
    const data = await result.json();
    countOfPlaces += data.places.length;
    holdToken = data.nextPageToken;
    gatherPlaces.push(...data.places);
    data.places.forEach((v) => console.log(v.displayName.text, "--- ", v.id));
    console.log(`\n\n~~~~~~~~ \n\n`);
  }
  console.log(holdToken);
  console.log(gatherPlaces.length);
};
repeaterCall();
*/
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
// add want to see list - DONE

// add google maps API window
// -- add from google maps directly to want to see list OR schedule (prob a button instead of drag, or maybe button for one and drag for the other)
// -- -- add drag from list to schedule, this will not remove the list item but rather engage the checked list item styling, if a successful drop occurs
//
// -- -- implement dnd-kit (overhaul existing drag logic)
// -- -- -- change listeners on Droppable containers (table) and on sortable items (the tr's)
// -- -- -- get callback functions to pass into schedule component
// -- -- -- will we need tr for the drag overlay as well? add the drag handle to first td instead, the listeners and attributes
// -- -- -- pass the appropriate sensors to Dnd context - mainly mouse and touch so that we can use this on mobile too - https://docs.dndkit.com/api-documentation/sensors
//
// -- -- dragging is not ideal for mobile, so we can help mitigate by adding auto suggestions from list to the location input when adding a new item to the schedule.
// -- -- should we add a google id link from list to schedule just like we did in maps? Or is this unecessarily complex without added benefit, yeah i really don't know if the user is getting any benefit.
// -- schedule drag styling should shift items visually
// -- add more placeTypes
// -- reset place list scroll bar upon next page
// -- add question mark help button in corner of each component that gives explanation
// -- make UI responsive
// -- add token check to backend maps api points
// -- change API restriction to IP Address once I begin hosting Frontend → use referrer restriction (yourdomain.com) Backend → use IP restriction (the server’s static public IP). So will need two keys.
// -- Any “write” or high-cost operations (like Places searches or Directions requests) are safer from abuse if done server-side.
// -- Set usage limits in Google Cloud Console - since we know all requests will be using the enterprise option, we can set the generic query limit in quotas using free limit for the enterprise text search SKU (1000)
// add sharing capabilites to other users - for view only, maybe just not render the edit tab?
// maybe have collapsable weeks in the schedule portion, and maybe a max height too?
// check if i am counting days properly in the title
// add a calender view different than editing view we already have
// make the tabs font in vs code smaller
// add token check when viewing schedule
// refresh token
// maybe find a way to log person out before they have make an api request
// mailgun email styling

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
