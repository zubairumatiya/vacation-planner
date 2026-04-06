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
  const [urlBannerError, setUrlBannerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarPage, setAvatarPage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("err") === "verification-expired-username-taken") {
      setUrlBannerError(
        "Your verification link expired and your username was claimed by someone else. Please sign up with a new username.",
      );
    }
  }, []);

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

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if ((e.relatedTarget as HTMLElement)?.classList.contains(styles.checkBtn)) return;
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

        {urlBannerError && (
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
            <span>{urlBannerError}</span>
          </div>
        )}

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
              onBlur={emailMicroing ? undefined : (e) => handleEmailBlur(e)}
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
            <div className={styles.passwordWrapper}>
              <input
                onChange={handlePasswordChange}
                onBlur={passwordMicroing ? undefined : handlePasswordBlur}
                onFocus={() => {
                  setShowCriteria(true);
                }}
                className={`${styles.input} ${passwordError ? styles.inputError : ""}`}
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                value={password}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className={styles.eyeToggle}
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1.1rem" height="1.1rem">
                    <path fillRule="evenodd" clipRule="evenodd" d="M22 12.0002C20.2531 15.5764 15.8775 19 11.9998 19C8.12201 19 3.74646 15.5764 2 11.9998" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M22 12.0002C20.2531 8.42398 15.8782 5 12.0005 5C8.1227 5 3.74646 8.42314 2 11.9998" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="1.1rem" height="1.1rem">
                    <path d="M2.68936 6.70456C2.52619 6.32384 2.08528 6.14747 1.70456 6.31064C1.32384 6.47381 1.14747 6.91472 1.31064 7.29544L2.68936 6.70456ZM15.5872 13.3287L15.3125 12.6308L15.5872 13.3287ZM9.04145 13.7377C9.26736 13.3906 9.16904 12.926 8.82185 12.7001C8.47466 12.4742 8.01008 12.5725 7.78417 12.9197L9.04145 13.7377ZM6.37136 15.091C6.14545 15.4381 6.24377 15.9027 6.59096 16.1286C6.93815 16.3545 7.40273 16.2562 7.62864 15.909L6.37136 15.091ZM22.6894 7.29544C22.8525 6.91472 22.6762 6.47381 22.2954 6.31064C21.9147 6.14747 21.4738 6.32384 21.3106 6.70456L22.6894 7.29544ZM19 11.1288L18.4867 10.582V10.582L19 11.1288ZM19.9697 13.1592C20.2626 13.4521 20.7374 13.4521 21.0303 13.1592C21.3232 12.8663 21.3232 12.3914 21.0303 12.0985L19.9697 13.1592ZM11.25 16.5C11.25 16.9142 11.5858 17.25 12 17.25C12.4142 17.25 12.75 16.9142 12.75 16.5H11.25ZM16.3714 15.909C16.5973 16.2562 17.0619 16.3545 17.409 16.1286C17.7562 15.9027 17.8545 15.4381 17.6286 15.091L16.3714 15.909ZM5.53033 11.6592C5.82322 11.3663 5.82322 10.8914 5.53033 10.5985C5.23744 10.3056 4.76256 10.3056 4.46967 10.5985L5.53033 11.6592ZM2.96967 12.0985C2.67678 12.3914 2.67678 12.8663 2.96967 13.1592C3.26256 13.4521 3.73744 13.4521 4.03033 13.1592L2.96967 12.0985ZM12 13.25C8.77611 13.25 6.46133 11.6446 4.9246 9.98966C4.15645 9.16243 3.59325 8.33284 3.22259 7.71014C3.03769 7.3995 2.90187 7.14232 2.8134 6.96537C2.76919 6.87696 2.73689 6.80875 2.71627 6.76411C2.70597 6.7418 2.69859 6.7254 2.69411 6.71533C2.69187 6.7103 2.69036 6.70684 2.68957 6.70503C2.68917 6.70413 2.68896 6.70363 2.68892 6.70355C2.68891 6.70351 2.68893 6.70357 2.68901 6.70374C2.68904 6.70382 2.68913 6.70403 2.68915 6.70407C2.68925 6.7043 2.68936 6.70456 2 7C1.31064 7.29544 1.31077 7.29575 1.31092 7.29609C1.31098 7.29624 1.31114 7.2966 1.31127 7.2969C1.31152 7.29749 1.31183 7.2982 1.31218 7.299C1.31287 7.30062 1.31376 7.30266 1.31483 7.30512C1.31698 7.31003 1.31988 7.31662 1.32353 7.32483C1.33083 7.34125 1.34115 7.36415 1.35453 7.39311C1.38127 7.45102 1.42026 7.5332 1.47176 7.63619C1.57469 7.84206 1.72794 8.13175 1.93366 8.47736C2.34425 9.16716 2.96855 10.0876 3.8254 11.0103C5.53867 12.8554 8.22389 14.75 12 14.75V13.25ZM15.3125 12.6308C14.3421 13.0128 13.2417 13.25 12 13.25V14.75C13.4382 14.75 14.7246 14.4742 15.8619 14.0266L15.3125 12.6308ZM7.78417 12.9197L6.37136 15.091L7.62864 15.909L9.04145 13.7377L7.78417 12.9197ZM22 7C21.3106 6.70456 21.3107 6.70441 21.3108 6.70427C21.3108 6.70423 21.3108 6.7041 21.3109 6.70402C21.3109 6.70388 21.311 6.70376 21.311 6.70368C21.3111 6.70352 21.3111 6.70349 21.3111 6.7036C21.311 6.7038 21.3107 6.70452 21.3101 6.70576C21.309 6.70823 21.307 6.71275 21.3041 6.71924C21.2983 6.73223 21.2889 6.75309 21.2758 6.78125C21.2495 6.83757 21.2086 6.92295 21.1526 7.03267C21.0406 7.25227 20.869 7.56831 20.6354 7.9432C20.1669 8.69516 19.4563 9.67197 18.4867 10.582L19.5133 11.6757C20.6023 10.6535 21.3917 9.56587 21.9085 8.73646C22.1676 8.32068 22.36 7.9668 22.4889 7.71415C22.5533 7.58775 22.602 7.48643 22.6353 7.41507C22.6519 7.37939 22.6647 7.35118 22.6737 7.33104C22.6782 7.32097 22.6818 7.31292 22.6844 7.30696C22.6857 7.30398 22.6867 7.30153 22.6876 7.2996C22.688 7.29864 22.6883 7.29781 22.6886 7.29712C22.6888 7.29677 22.6889 7.29646 22.689 7.29618C22.6891 7.29604 22.6892 7.29585 22.6892 7.29578C22.6893 7.29561 22.6894 7.29544 22 7ZM18.4867 10.582C17.6277 11.3882 16.5739 12.1343 15.3125 12.6308L15.8619 14.0266C17.3355 13.4466 18.5466 12.583 19.5133 11.6757L18.4867 10.582ZM18.4697 11.6592L19.9697 13.1592L21.0303 12.0985L19.5303 10.5985L18.4697 11.6592ZM11.25 14V16.5H12.75V14H11.25ZM14.9586 13.7377L16.3714 15.909L17.6286 15.091L16.2158 12.9197L14.9586 13.7377ZM4.46967 10.5985L2.96967 12.0985L4.03033 13.1592L5.53033 11.6592L4.46967 10.5985Z" fill="currentColor" />
                  </svg>
                )}
              </button>
            </div>
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
