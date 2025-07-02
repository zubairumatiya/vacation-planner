import { useState, useEffect } from "react";
import styles from "../styles/PasswordConditions.module.css";

const PasswordConditionsHelper = (props: {
  errorCallback: (arg1: string) => void;
  updatedPassword: string;
}) => {
  //#00bf55
  const [lowerCasePresent, setLowerCasePresent] = useState(false);
  const [upperCasePresent, setUpperCasePresent] = useState(false);
  const [numberPresent, setNumberPresent] = useState(false);
  const [specialPresent, setSpecialPresent] = useState(false);
  const [atLeastEight, setAtLeastEight] = useState(false);

  //console.log(props.updatedPassword);

  useEffect(() => {
    const newPassword = props.updatedPassword;
    let holdMessage = "";

    if (newPassword.length < 8) {
      holdMessage = "Password must be at least 8 characters";
      setAtLeastEight(false);
    } else {
      setAtLeastEight(true);
    }

    if (!/[-!@#$%^&*()_+=[\]{}\\|`~:;"'<>,.?/]+/.test(newPassword)) {
      holdMessage = "Password must contain at least 1 special character";
      setSpecialPresent(false);
    } else {
      setSpecialPresent(true);
    }

    if (!/[0-9]+/.test(newPassword)) {
      holdMessage = "Password must contain at least 1 number";
      setNumberPresent(false);
    } else {
      setNumberPresent(true);
    }

    if (!/[A-Z]+/.test(newPassword)) {
      holdMessage = "Password must contain at least 1 uppercase letter";
      setUpperCasePresent(false);
    } else {
      setUpperCasePresent(true);
    }

    if (!/[a-z]+/.test(newPassword)) {
      holdMessage = "Password must contain at least 1 lowercase letter";
      setLowerCasePresent(false);
    } else {
      setLowerCasePresent(true);
    }

    if (newPassword.length < 72) {
      props.errorCallback(holdMessage);
    } else {
      props.errorCallback("Password cannot exceed 72 characters");
    }
  }, [props.updatedPassword]);

  return (
    <div className={styles.conditionsContainer}>
      <div className={styles.condition}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="#ccc" //can tweak color and width later
            strokeWidth="2"
            fill="white"
          />

          <g id="SVGRepo_bgCarrier" strokeWidth="0" />

          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <g id="SVGRepo_iconCarrier">
            {" "}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"
              fill={lowerCasePresent ? "#00bf55" : "none"}
            />{" "}
          </g>
        </svg>
        <div className={styles.conditionLabel}>
          <p>Lowercase letter</p>
        </div>
      </div>

      <div className={styles.condition}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="#ccc"
            strokeWidth="2"
            fill="white"
          />

          <g id="SVGRepo_bgCarrier" strokeWidth="0" />

          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <g id="SVGRepo_iconCarrier">
            {" "}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"
              fill={upperCasePresent ? "#00bf55" : "none"}
            />{" "}
          </g>
        </svg>
        <div className={styles.conditionLabel}>
          <p>Uppercase letter</p>
        </div>
      </div>

      <div className={styles.condition}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="#ccc"
            strokeWidth="2"
            fill="white"
          />

          <g id="SVGRepo_bgCarrier" strokeWidth="0" />

          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <g id="SVGRepo_iconCarrier">
            {" "}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"
              fill={numberPresent ? "#00bf55" : "none"}
            />{" "}
          </g>
        </svg>
        <div className={styles.conditionLabel}>
          <p>Number</p>
        </div>
      </div>

      <div className={styles.condition}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="#ccc"
            strokeWidth="2"
            fill="white"
          />

          <g id="SVGRepo_bgCarrier" strokeWidth="0" />

          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <g id="SVGRepo_iconCarrier">
            {" "}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"
              fill={specialPresent ? "#00bf55" : "none"}
            />{" "}
          </g>
        </svg>
        <div className={styles.conditionLabel}>
          <p>Special character (e.g.!?@#$%^&...)</p>
        </div>
      </div>

      <div className={styles.condition}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="#ccc"
            strokeWidth="2"
            fill="white"
          />

          <g id="SVGRepo_bgCarrier" strokeWidth="0" />

          <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <g id="SVGRepo_iconCarrier">
            {" "}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"
              fill={atLeastEight ? "#00bf55" : "none"}
            />{" "}
          </g>
        </svg>
        <div className={styles.conditionLabel}>
          <p>At least 8 characters</p>
        </div>
      </div>
    </div>
  );
};

export default PasswordConditionsHelper;
