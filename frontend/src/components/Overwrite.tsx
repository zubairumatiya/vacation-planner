import styles from "../styles/EditCanvas.module.css";

export default function Overwrite({
  holdOverwrite,
  handleOverwrite,
}: {
  holdOverwrite: Schedule | null;
  handleOverwrite: (e: React.MouseEvent) => Promise<void>;
}) {
  return (
    <div className={styles.overwrite}>
      {
        holdOverwrite && (
          <button className={styles.overwriteButton} onClick={handleOverwrite}>
            Overwrite change?
          </button>
        ) /* can add a way to do 500 status retries later */
      }
    </div>
  );
}
