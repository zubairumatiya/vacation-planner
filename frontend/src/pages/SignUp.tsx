import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "../styles/SignUp.module.css";
import { isValidEmail } from "../../../shared/emailUtils.ts";
import { isValidPassword } from "../../../shared/passwordUtils.ts";
import PasswordConditionsHelper from "../components/PasswordConditionsHelper.tsx";

const apiUrl = import.meta.env.VITE_API_URL;

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [disableSubmission, setDisableSubmission] = useState(true);
  const [emailMicroing, setEmailMicroing] = useState(false);
  const [passwordMicroing, setPasswordMicroing] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showCritera, setShowCriteria] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [existingUserError, setExistingUserError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isValidPassword(password) && isValidEmail(email)) {
      setDisableSubmission(false);
    }
  }, [password, email]);

  const handleFormSubmission = async (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const dataObj = Object.fromEntries(formData.entries()); // this makes our form fields into an obj like: {email: "...", password: "...", username: "..."}

    const res = await fetch(`${apiUrl}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataObj),
    });
    const data = await res.json();
    if (res.status !== 200) {
      if (res.status === 409) {
        setExistingUserError(`${data.message}`);
      }
      alert("error creating account - refresh and retry");
    } else {
      navigate("/verify-email", { state: { email: dataObj.email } });
    }
  };

  const handleEmailBlur = () => {
    setEmailMicroing(true);

    if (!isValidEmail(email)) {
      setEmailError(true);
    }
    //we might need to add error criteria here as well - depends on if setting emailmicroing to true
    //will execute the onchange function therefore error checking. Pretty confident we will need to
    //add the error criteria here... stay tuned
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailMicroing) {
      // track changes for every word, make sure email format is correct and display warning

      if (!isValidEmail(email)) {
        setEmailError(true);
      } else {
        if (emailError === true) {
          setEmailError(false);
        }
      }
    }
  };

  const handlePasswordBlur = () => {
    setPasswordMicroing(true);

    if (!isValidPassword(password)) {
      setPasswordError(true);
      //micromanage tracking against password criteria and trigger/clear error
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (password.length > 72) {
      setPasswordError(true);
    }
    if (passwordMicroing) {
      if (!isValidPassword(password)) {
        setPasswordError(true);
        // we are using password error messages from two different sources. The red border and ! symbol with this, and the criteria with the pch child.
        //the setPasswordError is holding it together. I believe my regex is the same for both.
      } else {
        if (passwordError === true) {
          setPasswordError(false);
        }
      }
    }
  };

  const specificPasswordError = (message: string): void => {
    setPasswordErrorMessage(message);
  };

  return (
    <>
      <h2>Let&apos;s get started!</h2>
      <div>
        {existingUserError !== "" && (
          <p className={styles.errorMessage}>
            An account with this email already exist. Please{" "}
            <Link to="/login">log in</Link> or{" "}
            <Link to="/reset-password">reset your password</Link>
          </p>
        )}
      </div>
      <form onSubmit={handleFormSubmission}>
        <div className={styles.formContainer}>
          <div>
            <div>
              <div>
                <label htmlFor="firstName">First Name</label>
              </div>
              <div>
                <input type="text" name="firstName" id="firstName" />
              </div>
            </div>
            <div>
              <div>
                <label htmlFor="lastname">Last Name</label>
              </div>
              <div>
                <input type="text" name="lastName" id="lastName" />
              </div>
            </div>
            <div></div>
          </div>

          <div>
            <div>
              <label htmlFor="email">Email</label>
            </div>
            <div>
              <div>
                <div>
                  <input
                    onChange={handleEmailChange}
                    onBlur={emailMicroing ? undefined : handleEmailBlur}
                    className={emailError ? styles.error : undefined}
                    type="email"
                    name="email"
                    id="email"
                    value={email}
                  />
                </div>
                <div>
                  {emailError && (
                    <svg
                      width="800px"
                      height="800px"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M19.5 12C19.5 16.1421 16.1421 19.5 12 19.5C7.85786 19.5 4.5 16.1421 4.5 12C4.5 7.85786 7.85786 4.5 12 4.5C16.1421 4.5 19.5 7.85786 19.5 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM11.25 13.5V8.25H12.75V13.5H11.25ZM11.25 15.75V14.25H12.75V15.75H11.25Z"
                        fill="#080341"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                {emailError && (
                  <p className={styles.errorMessage}>Incorrect email format</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div>
              <label htmlFor="password">Password</label>
            </div>
            <div>
              <div>
                <div>
                  <input
                    onChange={handlePasswordChange}
                    onBlur={passwordMicroing ? undefined : handlePasswordBlur}
                    onFocus={() => {
                      setShowCriteria(true);
                    }}
                    className={passwordError ? styles.error : undefined}
                    type="password"
                    name="password"
                    id="password"
                    value={password}
                  />
                </div>
                <div>
                  {passwordError && (
                    <svg
                      width="800px"
                      height="800px"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M19.5 12C19.5 16.1421 16.1421 19.5 12 19.5C7.85786 19.5 4.5 16.1421 4.5 12C4.5 7.85786 7.85786 4.5 12 4.5C16.1421 4.5 19.5 7.85786 19.5 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM11.25 13.5V8.25H12.75V13.5H11.25ZM11.25 15.75V14.25H12.75V15.75H11.25Z"
                        fill="#080341"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                {passwordError && (
                  <p className={styles.errorMessage}>{passwordErrorMessage}</p>
                )}
              </div>
            </div>
          </div>

          {showCritera && (
            <div>
              <PasswordConditionsHelper
                errorCallback={specificPasswordError}
                updatedPassword={password}
              />
            </div>
          )}
          <div>
            <button type="submit" disabled={disableSubmission}>
              Sign Up!
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default SignUp;
