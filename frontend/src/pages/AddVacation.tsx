import VacationForm from "../components/VacationForm";
import { Link } from "react-router-dom";
import { useState } from "react";
const AddVacation = () => {
  const [submitButtonDisabled, setSubmitButtonDisabled] =
    useState<boolean>(true);
  const [submitClicked, setSubmitClicked] = useState<boolean>(false);

  const checkError = (fieldError: boolean) => {
    setSubmitButtonDisabled(fieldError);
    if (submitClicked) {
      if (fieldError === true) {
        setSubmitClicked(false);
      }
    }
  };

  const formSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitClicked(true);
  };

  return (
    <form onSubmit={formSubmit}>
      <VacationForm disableOrNah={checkError} submit={submitClicked} />
      <button
        type="submit"
        disabled={submitButtonDisabled}
        className="px-40 py-2 rounded bg-indigo-500 text-white pointer-events-auto cursor-pointer hover:bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:opacity-25"
      >
        Submit
      </button>
      <Link to="/">Cancel</Link>
    </form>
  );
};

export default AddVacation;
