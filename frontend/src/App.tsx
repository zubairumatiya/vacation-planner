import { BrowserRouter, Routes, Route } from "react-router-dom";
import LayoutWithHeader from "./layouts/LayoutWithHeader.tsx";
import LayoutWithoutHeader from "./layouts/LayoutWithoutHeader.tsx";
import { AuthContext } from "./context/AuthContext.tsx";
import { useContext } from "react";
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
import VacationSchedule from "./pages/VacationSchedule.tsx";
import Test from "./components/Test.tsx";

function App() {
  const auth = useContext(AuthContext);
  if (auth?.loggingOut) return null;
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LayoutWithHeader />}>
          <Route path="/" element={<Home />} />
          <Route path="/add-vacation" element={<AddVacation />} />
          <Route path="/vacation/:tripId" element={<VacationSchedule />} />
          <Route path="/test" element={<Test />} />
        </Route>

        <Route element={<LayoutWithoutHeader />}>
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="/redirect" element={<RedirectPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/send-reset-link-to-email"
            element={<SendResetLinkToEmail />}
          />
          <Route path="/reset-password-wait" element={<ResetPasswordWait />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
