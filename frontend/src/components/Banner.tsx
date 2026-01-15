import styles from "../styles/EditCanvas.module.css";
import clearCircle from "../assets/clear-circle.svg";
import Overwrite from "./Overwrite";

export default function Banner({
  bannerMsg,
  holdOverwrite,
  handleOverwrite,
  clearOverwriteBanner,
}: {
  bannerMsg: string | null;
  holdOverwrite: Schedule | null;
  handleOverwrite: (e: React.MouseEvent) => Promise<void>;
  clearOverwriteBanner: (e?: React.MouseEvent) => void;
}) {
  return (
    <div className={`${styles.bannerAndOverwrite}`}>
      <div className={styles.clearBnO}>
        <button className={styles.clearButton} onClick={clearOverwriteBanner}>
          <img src={clearCircle} alt="clearCircle" />
        </button>
      </div>
      <div className={styles.banner}>
        {bannerMsg && <div className={styles.bannerMsg}>{bannerMsg}</div>}
      </div>
      <div className={styles.timerBar}></div>
      {holdOverwrite && (
        <Overwrite
          holdOverwrite={holdOverwrite}
          handleOverwrite={handleOverwrite}
        />
      )}
    </div>
  );
}
