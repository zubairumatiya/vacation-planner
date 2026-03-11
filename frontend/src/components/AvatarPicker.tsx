import styles from "../styles/AvatarPicker.module.css";

const avatarFiles = import.meta.glob("../assets/avatars/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const avatars = Object.entries(avatarFiles)
  .map(([path, src]) => {
    const filename = path.split("/").pop()!;
    return { filename, src };
  })
  .sort((a, b) => a.filename.localeCompare(b.filename));

const PAGE_SIZE = 20;

interface AvatarPickerProps {
  selected: string | null;
  onSelect: (filename: string) => void;
  onClose: () => void;
  page: number;
  onPageChange: (page: number) => void;
}

const AvatarPicker = ({ selected, onSelect, onClose, page, onPageChange }: AvatarPickerProps) => {
  const totalPages = Math.ceil(avatars.length / PAGE_SIZE);
  const pageAvatars = avatars.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span>Choose your avatar</span>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &#x2715;
          </button>
        </div>
        <div className={styles.grid}>
          {pageAvatars.map((a) => (
            <button
              key={a.filename}
              type="button"
              className={`${styles.avatarBtn} ${selected === a.filename ? styles.avatarSelected : ""}`}
              onClick={() => {
                onSelect(a.filename);
                onClose();
              }}
            >
              <img src={a.src} alt={a.filename} />
            </button>
          ))}
        </div>
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              className={styles.pageBtn}
            >
              &larr;
            </button>
            <span className={styles.pageInfo}>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages - 1}
              onClick={() => onPageChange(page + 1)}
              className={styles.pageBtn}
            >
              &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarPicker;

export { avatars };
