import { useState, useContext } from "react";
import styles from "../styles/AddVacationForm.module.css";
import { AuthContext } from "../context/AuthContext.tsx";
const apiUrl = import.meta.env.VITE_API_URL;

const AddVacation = () => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fieldError, setFieldError] = useState(false);

  const formSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (token) {
      const formData = new FormData(e.currentTarget);
      const res = await fetch(`${apiUrl}/add-vacation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripname: formData.get("tripname"),
          location: formData.get("location"),
          startDate: startDate,
          endDate: endDate,
        }),
      });
      const data = await res.json();
      console.log(data);
    } else {
      alert("you are not logged in - your trip will not be saved");
    }
  };

  const startDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (endDate !== "") {
      return Number(e.target.value) < Number(endDate)
        ? setStartDate(e.target.value)
        : setFieldError(true);
    } else {
      setStartDate(e.target.value);
    }
  };

  const endDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (startDate !== "") {
      return Number(e.target.value) > Number(startDate)
        ? setEndDate(e.target.value)
        : setFieldError(true);
    } else {
      setEndDate(e.target.value);
    }
  };
  return (
    <form onSubmit={formSubmit}>
      <label htmlFor="tripname">Trip name: </label>
      <input
        type="text"
        name="tripname"
        id="tripname"
        placeholder="Honeymoon Trip"
      />
      <label htmlFor="location">Location: </label>
      <input
        type="text"
        name="location"
        id="location"
        placeholder="country, city, etc"
      />
      <label htmlFor="startdate">From: </label>
      <input
        className={fieldError ? styles.dateError : ""}
        type="date"
        name="startdate"
        id="startdate"
        value={startDate}
        onChange={startDateChange}
      />
      <label htmlFor="enddate">To: </label>
      <input
        className={fieldError ? styles.dateError : ""}
        type="date"
        name="enddate"
        id="enddate"
        value={endDate}
        onChange={endDateChange}
      />
      <button
        type="submit"
        disabled={fieldError}
        className={`${styles.submitButton} ${
          fieldError ? styles.disabledSubmitButton : ""
        }`}
      ></button>
    </form>
  );
};

export default AddVacation;
