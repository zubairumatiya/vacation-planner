import { useNavigate, Link } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext.tsx";
import styles from "../styles/Login.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

const LoginPage = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [invalidLogin, setInvalidLogin] = useState(false);
  const [disableChanges, setDisableChanges] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataObj = Object.fromEntries(formData.entries()); // this makes our form fields into an obj like: {email: "...", password: "...", username: "..."}

    setDisableChanges(true);
    const start = Date.now();

    const res = await fetch(`${apiUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataObj),
    });
    const minDelay = 750;
    const elapsed = Date.now() - start;
    if (elapsed < minDelay) {
      await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
    }
    if (res.status === 401) {
      setDisableChanges(false);
      setInvalidLogin(true);
    } else if (res.status === 200) {
      const data = await res.json();
      if (data.token) {
        auth?.login(data.token);
        navigate("/");
      }
    }
  };

  const onSubmitClick = () => {
    //setDisableChanges(true);
  };

  return (
    <>
      <div>
        <h3 className="text-2xl mb-10">Sign In</h3>
      </div>
      <div>
        {invalidLogin && (
          <p className={styles.errorMessage}>username or password is invalid</p>
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
                className={invalidLogin ? styles.invalid : styles.normalInput}
                disabled={disableChanges}
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
                className={invalidLogin ? styles.invalid : styles.normalInput}
                disabled={disableChanges}
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={disableChanges}
              onClick={onSubmitClick}
              className={styles.button}
            >
              Login
            </button>
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
        <Link to="/send-reset-link-to-email">Forgot password?</Link>
      </div>
    </>
  );
};

export default LoginPage;
