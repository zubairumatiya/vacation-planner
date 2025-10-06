import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import Map from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState, useEffect } from "react";

const EditCanvas = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [loading2, setLoading2] = useState<boolean>(true);

  useEffect(() => {
    console.log("loading2");
  }, [loading2]);

  return (
    <div className={styles.pageWrapper}>
      <EditVacationSchedule loadFirst={() => setLoading(false)} />
      {!loading && <WantToSeeList loadSecond={() => setLoading2(false)} />}
      {!loading2 && <Map />}
    </div>
  );
};

export default EditCanvas;
