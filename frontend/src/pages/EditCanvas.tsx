import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import MyMapComponent from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState } from "react";

const EditCanvas = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [loading2, setLoading2] = useState<boolean>(true);
  const [point, setPoint] = useState<null | Point>(null);
  const [location, setLocation] = useState<string>("");
  const [gId, setGId] = useState<string>("");

  const gValueFn = (point: Point, gLocation: string, gId: string) => {
    setPoint(point);
    setLocation(gLocation);
    setGId(gId);
  };

  return (
    <div className={styles.pageWrapper}>
      <EditVacationSchedule
        loadFirst={() => setLoading(false)}
        getMapValues={gValueFn}
      />
      {!loading && <WantToSeeList loadSecond={() => setLoading2(false)} />}
      {!loading2 && (
        <MyMapComponent center={point} startLocation={location} gId={gId} />
      )}
    </div>
  );
};

export default EditCanvas;
