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

    if (emailMicroing) {
      if (!isValidEmail(email)) {
        // yes this is necessary to check criteria onBlur (onChange will not trigger onBlur)
        setEmailError(true);
      } else {
        setEmailError(false);
      }
    }

    if (passwordMicroing) {
      if (password.length > 72) {
        setPasswordError(true);
      }

      if (!isValidPassword(password)) {
        setPasswordError(true);
        // we are using password error messages from two different sources. The red border and ! symbol with this, and the criteria with the pch child.
        //the setPasswordError is holding it together. I believe my regex is the same for both.
      } else {
        setPasswordError(false);
      }
    }
  }, [password, email, emailMicroing, passwordMicroing]);

  const handleFormSubmission = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataObj = Object.fromEntries(formData.entries()) as Record<
      string,
      string
    >; // this makes our form fields into an obj like: {email: "...", password: "...", username: "..."} AND the Record part is shortcut in ts to say: An object where every key is a string, and every value is also a string

    const res = await fetch(`${apiUrl}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataObj),
    });
    if (res.status !== 200) {
      if (res.status === 409) {
        const data = (await res.json()) as SignupResponse;
        setExistingUserError(`${data.message}`);
      } else if (res.status === 302) {
        const data = (await res.json()) as SignupResponse;
        alert(data.message);
        localStorage.setItem("pendingEmail", dataObj.email);
        navigate("/verify-email");
      } else {
        alert("error creating account - refresh and retry");
      }
    } else {
      localStorage.setItem("pendingEmail", dataObj.email);
      navigate("/verify-email");
    }
  };

  const handleEmailBlur = () => {
    setEmailMicroing(true);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value); // does this need prev?
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
  };

  const specificPasswordError = (message: string): void => {
    setPasswordErrorMessage(message);
  };

  return (
    <div className={styles.container}>
      <div>
        <h2>Let&apos;s get started!</h2>
      </div>
      <div>
        {existingUserError !== "" && (
          <p className={styles.errorMessage}>
            An account with this email already exist. Please{" "}
            <Link to="/login">log in</Link> or{" "}
            <Link to="/reset-password">reset your password</Link>
          </p>
        )}
      </div>
      <form onSubmit={handleFormSubmission} className={styles.form}>
        <div className={styles.formContainer}>
          <div className={styles.flContainer}>
            <div className={styles.fieldsContainer}>
              <div>
                <label htmlFor="firstName">First Name</label>
              </div>
              <div>
                <input
                  className={styles.field}
                  type="text"
                  name="firstName"
                  id="firstName"
                />
              </div>
            </div>
            <div className={styles.fieldsContainer}>
              <div>
                <label htmlFor="lastname">Last Name</label>
              </div>
              <div>
                <input
                  className={styles.field}
                  type="text"
                  name="lastName"
                  id="lastName"
                />
              </div>
            </div>
          </div>
          <div className={styles.peContainer}>
            <div className={styles.fieldsContainer}>
              <div>
                <label htmlFor="email">Email</label>
              </div>
              <div className={styles.peDiv}>
                <div className={styles.emailDiv}>
                  <input
                    onChange={handleEmailChange}
                    onBlur={emailMicroing ? undefined : handleEmailBlur}
                    className={`${styles.field} ${emailError && styles.error}`}
                    type="email"
                    name="email"
                    id="email"
                    value={email}
                  />
                  <div>
                    {emailError && (
                      <svg
                        className={styles.emailErrIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M19.5 12C19.5 16.1421 16.1421 19.5 12 19.5C7.85786 19.5 4.5 16.1421 4.5 12C4.5 7.85786 7.85786 4.5 12 4.5C16.1421 4.5 19.5 7.85786 19.5 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM11.25 13.5V8.25H12.75V13.5H11.25ZM11.25 15.75V14.25H12.75V15.75H11.25Z"
                          fill="red"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                <div>
                  {emailError && (
                    <p className={styles.errorMessage}>
                      Incorrect email format
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.fieldsContainer}>
              <div>
                <label htmlFor="password">Password</label>
              </div>
              <div className={styles.peDiv}>
                <div className={styles.passwordDiv}>
                  <input
                    onChange={handlePasswordChange}
                    onBlur={passwordMicroing ? undefined : handlePasswordBlur}
                    onFocus={() => {
                      setShowCriteria(true);
                    }}
                    className={`${styles.field} ${
                      passwordError ? styles.error : ""
                    }`}
                    type="password"
                    name="password"
                    id="password"
                    value={password}
                  />
                  <div>
                    {passwordError && (
                      <svg
                        className={styles.emailErrIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M19.5 12C19.5 16.1421 16.1421 19.5 12 19.5C7.85786 19.5 4.5 16.1421 4.5 12C4.5 7.85786 7.85786 4.5 12 4.5C16.1421 4.5 19.5 7.85786 19.5 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM11.25 13.5V8.25H12.75V13.5H11.25ZM11.25 15.75V14.25H12.75V15.75H11.25Z"
                          fill="red"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  {passwordError && (
                    <p className={styles.errorMessage}>
                      {passwordErrorMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {showCritera && (
              <div className={styles.conditionsParent}>
                <PasswordConditionsHelper
                  errorCallback={specificPasswordError}
                  updatedPassword={password}
                />
              </div>
            )}
          </div>
          <div>
            <button
              type="submit"
              disabled={disableSubmission}
              className={styles.submitButton}
            >
              Sign Up!
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SignUp;
