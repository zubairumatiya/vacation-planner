import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
const apiUrl = import.meta.env.VITE_API_URL;

const VerifyEmail = () => {
  const [resendLinkMessage, setResendLinkMessage] = useState(false);
  const [timer, setTimer] = useState("5"); // will change this to 300 in production and all the other 5 (should be like 4 of them)
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("verified") === "success") {
      navigate("/redirect", {
        state: { message: "Successfully verified! Redirecting to login..." },
      });
    }
  }, [location]);

  useEffect(() => {
    if (localStorage.getItem("resendTimer")) {
      console.log("our timer:", localStorage.getItem("resendTimer"));
      setTimer(localStorage.getItem("resendTimer") || "");
    } else {
      localStorage.setItem("resendTimer", "5");
      setTimer(localStorage.getItem("resendTimer") || "");
    }
    if (Number(timer) <= 0) {
      return;
    }
    const interval = setInterval(() => {
      let currentCount = Number(timer);
      currentCount = currentCount - 1;
      localStorage.setItem("resendTimer", String(currentCount));
      setTimer(String(currentCount));
    }, 1000);

    return () => clearInterval(interval); // cleanup
  }, [timer]);

  const clickResendLink = async () => {
    const email = localStorage.getItem("pendingEmail");
    console.log(email);
    const uhOh = "Uh oh, cannot complete this action. Please sign up again";
    if (email === null) {
      alert(uhOh);
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
      } else {
        const data = await res.json();
        if (res.status === 429) {
          alert(data.message);
        } else {
          alert(uhOh);
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
        {Number(timer) === 0 ? (
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
