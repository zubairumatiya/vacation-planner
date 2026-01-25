import VacationForm from "../components/VacationForm";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
const AddVacation = () => {
  const [submitButtonDisabled, setSubmitButtonDisabled] =
    useState<boolean>(true);
  const [submitClicked, setSubmitClicked] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/");
      }
    };
    document.addEventListener("keydown", cancel);
    return () => document.removeEventListener("keydown", cancel);
  }, []);

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
      <div className="flex flex-col items-center">
        <button
          type="submit"
          disabled={submitButtonDisabled}
          className="px-40 py-2 rounded bg-indigo-500 text-white pointer-events-auto cursor-pointer hover:bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:opacity-25"
        >
          Submit
        </button>
        <Link to="/">Cancel</Link>
      </div>
    </form>
  );
};

export default AddVacation;
