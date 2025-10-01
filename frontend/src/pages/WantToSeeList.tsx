import styles from "../styles/WantToSee.module.css";
import { useState, useRef, useEffect } from "react";

const WantToSeeList = () => {
  const [list, setList] = useState<string[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [newItemSwitch, setNewItemSwitch] = useState<boolean>(true);
  const [editItemId, setEditItemId] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [newItemSwitch, editItemId]);

  const handleSubmitItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = formData.get("newItem");
    if (!raw || typeof raw !== "string") {
      return;
    }
    const item: string = raw;

    // insert backend query here - it will return our added item so we can use the DB ID as our key. We will have to make our data structure an array with objects inside

    setList((prev) => [...prev, item]);
    setEditItemId(-1);
    setNewItem("");
  };

  const handleEditItem = (
    e: React.FormEvent<HTMLFormElement>,
    itemId: number
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = formData.get("newItem");
    if (!raw || typeof raw !== "string") {
      return;
    }
    const item: string = raw;

    // insert backend query here - it will return our added item so we can use the DB ID as our key. We will have to make our data structure an array with objects inside

    setList((prev) => [
      ...prev.slice(0, itemId),
      item,
      ...prev.slice(itemId + 1),
    ]);
    setEditItemId(-1);
    setNewItem("");
    setNewItemSwitch(true);
  };

  const editItem = (e: React.MouseEvent, itemId: number) => {
    e.preventDefault();
    setNewItemSwitch(false);
    setEditItemId(itemId);
    setNewItem(list[itemId]);
  };

  return (
    <div className={styles.pageWrapper}>
      <h3 className={styles.title}>Want to See</h3>
      <hr />
      <ul>
        {list.map(
          (v, i) =>
            i === editItemId ? (
              <li key={i}>
                <form onSubmit={(e) => handleEditItem(e, i)}>
                  <input
                    className={styles.input}
                    type="text"
                    name="newItem"
                    autoComplete="off"
                    ref={inputRef}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    id="newItem"
                  />
                </form>
              </li>
            ) : (
              <li key={i} id={String(i)} onDoubleClick={(e) => editItem(e, i)}>
                {v}
              </li>
            ) // will have to change the key here to id, once i get it from the DB
        )}{" "}
        {/* soooo would it look better of just hiding this instead of disabling it?? */}
        {newItemSwitch && (
          <li>
            <form onSubmit={handleSubmitItem}>
              <input
                className={styles.input}
                type="text"
                name="newItem"
                ref={inputRef}
                value={newItem}
                autoComplete="off"
                onChange={(e) => setNewItem(e.target.value)}
                id="newItem"
              />
            </form>
          </li>
        )}
      </ul>
    </div>
  );
};

export default WantToSeeList;
