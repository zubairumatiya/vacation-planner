import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "../styles/SignUp.module.css";
import { isValidEmail } from "../../../shared/emailUtils.ts";
import { isValidPassword } from "../../../shared/passwordUtils.ts";
import PasswordConditionsHelper from "../components/PasswordConditionsHelper.tsx";
import AvatarPicker from "../components/AvatarPicker.tsx";
import { getAvatarSrc } from "../utils/avatarUtils.ts";
import { hasGuestTrip } from "../utils/guestStorage.ts";
const apiUrl = import.meta.env.VITE_API_URL;

const isValidUsername = (username: string) =>
  /^[a-zA-Z0-9_]{3,30}$/.test(username) && /[a-zA-Z0-9]/.test(username);

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [usernameServerError, setUsernameServerError] = useState("");
  const [usernameMicroing, setUsernameMicroing] = useState(false);
  const [disableSubmission, setDisableSubmission] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailMicroing, setEmailMicroing] = useState(false);
  const [passwordMicroing, setPasswordMicroing] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showCritera, setShowCriteria] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [existingUserError, setExistingUserError] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarPage, setAvatarPage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isValidPassword(password) && isValidEmail(email) && isValidUsername(username)) {
      setDisableSubmission(false);
    } else {
      setDisableSubmission(true);
    }

    if (emailMicroing) {
      if (!isValidEmail(email)) {
        setEmailError(true);
      } else {
        setEmailError(false);
      }
    }

    if (usernameMicroing) {
      if (!isValidUsername(username)) {
        setUsernameError(true);
      } else {
        setUsernameError(false);
      }
    }

    if (passwordMicroing) {
      if (password.length > 72) {
        setPasswordError(true);
      }

      if (!isValidPassword(password)) {
        setPasswordError(true);
      } else {
        setPasswordError(false);
      }
    }
  }, [password, email, emailMicroing, passwordMicroing, username, usernameMicroing]);

  const checkUsernameAvailability = async () => {
    if (!isValidUsername(username)) {
      setUsernameError(true);
      return;
    }
    setUsernameChecking(true);
    try {
      const res = await fetch(`${apiUrl}/check-username?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profanity) {
          setUsernameServerError("Username contains inappropriate language");
        } else {
          setUsernameAvailable(data.available);
        }
      }
    } catch {
      // silent fail
    } finally {
      setUsernameChecking(false);
    }
  };

  const handleFormSubmission = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataObj = Object.fromEntries(formData.entries()) as Record<
      string,
      string
    >;
    if (avatar) dataObj.avatar = avatar;

    setIsSubmitting(true);
    setExistingUserError("");
    setUsernameServerError("");

    try {
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
          if (data.message.toLowerCase().includes("username")) {
            setUsernameServerError(data.message);
          } else {
            setExistingUserError(data.message);
          }
        } else if (res.status === 302) {
          const data = (await res.json()) as SignupResponse;
          alert(data.message);
          if (hasGuestTrip()) localStorage.setItem("migrateGuestTrip", "true");
          localStorage.setItem("pendingEmail", dataObj.email);
          navigate("/verify-email");
        } else if (res.status === 400) {
          const data = (await res.json()) as SignupResponse;
          if (data.message.toLowerCase().includes("username")) {
            setUsernameServerError(data.message);
          } else {
            alert(data.message || "error creating account - refresh and retry");
          }
        } else {
          alert("error creating account - refresh and retry");
        }
      } else {
        if (hasGuestTrip()) localStorage.setItem("migrateGuestTrip", "true");
        localStorage.setItem("pendingEmail", dataObj.email);
        navigate("/verify-email");
      }
    } catch {
      alert("Unable to connect. Check your internet and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailBlur = () => {
    setEmailMicroing(true);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordBlur = () => {
    setPasswordMicroing(true);
    if (!isValidPassword(password)) {
      setPasswordError(true);
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
      <div className={styles.card}>
        <h2 className={styles.title}>Let&apos;s get started!</h2>
        <p className={styles.subtitle}>Create your account</p>

        {existingUserError !== "" && (
          <div className={styles.errorBanner}>
            <svg
              className={styles.errorIcon}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M19.5 12C19.5 16.1421 16.1421 19.5 12 19.5C7.85786 19.5 4.5 16.1421 4.5 12C4.5 7.85786 7.85786 4.5 12 4.5C16.1421 4.5 19.5 7.85786 19.5 12ZM21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM11.25 13.5V8.25H12.75V13.5H11.25ZM11.25 15.75V14.25H12.75V15.75H11.25Z"
                fill="currentColor"
              />
            </svg>
            <span>
              An account with this email already exists. Please{" "}
              <Link to="/login">log in</Link> or{" "}
              <Link to="/send-reset-link-to-email">reset your password</Link>
            </span>
          </div>
        )}

        <form onSubmit={handleFormSubmission} noValidate>
          <div className={styles.avatarPickerRow}>
            <button
              type="button"
              className={styles.avatarCircle}
              onClick={() => setShowAvatarPicker(true)}
              disabled={isSubmitting}
            >
              <img src={getAvatarSrc(avatar)} alt="Avatar" />
              <span className={styles.avatarEditHint}>Pick</span>
            </button>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label htmlFor="firstName" className={styles.label}>
                First Name
              </label>
              <input
                className={styles.input}
                type="text"
                name="firstName"
                id="firstName"
                placeholder="John"
                autoComplete="given-name"
                disabled={isSubmitting}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="lastName" className={styles.label}>
                Last Name
              </label>
              <input
                className={styles.input}
                type="text"
                name="lastName"
                id="lastName"
                placeholder="Doe"
                autoComplete="family-name"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <div className={styles.usernameRow}>
              <input
                onChange={(e) => {
                  setUsername(e.target.value);
                  setUsernameAvailable(null);
                  if (usernameServerError) setUsernameServerError("");
                }}
                onBlur={() => setUsernameMicroing(true)}
                className={`${styles.input} ${usernameError || usernameServerError || usernameAvailable === false ? styles.inputError : ""}`}
                type="text"
                name="username"
                id="username"
                value={username}
                placeholder="letters, numbers, underscores"
                autoComplete="username"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className={styles.checkBtn}
                onClick={checkUsernameAvailability}
                disabled={!isValidUsername(username) || usernameChecking || isSubmitting}
              >
                {usernameChecking ? "..." : "Check"}
              </button>
            </div>
            {usernameError && (
              <p className={styles.fieldError}>
                3–30 characters: letters, numbers, underscores only
              </p>
            )}
            {usernameAvailable === true && (
              <p className={styles.fieldSuccess}>Username is available!</p>
            )}
            {usernameAvailable === false && (
              <p className={styles.fieldError}>Username is taken</p>
            )}
            {usernameServerError && (
              <p className={styles.fieldError}>{usernameServerError}</p>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              onChange={handleEmailChange}
              onBlur={emailMicroing ? undefined : handleEmailBlur}
              className={`${styles.input} ${emailError ? styles.inputError : ""}`}
              type="email"
              name="email"
              id="email"
              value={email}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isSubmitting}
            />
            {emailError && (
              <p className={styles.fieldError}>Incorrect email format</p>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              onChange={handlePasswordChange}
              onBlur={passwordMicroing ? undefined : handlePasswordBlur}
              onFocus={() => {
                setShowCriteria(true);
              }}
              className={`${styles.input} ${passwordError ? styles.inputError : ""}`}
              type="password"
              name="password"
              id="password"
              value={password}
              placeholder="Create a password"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {passwordError && passwordErrorMessage && (
              <p className={styles.fieldError}>{passwordErrorMessage}</p>
            )}
          </div>

          {showCritera && (
            <div className={styles.conditionsParent}>
              <PasswordConditionsHelper
                errorCallback={specificPasswordError}
                updatedPassword={password}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={disableSubmission || isSubmitting}
            className={styles.submitBtn}
          >
            {isSubmitting ? (
              <span className={styles.spinner} />
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className={styles.loginPrompt}>
          Already have an account?{" "}
          <Link to="/login" className={styles.loginLink}>
            Sign in
          </Link>
        </p>
      </div>
      {showAvatarPicker && (
        <AvatarPicker
          selected={avatar}
          onSelect={setAvatar}
          onClose={() => setShowAvatarPicker(false)}
          page={avatarPage}
          onPageChange={setAvatarPage}
        />
      )}
    </div>
  );
};

export default SignUp;
