import { useNavigate, Link } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext.tsx";
import styles from "../styles/Login.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

const LoginPage = () => {
  //const auth = useContext(AuthContext);
  //const token = auth?.token;
  const navigate = useNavigate();
  const [invalidLogin, setInvalidLogin] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const dataObj = Object.fromEntries(formData.entries()); // this makes our form fields into an obj like: {email: "...", password: "...", username: "..."}

    const res = await fetch(`${apiUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        //Authorization: `Bearer ${token}`, ---> why do we have this?? I think we should be setting the token here not sending it, this needs a redo
      },
      body: JSON.stringify(dataObj),
    });
    if (res.status === 401) {
      setInvalidLogin(true);
    } else if (res.status === 200) navigate("/home");
  };

  return (
    <>
      <h3>Sign In</h3>
      {invalidLogin && (
        <p className={styles.errorMessage}>username or password was invalid</p>
      )}
      <form onSubmit={handleLogin}>
        <label htmlFor="email">Email</label>
        <input
          type="text"
          name="email"
          id="email"
          className={invalidLogin ? styles.invalid : undefined}
        />
        <label htmlFor="password">Password</label>
        <input
          type="password"
          name="password"
          id="password"
          className={invalidLogin ? styles.invalid : undefined}
        />
        <button type="submit">Login</button>
      </form>
      <br />
      <Link to="/signup">New here? Sign up here!</Link>
      <Link to="/reset-password">Forgot password?</Link>
    </>
  );
};

export default LoginPage;
