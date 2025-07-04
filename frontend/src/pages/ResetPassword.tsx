import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PasswordConditionsHelper from "../components/PasswordConditionsHelper.tsx";
import styles from "../styles/ResetPassword.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

const ResetPassword = () => {
  const [match, setMatch] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBlur, setPasswordBlur] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const navigate = useNavigate();

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token: string = params.get("token") || "";

  const handleResetSubmit = async () => {
    const res = await fetch(`${apiUrl}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: newPassword, token: token }), // gonna have to add token as well from the url queries after user clicks on the email
    });

    if (res.status !== 200) {
      if (res.status === 400) {
        alert("something went wrong, please refresh and try again");
      }
    } else {
      navigate("/redirect", {
        state: {
          message: "Password successfully reset! Redirecting to login...",
        },
      });
    }
  };

  const passwordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
  };

  const handleConfirmationCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (e.target.value === newPassword) {
      setMatch(true);
      if (errorMessage === "") {
        setSubmitDisabled(false);
      }
    } else {
      setMatch(false);
    }
  };

  const passwordErrorMessage = (message: string): void => {
    setErrorMessage(message);
  };

  return (
    <div>
      <h2>Reset Password</h2>
      <form onSubmit={handleResetSubmit}>
        <div className={styles.container}>
          <div className={styles.fieldsContainer}>
            <div>
              <label htmlFor="newpassword">New Password</label>
              <input
                type="password"
                name="newpassword"
                id="newpassword"
                value={newPassword}
                onChange={passwordChange}
                className={
                  errorMessage === "" && passwordBlur === true
                    ? styles.greenBorder
                    : styles.errorBorder
                }
                onBlur={() => setPasswordBlur(true)}
              />
            </div>

            <div>
              <label htmlFor="confirmpassword">Confirm New Password</label>
              <input
                type="password"
                name="confirmpassword"
                id="confirmpassword"
                value={confirmPassword}
                onChange={handleConfirmationCheck}
                className={match ? styles.greenBorder : styles.errorBorder}
              />
            </div>
            <div className={styles.errorMessage}>
              {passwordBlur && <p>{errorMessage}</p>}
            </div>
            <div className={styles.buttonDiv}>
              <button type="submit" disabled={submitDisabled}>
                Reset Password
              </button>
            </div>
          </div>
          <div className={styles.conditionsContainer}>
            <div>
              <PasswordConditionsHelper
                errorCallback={passwordErrorMessage}
                updatedPassword={newPassword}
              />

              <div className={styles.soloCondition}>
                <div>
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
                        fill={
                          match && newPassword !== "" && confirmPassword !== ""
                            ? "#00bf55"
                            : "none"
                        }
                      />{" "}
                    </g>
                  </svg>
                </div>
                <div>
                  <p>Passwords match</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword;
