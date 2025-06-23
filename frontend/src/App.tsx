import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./pages/Header.tsx";
import Home from "./pages/Home.tsx";
import AddVacation from "./pages/AddVacation.tsx";
import "./styles/App.css";
import VerifyEmail from "./pages/VerifyEmail.tsx";
import RedirectPage from "./pages/RedirectPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignUp from "./pages/SignUp.tsx";
import SendResetLinkToEmail from "./pages/SendResetLinkToEmail.tsx";
import ResetPasswordWait from "./pages/ResetPasswordWait.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add-vacation" element={<AddVacation />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="/redirect" element={<RedirectPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="send-reset-link-to-email"
            element={<SendResetLinkToEmail />}
          />
          <Route path="reset-password-wait" element={<ResetPasswordWait />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
