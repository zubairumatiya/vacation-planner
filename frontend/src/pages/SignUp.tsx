import { useState } from "react";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [disableSubmission, setDisableSubmission] = useState(true);

  const handleFormSubmission = () => {};

  const handleEmailChange = () => {};

  const handleConfirmationEmailChange = () => {};

  const handleConfirmationEmailBlur = () => {};

  const handlePasswordChange = () => {};

  const handleConfirmationPasswordChange = () => {};

  const handleConfirmationPasswordBlur = () => {};

  return (
    <>
      <h2>Welcome!</h2>
      <form onSubmit={handleFormSubmission}>
        <label htmlFor="firstName">First Name</label>
        <input type="text" name="firstName" id="firstName" />

        <label htmlFor="lastname">Last Name</label>
        <input type="text" name="lastName" id="lastName" />

        <label htmlFor="email">Email</label>
        <input
          onChange={handleEmailChange}
          type="text"
          name="email"
          id="email"
          value={email}
        />

        <label htmlFor="confirmEmail">Confirm Email</label>
        <input
          onChange={handleConfirmationEmailChange}
          onBlur={handleConfirmationEmailBlur}
          type="text"
          name="confirmEmail"
          id="confirmEmail"
          value={confirmEmail}
        />

        <label htmlFor="password">Password</label>
        <input
          onChange={handlePasswordChange}
          type="password"
          name="password"
          id="password"
          value={password}
        />

        <label htmlFor="confirmpassword">Confirm Password</label>
        <input
          onChange={handleConfirmationPasswordChange}
          onBlur={handleConfirmationPasswordBlur}
          type="password"
          name="confirmPassword"
          id="confirmPassword"
          value={confirmPassword}
        />

        <button type="submit" disabled={disableSubmission}>
          Sign Up!
        </button>
      </form>
    </>
  );
};
