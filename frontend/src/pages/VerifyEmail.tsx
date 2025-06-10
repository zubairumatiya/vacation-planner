import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const VerifyEmail = () => {
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
  return (
    <h2>
      {" "}
      We have sent a verification link to your email. Please verify yourself to
      login.{" "}
    </h2>
  );
};

export default VerifyEmail;
