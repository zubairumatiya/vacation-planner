import Header from "../pages/Header.tsx";
import { Outlet, Link } from "react-router-dom";
import styles from "../styles/LayoutWithHeader.module.css";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext.tsx";
import {
  TripRefreshContext,
  useTripRefreshProvider,
} from "../context/TripRefreshContext.tsx";

const LayoutWithHeader = () => {
  const auth = useContext(AuthContext);
  const loggingOutRef = auth?.loggingOutRef;
  const tripRefresh = useTripRefreshProvider();
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem("guestBannerDismissed") === "true",
  );

  const dismissBanner = () => {
    setBannerDismissed(true);
    sessionStorage.setItem("guestBannerDismissed", "true");
  };

  return (
    loggingOutRef?.current === false && (
      <TripRefreshContext.Provider value={tripRefresh}>
        <div className={styles.body}>
          <div>
            <Header />
          </div>
          {!auth?.token && !bannerDismissed && (
            <div className={styles.signInWarning}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.warningIcon}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className={styles.warningText}>
                Heads up: Trips created without an account are stored only in
                your browser and won’t be available on other devices. Data may
                be lost if you clear your browser cache.
              </span>
              <div className={styles.warningActions}>
                <Link to="/signup" className={styles.warningSignUp}>
                  Sign Up
                </Link>
                <Link to="/login" className={styles.warningLogIn}>
                  Log In
                </Link>
              </div>
              <button
                type="button"
                className={styles.warningDismiss}
                onClick={dismissBanner}
                aria-label="Dismiss"
              >
                &times;
              </button>
            </div>
          )}
          <main className={auth?.token ? styles.main : styles.mainWithWarning}>
            <Outlet />
          </main>
        </div>
      </TripRefreshContext.Provider>
    )
  );
};

export default LayoutWithHeader;
