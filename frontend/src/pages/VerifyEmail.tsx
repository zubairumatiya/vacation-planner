import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
const apiUrl = import.meta.env.VITE_API_URL;

const VerifyEmail = () => {
  const [resendLinkMessage, setResendLinkMessage] = useState(false);
  const [timer, setTimer] = useState("5"); // will change this to 300 in production and all the other 5 (should be like 4 of them)
  const [nonRefreshTimeRestart, setNonRefreshTimeRestart] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("verified") === "success") {
      navigate("/redirect", {
        state: { message: "123" },
      });
    }
  }, [location]);

  useEffect(() => {
    const storedTime = localStorage.getItem("resendTimer");
    if (storedTime !== null) {
      setTimer(storedTime);
    } else {
      localStorage.setItem("resendTimer", "5");
      setTimer("5");
    }
  }, []);

  useEffect(() => {
    if (Number(timer) <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (Number(prev) <= 1) {
          clearInterval(interval);
        }
        const next = String(Number(prev) - 1);
        localStorage.setItem("resendTimer", next);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval); // cleanup
  }, [nonRefreshTimeRestart]);

  const clickResendLink = async () => {
    const email = localStorage.getItem("pendingEmail");
    const uhOh = "Uh oh, cannot complete this action. Please sign up again";
    if (email === null) {
      alert(uhOh);
      navigate("/login");
    } else {
      const res = await fetch(`${apiUrl}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 200) {
        setResendLinkMessage(true);
        localStorage.setItem("resendTimer", "5");
        setTimer("5");
        setNonRefreshTimeRestart((prev) => !prev);
      } else {
        if (res.status === 429) {
          const data = (await res.json()) as ApiErrorResponse;
          alert(data.message);
        } else {
          alert(uhOh);
          navigate("/login");
        }
      }
    }
  };

  return (
    <>
      {resendLinkMessage && <p>Link resent check email please</p>}
      <h2> We have sent a verification link to your email. </h2>
      <p>
        Can&apos;t find email? Resend link here:{" "}
        {Number(timer) <= 0 ? (
          <Link to="/verify-email" onClick={clickResendLink}>
            Link
          </Link>
        ) : (
          timer
        )}{" "}
      </p>
    </>
  );
};

export default VerifyEmail;
