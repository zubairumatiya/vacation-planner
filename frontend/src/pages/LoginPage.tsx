import { useNavigate, Link } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext.tsx";
import styles from "../styles/Login.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

const LoginPage = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const validate = (): boolean => {
    let valid = true;
    setEmailError("");
    setPasswordError("");
    setGeneralError("");

    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required");
      valid = false;
    }
    if (!valid) triggerShake();
    return valid;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setGeneralError("");

    const start = Date.now();

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const minDelay = 750;
      const elapsed = Date.now() - start;
      if (elapsed < minDelay) {
        await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
      }

      if (res.status === 401) {
        setGeneralError("Invalid email or password");
        triggerShake();
      } else if (res.ok) {
        const data = (await res.json()) as LoginResponse;
        if (data.token) {
          auth?.login(data.token);
          navigate("/");
          return;
        } else {
          setGeneralError("Something went wrong. Please try again.");
        }
      } else {
        setGeneralError("Something went wrong. Please try again.");
      }
    } catch {
      setGeneralError("Unable to connect. Check your internet and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Sign in to your account</p>

        {generalError && (
          <div className={`${styles.errorBanner} ${shake ? styles.shake : ""}`}>
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
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
          <div className={styles.fieldGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
                if (generalError) setGeneralError("");
              }}
              className={`${styles.input} ${emailError ? styles.inputError : ""}`}
              disabled={isSubmitting}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {emailError && (
              <p className={styles.fieldError}>{emailError}</p>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
                if (generalError) setGeneralError("");
              }}
              className={`${styles.input} ${passwordError ? styles.inputError : ""}`}
              disabled={isSubmitting}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            {passwordError && (
              <p className={styles.fieldError}>{passwordError}</p>
            )}
          </div>

          <div className={styles.forgotRow}>
            <Link to="/send-reset-link-to-email" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitBtn}
          >
            {isSubmitting ? (
              <span className={styles.spinner} />
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className={styles.signupPrompt}>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className={styles.signupLink}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
