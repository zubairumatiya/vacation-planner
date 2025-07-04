import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import styles from "../styles/SendResetLinkToEmail.module.css";
const apiUrl = import.meta.env.VITE_API_URL;

const SendResetLinkToEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [autoEmail, setAutoEmail] = useState("");

  const params = new URLSearchParams(location.search);
  const err = params.get("err");

  console.log("err", err);

  useEffect(() => {
    const queryEmail = params.get("email"); // can move this inside since it wont dynamically need to run
    console.log("email", queryEmail);
    if (queryEmail) {
      setAutoEmail(queryEmail);
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const getEmail = formData.get("email");
    const email = typeof getEmail === "string" ? getEmail : "";

    await fetch(`${apiUrl}/send-password-reset-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    navigate("/reset-password-wait");
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <h2>Send password reset to email</h2>
        </div>
        {err && (
          <p className={styles.errorMessage}>
            Error validating reset - please resubmit email
          </p>
        )}
        <div>
          <label htmlFor="email">Email: </label>
        </div>
        <div>
          <input
            type="text"
            name="email"
            id="email"
            value={autoEmail}
            onChange={(e) => setAutoEmail(e.target.value)}
          />
        </div>
        <div>
          <button type="submit">Send Reset Link</button>
        </div>
      </form>
    </div>
  );
};

export default SendResetLinkToEmail;
