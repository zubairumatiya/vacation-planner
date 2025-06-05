//import { useState } from "react";

const AddVacation = () => {
  const formSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };
  return (
    <form onSubmit={formSubmit}>
      <label htmlFor="tripname">Trip name: </label>
      <input type="text" name="tripname" id="tripname" />
      <label htmlFor="startdate">From: </label>
      <input type="date" name="startdate" id="startdate" />
      <label htmlFor="enddate">To: </label>
      <input type="date" name="enddate" id="startdate" />
      <button type="submit"></button>
    </form>
  );
};

export default AddVacation;
