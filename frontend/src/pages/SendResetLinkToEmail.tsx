import { useNavigate } from "react-router-dom";
const apiUrl = import.meta.env.VITE_API_URL;

const SendResetLinkToEmail = () => {
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("enter");
    const formData = new FormData(e.currentTarget);
    const getEmail = formData.get("email");
    const email = typeof getEmail === "string" ? getEmail : "";

    await fetch(`${apiUrl}/send-password-reset-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    navigate("/reset-password-wait");
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <h2>Send password reset to email</h2>
        </div>
        <div>
          <label htmlFor="email">Email: </label>
        </div>
        <div>
          <input type="text" name="email" id="email" />
        </div>
        <div>
          <button type="submit">Send Reset Link</button>
        </div>
      </form>
    </div>
  );
};

export default SendResetLinkToEmail;
