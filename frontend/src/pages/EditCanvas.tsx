import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import MyMapComponent from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState } from "react";

const EditCanvas = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [loading2, setLoading2] = useState<boolean>(true);

  return (
    <div className={styles.pageWrapper}>
      <EditVacationSchedule loadFirst={() => setLoading(false)} />
      {!loading && <WantToSeeList loadSecond={() => setLoading2(false)} />}
      {!loading2 && <MyMapComponent />}
    </div>
  );
};

export default EditCanvas;
