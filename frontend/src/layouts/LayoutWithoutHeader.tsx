import { Outlet } from "react-router-dom";
import SimpleHeader from "../pages/SimpleHeader";
import styles from "../styles/LayoutWithoutHeader.module.css";

const LayoutWithoutHeader = () => {
  return (
    <div className={styles.body}>
      <div>
        <SimpleHeader />
      </div>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default LayoutWithoutHeader;
