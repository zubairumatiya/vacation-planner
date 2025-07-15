import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/AddVacationForm.module.css";
import { AuthContext } from "../context/AuthContext.tsx";
import clsx from "clsx";
const apiUrl = import.meta.env.VITE_API_URL;

const AddVacation = () => {
  const auth = useContext(AuthContext);
  const token = auth?.token;

  const today = new Date().toISOString().slice(0, 10);
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const oneYear = date.toISOString().slice(0, 10);

  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fieldError, setFieldError] = useState(true);
  const [errMessage, setErrMessage] = useState("");
  const [oneYearRange, setOneYearRange] = useState(oneYear);

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
      if (res.status === 403) {
        setFieldError(true);
        setErrMessage(data.message);
      }
      if (res.status === 401 && data.error === "TokenExpired") {
        auth?.logout();
        navigate("/redirecting", {
          state: { message: "Token error, redirecting to login" },
        });
      }
      if (res.ok) {
        navigate("/");
      }
      console.log(data);
    } else {
      alert("you are not logged in - your trip will not be saved");
    }
  };

  const startDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
    const start = new Date(e.target.value);
    const end = new Date(endDate);
    console.log("start:", start, "end", end);
    if (start > end) {
      console.log("evaluating date");
      const pushEndDate = start.toISOString().slice(0, 10);
      setEndDate(pushEndDate);
    }
    setStartDate(e.target.value);

    start.setFullYear(start.getFullYear() + 1);
    const oneYear = start.toISOString().slice(0, 10);
    setOneYearRange(oneYear);
  };

  const endDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const formChange = (e: React.ChangeEvent<HTMLFormElement>) => {
    const form = new FormData(e.currentTarget);
    const tripname = form.get("tripname");
    const location = form.get("location");
    const immediateStartDate = String(form.get("startdate"));
    const immediateEndDate = String(form.get("enddate"));

    const start = new Date(immediateStartDate);
    const end = new Date(immediateEndDate);

    if (
      !tripname ||
      !location ||
      isNaN(start.getTime()) ||
      isNaN(end.getTime()) ||
      start > end
    ) {
      setFieldError(true);
    } else {
      setFieldError(false);
    }
  };

  const divs = "flex justify-center my-4 w-full";
  const labels = "flex justify-end ml-4 mr-2 w-1/6";
  const inputs = "flex justify-start w-4/10 border-2 border-green-500";

  return (
    <>
      <div>{errMessage && <p className="text-red-500">{errMessage}</p>}</div>
      <div className="flex flex-col items-center justify-around w-full">
        <form
          onChange={formChange}
          onSubmit={formSubmit}
          className="w-full flex flex-col items-center"
        >
          <div className="flex w-4/10 flex-col items-center ">
            <div className={divs}>
              <label className={labels} htmlFor="tripname">
                Trip name:{" "}
              </label>
              <input
                className={clsx(fieldError && styles.dateError, inputs)}
                type="text"
                name="tripname"
                id="tripname"
                placeholder="Honeymoon Trip"
              />
            </div>
            <div className={divs}>
              <label className={labels} htmlFor="location">
                Destination:{" "}
              </label>
              <input
                className={clsx(fieldError && styles.dateError, inputs)}
                type="text"
                name="location"
                id="location"
                placeholder="country, city, etc"
              />
            </div>
            <div className={divs}>
              <label className={labels} htmlFor="startdate">
                Start date:{" "}
              </label>
              <input
                className={clsx(fieldError && styles.dateError, inputs)}
                type="date"
                name="startdate"
                id="startdate"
                value={startDate}
                min={today}
                onChange={startDateChange}
              />
            </div>
            <div className={divs}>
              <label className={labels} htmlFor="enddate">
                End date:{" "}
              </label>
              <input
                className={clsx(fieldError && styles.dateError, inputs)}
                type="date"
                name="enddate"
                id="enddate"
                value={endDate}
                min={startDate}
                max={oneYearRange}
                onChange={endDateChange}
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={fieldError}
              className="px-40 py-2 rounded bg-indigo-500 text-white pointer-events-auto cursor-pointer hover:bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:opacity-25"
            >
              Add trip
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddVacation;
