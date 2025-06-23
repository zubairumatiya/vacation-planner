const apiUrl = import.meta.env.VITE_API_URL;

const SendResetLinkToEmail = () => {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const res = await fetch("/send-password-reset-link");
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
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
