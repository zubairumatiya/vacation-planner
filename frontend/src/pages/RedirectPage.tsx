import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const RedirectPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const message = location.state?.message;

  useEffect(() => {
    const timerId = setTimeout(() => {
      navigate("/login");
    }, 2000);
    return () => clearTimeout(timerId);
  }, [navigate]);

  return <p>{message}</p>;
};

export default RedirectPage;
