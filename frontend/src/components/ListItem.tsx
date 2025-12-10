import styles from "../styles/WantToSee.module.css";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import CheckBubble from "./CheckBubble";

const ListItem = ({ v, i, editItem, handleCheckItem }: ListItemProps) => {
  //const [isHolding, setIsHolding] = useState<boolean>(false);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: v.id,
    data: { type: "list" } as DragData,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <li key={v.id} id={String(v.id)} className={`${styles.listItem}`}>
      <div
        className={styles.checkBubbleWrapper}
        onClick={(e) => handleCheckItem(e, v.itemAdded, v.id, i)}
      >
        <CheckBubble checked={v.itemAdded} />
      </div>
      <div
        onDoubleClick={(e) => editItem(e, i, v.id)}
        className={`${styles.itemValue} ${
          v.itemAdded && styles.itemChecked
        }`} /*${
          isHolding && styles.grabbing
        }`}*/
        //onMouseDown={() => setIsHolding(true)}
        //onDragEnd={() => setIsHolding(false)}
        //draggable="true"
        //onDragStart={(e) => handleDragStart(e, v)}
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
      >
        {v.value}
      </div>
    </li>
  );
};

export default ListItem;
