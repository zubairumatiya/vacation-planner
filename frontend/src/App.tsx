import { BrowserRouter, Routes, Route } from "react-router-dom";
import LayoutWithHeader from "./layouts/LayoutWithHeader.tsx";
import LayoutWithoutHeader from "./layouts/LayoutWithoutHeader.tsx";
import { useState, lazy, Suspense } from "react";
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
const VacationSchedule = lazy(() => import("./pages/VacationSchedule.tsx"));
import VacationInfo from "./pages/VacationInfo.tsx";
const EditCanvas = lazy(() => import("./pages/EditCanvas.tsx"));
import ViewVacationSchedule from "./pages/ViewVacationSchedule.tsx";
import Test from "./components/Test.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import UserProfilePage from "./pages/UserProfilePage.tsx";
import CountryDetailPage from "./pages/CountryDetailPage.tsx";
const WorldMapPage = lazy(() => import("./pages/WorldMapPage.tsx"));
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./components/ErrorFallback.tsx";
import RequireAuth from "./pages/RequireAuth.tsx";
import GoogleOAuthCallback from "./pages/GoogleOAuthCallback.tsx";

function App() {
  const [costTotal, setCostTotal] = useState(0);
  const [editRetries, setEditRetries] = useState(0);
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="loading-screen" style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: "#2fe782", backgroundColor: "#242424" }}>Loading...</div>}>
        <Routes>
          <Route element={<RequireAuth />}>
          <Route element={<LayoutWithHeader />}>
            <Route path="/" element={<Home />} />
            <Route path="/add-vacation" element={<AddVacation />} />
            <Route path="/world-map/:userId" element={<WorldMapPage />} />
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
              <Route path="info" element={<VacationInfo />} />
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
                    }}
                  >
                    <EditCanvas setCostTotal={setCostTotal} />
                  </ErrorBoundary>
                }
              />
            </Route>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/user/:userId" element={<UserProfilePage />} />
            <Route path="/user/:userId/country/:userCountryId" element={<CountryDetailPage />} />
            <Route path="/test" element={<Test />} />
          </Route>
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
          <Route
            path="/auth/google/callback"
            element={<GoogleOAuthCallback />}
          />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
