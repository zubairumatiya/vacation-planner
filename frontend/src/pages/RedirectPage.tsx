import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "../styles/Redirect.module.css";

const RedirectPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const message = location.state?.message;
  const [verificationMessage, setVerificationMessage] = useState(false);
  if (message.startsWith("123")) {
    setVerificationMessage(true);
  }

  useEffect(() => {
    const timerId = setTimeout(() => {
      navigate("/login");
    }, 2000);
    return () => clearTimeout(timerId);
  }, [navigate]);

  return verificationMessage ? (
    <p>
      <span className={styles.verifMessage}>Successfully verified!</span>
      Redirecting to login...
    </p>
  ) : (
    <p>{message}</p>
  );
};

export default RedirectPage;
