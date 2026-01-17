import styles from "../styles/WantToSee.module.css";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import CheckBubble from "./CheckBubble";

const ListItem = ({
  v,
  i,
  editItem,
  handleCheckItem,
  activeListId,
}: ListItemProps) => {
  const { attributes, listeners, setNodeRef, transform } =
    activeListId !== v.id
      ? useDraggable({
          id: v.id,
          data: { type: "list" } as DragData,
        })
      : {};
  const style =
    activeListId !== v.id
      ? {
          transform: CSS.Translate.toString(transform!),
        }
      : {};
  return (
    <li key={v.id} id={String(v.id)} className={`${styles.listItem}`}>
      <div
        className={styles.checkBubbleWrapper}
        onClick={(e) => handleCheckItem(e, v.itemAdded, v.id, i)}
      >
        <CheckBubble checked={v.itemAdded} />
      </div>
      {activeListId === v.id ? (
        <div
          onDoubleClick={(e) => editItem(e, i, v.id)}
          className={`${styles.itemValue} ${v.itemAdded && styles.itemChecked}`}
        >
          {v.value}
        </div>
      ) : (
        <div
          onDoubleClick={(e) => editItem(e, i, v.id)}
          className={`${styles.itemValue} ${v.itemAdded && styles.itemChecked}`}
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={style}
        >
          {v.value}
        </div>
      )}
    </li>
  );
};

export default ListItem;
