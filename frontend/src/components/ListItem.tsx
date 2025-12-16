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
  //const [isHolding, setIsHolding] = useState<boolean>(false);
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
      : {}; // we will conditionally render style and the draggable attributes. We could add a fake ID  but i don't won't to run useDraggable if i don't need it. Forcing TS to trust me that transform will be there, it can't see it cuz TS doesn't compare conditions outside the scope
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
          className={`${styles.itemValue} ${
            v.itemAdded && styles.itemChecked
          }`} /*${
          isHolding && styles.grabbing
        }`}*/
          //onMouseDown={() => setIsHolding(true)}
          //onDragEnd={() => setIsHolding(false)}
          //draggable="true"
          //onDragStart={(e) => handleDragStart(e, v)}
          //ref={setNodeRef}
          //{...attributes}
          //{...listeners}
          //style={style}
        >
          {v.value}
        </div>
      ) : (
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
      )}
    </li>
  );
};

export default ListItem;
