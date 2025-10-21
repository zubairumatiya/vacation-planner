import fs from "fs";
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
        locationName: "San Saba, TX 76877, USA",
      }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    console.log(data);
    console.log(data.places.length);
  } catch (err) {
    console.error("Error fetching places:", err);
  }
}
getPlaces();
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
// -- tweak viewport maybe, pins are landing way north of viewport
// -- need to add more selection criteria, categories, ratings, reviews,etc
// -- -- running into a bit of a problem, search nearby doesn't allow for filtering by stars and ratings. So the best practical method is probably to retirieve a lot
// -- -- of places and then filter by our filters and sort descending. But still this will not pull all the places within our criteria, a fix i can think of is having
// -- -- a next button or something that sends another request, but then i would have to retrieve another set that is not similar to my first retrieval (UNKNOWN)
// -- -- this would be complex. Another maybe even more complex thing would be to do a text retrieval of every place (UNKNOWN), filter with our criteria, not sure if
// -- -- i would even be able to access the star and rating count fields of places (UNKNOWN), keep the id's, then do a mass id array search to put pins on places (UNKNOWN)
// -- -- simplest option would prob be to rank by popularity and retrieve a lot more spots to hopefully get all the good places to cancel the bad. AN IDEA:
// -- -- we could pull a large pool using the rank by popularity but still maintain the ability to filter. 20 is the MAX actually. Let's see how we can make multiple
// -- -- requests in batches of 20 and then we can either add the filters or just keep the POPULAR results
// -- -- will require changing the search query into a single query instead of type. Although text does include types, still need to think of format.
// -- auto load a place depending on the location of our vacation spot
// -- add from google maps directly to want to see list OR schedule
// -- change API restriction to IP Address once I begin hosting Frontend → use referrer restriction (yourdomain.com) Backend → use IP restriction (the server’s static public IP). So will need two keys.
// -- Any “write” or high-cost operations (like Places searches or Directions requests) are safer from abuse if done server-side.
// -- Set usage limits in Google Cloud Console - You can restrict the number of requests per day per key.
// -- reset place list scroll bar upon next page
// -- add token check to backend maps api point
// add a calender view different than editing view we already have
// -- add token check when getting schedule
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
