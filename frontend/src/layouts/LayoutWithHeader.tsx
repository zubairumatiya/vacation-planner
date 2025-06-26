import Header from "../pages/Header.tsx";
import { Outlet } from "react-router-dom";
import styles from "../styles/LayoutWithHeader.module.css";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.tsx";

const LayoutWithHeader = () => {
  const auth = useContext(AuthContext);
  return (
    <div className={styles.body}>
      <div>
        <Header />
      </div>
      <div>
        {!auth?.token && (
          <h1 className={styles.signInWarning}>
            WARNING: You are not signed in, your vacation planning will not be
            saved!
          </h1>
        )}
      </div>
      <main className={auth?.token ? styles.main : styles.mainWithWarning}>
        <Outlet />
      </main>
    </div>
  );
};

export default LayoutWithHeader;
