import { useNavigate, Link } from "react-router-dom";

const LoginPage = () => {
  const handleLogin = () => {};

  return (
    <>
      <form onSubmit={handleLogin}>
        <label htmlFor="email">Email</label>
        <input type="text" name="email" id="email" />
        <label htmlFor="password">Password</label>
        <input type="password" name="password" id="password" />
        <button type="submit">Login</button>
      </form>
      <br />
      <Link to="/signup">New here? Sign up here!</Link>
      <Link to="/reset-password">Forgot password?</Link>
    </>
  );
};
