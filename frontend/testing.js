//import crytpo from "crypto";

//const token = crytpo.randomBytes(64).toString("hex");
//console.log(token);

//const regex =
//  /^\w+[\w.-]*@[A-Za-z0-9]+(?!.*\.\.)(?!.*(\.-|-\.))\.[A-Za-z0-9.-]*[A-Za-z0-9]+$/;
//
//const passwordRegex =
//  //^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()])(?=.*[A-Z])[A-Za-z\d!@#$%^&*()]{8,72}$/;
//  /^(?=.*[a-z])(?=.*\d)(?=.*[-!@#$%^&*()_+=[\]{}\\|`~:;"'<>,.?/])(?=.*[A-Z])[A-Za-z\d!@#$%^&*()_+=[\]{}\\|`~:;"'<>,.?/-]{8,72}$/;
//
//!@#$%^&*()-_+=[]{}\|`~:;"'<>,.?/
//NEXT : let's add individual ui checker for the signup screen so the user knows what the password requirements are

//const passwordRegex = /\W+/;
//console.log(regex.test("at@s.s"));
//console.log(passwordRegex.test(`asSsf2da`)); //é

const today = new Date().toISOString().slice(0, 10);

const tomorrow = new Date();

tomorrow.setDate(tomorrow.getDate() + 1);

const formattedTmrw = tomorrow.toLocaleDateString();

const newDate = new Date(formattedTmrw);

const customDate = newDate.toLocaleDateString("en-US", {
  weekday: "short",
  month: "long",
  day: "numeric",
});
// e.g. "Thu, July 11"

let start = new Date("03/09/2025");

let end = new Date("03/12/2025");

let UtcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());

let UtcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

let UtcSum = (UtcEnd - UtcStart) / (1000 * 60 * 60 * 24);

console.log(UtcSum);

//start = new Date();
for (let i = 0; i <= UtcSum; i++) {
  if (i === 0) {
    //start.setDate(start.getDate());
    const day = start.toLocaleDateString("en-us", {
      weekday: "long",
    });

    const day3 = start.toLocaleDateString("en-us", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const str = `${day} - ${day3}`;
    console.log(`${day} - ${day3}`);
    const d = new Date(str.split("-")[1]); //new Date(day3);
    console.log(d);
    console.log(end);
  } else {
    start.setDate(start.getDate() + 1);
    const day = start.toLocaleDateString("en-us", {
      weekday: "long",
    });
    const day3 = start.toLocaleDateString("en-us", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    console.log(`${day} - ${day3}`);
  }
}

let db = new Date("2025-07-10 15:30:00");
console.log(db.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
db.setDate(db.getDate() + 1);
db = db.toLocaleDateString();

let date = new Date();
console.log(date);
date.setFullYear(date.getFullYear() + 2);
console.log(date);
date = date.toISOString().slice(0, 10);
console.log(date);
//console.log(db);

//console.log(today);
//console.log(formattedTmrw);
//console.log(customDate);
