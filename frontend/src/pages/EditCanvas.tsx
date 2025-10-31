import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import MyMapComponent from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState } from "react";

const EditCanvas = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [loading2, setLoading2] = useState<boolean>(true);
  const [vp, setVp] = useState<null | Vp>(null);
  const [location, setLocation] = useState<string>("");
  const [gId, setGId] = useState<string>("");

  const gValuesFn = (vp: Vp, gLocation: string, gId: string) => {
    setVp(vp);
    setLocation(gLocation);
    setGId(gId);
  };

  return (
    <div className={styles.pageWrapper}>
      <EditVacationSchedule
        loadFirst={() => setLoading(false)}
        getMapValues={gValuesFn}
      />
      {!loading && <WantToSeeList loadSecond={() => setLoading2(false)} />}
      {!loading2 && (
        <MyMapComponent bounds={vp} startLocation={location} gId={gId} />
      )}
    </div>
  );
};

export default EditCanvas;
