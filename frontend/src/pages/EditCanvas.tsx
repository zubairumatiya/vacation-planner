import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import styles from "../styles/EditCanvas.module.css";
import { useState } from "react";

const EditCanvas = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const holdOffLoading = () => {
    setLoading(false);
    return;
  };
  return (
    <div className={styles.pageWrapper}>
      <EditVacationSchedule loadFirst={() => holdOffLoading()} />
      {!loading && <WantToSeeList />}
    </div>
  );
};

export default EditCanvas;
