import { useNavigate, Link } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext.tsx";
import styles from "../styles/Login.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

const LoginPage = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [invalidLogin, setInvalidLogin] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataObj = Object.fromEntries(formData.entries()); // this makes our form fields into an obj like: {email: "...", password: "...", username: "..."}

    const res = await fetch(`${apiUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataObj),
    });
    const data = await res.json();
    if (res.status === 401) {
      setInvalidLogin(true);
    } else if (res.status === 200) {
      if (data.token) {
        auth?.login(data.token);
        navigate("/home");
      }
    }
  };

  return (
    <>
      <div>
        <h3>Sign In</h3>
      </div>
      <div>
        {invalidLogin && (
          <p className={styles.errorMessage}>
            username or password was invalid
          </p>
        )}
      </div>
      <div>
        <form onSubmit={handleLogin}>
          <div>
            <div>
              <label htmlFor="email">Email</label>
            </div>
            <div>
              <input
                type="text"
                name="email"
                id="email"
                className={invalidLogin ? styles.invalid : undefined}
              />
            </div>
          </div>
          <div>
            <div>
              <label htmlFor="password">Password</label>
            </div>
            <div>
              <input
                type="password"
                name="password"
                id="password"
                className={invalidLogin ? styles.invalid : undefined}
              />
            </div>
          </div>
          <div>
            <button type="submit">Login</button>
          </div>
        </form>
      </div>
      <br />
      <div>
        <p>
          New here? <Link to="/signup">Sign up</Link>{" "}
        </p>
      </div>
      <div>
        <Link to="/reset-password">Forgot password?</Link>
      </div>
    </>
  );
};

export default LoginPage;
