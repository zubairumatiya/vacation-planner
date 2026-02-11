import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LayoutWithHeader from "./layouts/LayoutWithHeader.tsx";
import LayoutWithoutHeader from "./layouts/LayoutWithoutHeader.tsx";
import { AuthContext } from "./context/AuthContext.tsx";
import { useContext, useState } from "react";
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
import EditCanvas from "./pages/EditCanvas.tsx";
import ViewVacationSchedule from "./pages/ViewVacationSchedule.tsx";
import Test from "./components/Test.tsx";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./components/ErrorFallback.tsx";

function App() {
  const [costTotal, setCostTotal] = useState(0);
  const auth = useContext(AuthContext);

  const [editRetries, setEditRetries] = useState(0);
  if (auth?.loggingOut) {
    return <Navigate to="/login" replace />;
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<LayoutWithHeader />}>
          <Route path="/" element={<Home />} />
          <Route path="/add-vacation" element={<AddVacation />} />
          <Route
            path="/vacation/:tripId"
            element={
              <VacationSchedule
                setCostTotal={setCostTotal}
                costTotal={costTotal}
              />
            }
          >
            <Route index element={<ViewVacationSchedule />} />
            <Route
              path="edit"
              element={
                <ErrorBoundary
                  fallbackRender={(fallbackProps) => (
                    <ErrorFallback
                      {...fallbackProps}
                      retryCount={editRetries}
                    />
                  )}
                  onReset={() => {
                    setEditRetries((prev) => prev + 1);
                    console.log("Resetting state...");
                  }}
                >
                  <EditCanvas setCostTotal={setCostTotal} />
                </ErrorBoundary>
              }
            />
          </Route>
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
