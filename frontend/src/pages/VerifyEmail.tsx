import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";

const VerifyEmail = () => {
  const [resendLinkMessage, setResendLinkMessage] = useState(false);
  const [timer, setTimer] = useState("300");
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
      setTimer(localStorage.getItem("resendTimer") || "");
    } else {
      localStorage.setItem("resendTimer", "300");
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

  return (
    <>
      {resendLinkMessage && <p>Link resent check email please</p>}
      <h2>
        {" "}
        We have sent a verification link to your email. Please verify yourself
        to login.{" "}
      </h2>
      <p>
        Can&apos;t find email? Resend link here:{" "}
        {Number(timer) === 0 ? (
          <Link
            to="/verify-email"
            onClick={() => setResendLinkMessage(true)}
          ></Link>
        ) : (
          timer
        )}{" "}
      </p>
    </>
  );
};

export default VerifyEmail;
