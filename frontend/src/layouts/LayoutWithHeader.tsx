import Header from "../pages/Header.tsx";
import { Outlet } from "react-router-dom";
import styles from "../styles/LayoutWithHeader.module.css";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.tsx";
import { TripRefreshContext, useTripRefreshProvider } from "../context/TripRefreshContext.tsx";

const LayoutWithHeader = () => {
  const auth = useContext(AuthContext);
  const loggingOutRef = auth?.loggingOutRef;
  const tripRefresh = useTripRefreshProvider();
  return (
    loggingOutRef?.current === false && (
      <TripRefreshContext.Provider value={tripRefresh}>
        <div className={styles.body}>
          <div>
            <Header />
          </div>
          <div>
            {!auth?.token && (
              <h1 className={`${styles.signInWarning} my-4 p-2`}>
                WARNING: You are not signed in, your vacation planning will not be
                saved!
              </h1>
            )}
          </div>
          <main className={auth?.token ? styles.main : styles.mainWithWarning}>
            <Outlet />
          </main>
        </div>
      </TripRefreshContext.Provider>
    )
  );
};

export default LayoutWithHeader;
