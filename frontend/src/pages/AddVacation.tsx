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
    <div className="max-w-3xl mx-auto my-12 p-6 sm:p-10 bg-[rgb(60,60,60)] shadow-2xl rounded-2xl border border-[rgb(38,164,93)]/31">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Plan a New Vacation
        </h2>
        <p className="text-gray-400 text-sm">
          Fill in the details below to start organizing your next adventure.
        </p>
      </div>
      <form onSubmit={formSubmit} className="space-y-4">
        <VacationForm disableOrNah={checkError} submit={submitClicked} />
        <div className="flex flex-col items-center pt-8 mt-4 border-t border-[rgb(38,164,93)]/31 gap-4">
          <button
            type="submit"
            disabled={submitButtonDisabled}
            className="w-full max-w-sm px-8 py-3.5 rounded-xl bg-[#2fe782] text-white font-bold text-lg shadow-md transition-all duration-200 ease-in-out hover:bg-indigo-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none transform active:scale-95 disabled:active:scale-100"
          >
            Create Vacation
          </button>
          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-indigo-400 font-semibold transition-colors duration-200"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default AddVacation;
