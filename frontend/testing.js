//import crytpo from "crypto";

//const token = crytpo.randomBytes(64).toString("hex");
//console.log(token);

const regex =
  /^\w+[\w.-]*@[A-Za-z0-9]+(?!.*\.\.)(?!.*(\.-|-\.))\.[A-Za-z0-9.-]*[A-Za-z0-9]+$/;

const passwordRegex =
  //^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()])(?=.*[A-Z])[A-Za-z\d!@#$%^&*()]{8,72}$/;
  /^(?=.*[a-z])(?=.*\d)(?=.*[-!@#$%^&*()_+=[\]{}\\|`~:;"'<>,.?/])(?=.*[A-Z])[A-Za-z\d!@#$%^&*()_+=[\]{}\\|`~:;"'<>,.?/-]{8,72}$/;

//!@#$%^&*()-_+=[]{}\|`~:;"'<>,.?/
//NEXT : let's add individual ui checker for the signup screen so the user knows what the password requirements are

//const passwordRegex = /\W+/;
console.log(regex.test("at@s.s"));
console.log(passwordRegex.test(`asSsf2da`)); //é
