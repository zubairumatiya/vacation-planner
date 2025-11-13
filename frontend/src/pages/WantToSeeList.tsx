import styles from "../styles/WantToSee.module.css";
import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import trashIcon from "../assets/trash-icon.svg";
import { AuthContext } from "../context/AuthContext";

const apiURL = import.meta.env.VITE_API_URL;

const WantToSeeList = (props: WantToSeeListProps) => {
  const { tripId } = useParams();
  //const [list, props.setList] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [addingNewItem, setAddingNewItem] = useState<boolean>(true);
  const [editItemId, setEditItemId] = useState<string>("-1");
  const inputRef = useRef<HTMLInputElement>(null);
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  useEffect(() => {
    const getTripList = async () => {
      const response = await fetch(`${apiURL}/list/${tripId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.status === 401) {
        navigate("/login", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      }
      if (response.status === 404) {
        alert("Error: List not found");
      }
      if (response.ok) {
        data.data.forEach((v: Item) => v.id);
        props.setList(data.data);
        props.loadSecond();
        console.log(data.data);
      }
    };

    getTripList();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [addingNewItem, editItemId]);

  const handleSubmitItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = formData.get("newItem");
    if (!raw || typeof raw !== "string") {
      return;
    }
    const item = raw.trim();
    const res = await props.handleSubmitItem(item);

    if (res === 200) {
      setEditItemId("-1");
      setNewItem("");
    }
  };

  const handleEditItem = async (
    e: React.FormEvent<HTMLFormElement>,
    index: number,
    itemId: string
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = formData.get("newItem");
    if (!raw || typeof raw !== "string") {
      return;
    }
    const item: string = raw.trim();

    // insert backend query here - it will return our added item so we can use the DB ID as our key. We will have to make our data structure an array with objects inside
    const response = await fetch(`${apiURL}/list/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: item }),
    });

    if (response.status === 401) {
      navigate("/login", {
        state: { message: "Session expired, redirecting to log in..." },
      });
    }
    if (response.status === 404) {
      alert("Error: List not found");
    }

    if (response.ok) {
      props.setList((prev) => {
        return [
          ...prev.slice(0, index),
          { ...prev[index], value: item },
          ...prev.slice(index + 1),
        ];
      });
      setEditItemId("-1");
      setNewItem("");
      setAddingNewItem(true);
    }
  };

  const editItem = (e: React.MouseEvent, index: number, itemId: string) => {
    e.preventDefault();
    setAddingNewItem(false);
    setEditItemId(itemId);
    setNewItem(props.list[index].value);
  };

  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    const res = await props.handleDeleteItem(itemId);

    if (res === 200) {
      setEditItemId("-1");
      setNewItem("");
      setAddingNewItem(true);
    }
  };

  const clickAwayToCancel = (e: React.MouseEvent) => {
    // prettier-ignore
    if (!(e.target instanceof HTMLImageElement || e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      setEditItemId("-1");
      setNewItem("");
      setAddingNewItem(true);
    }
  };

  return (
    <div
      className={styles.pageWrapper}
      onClick={addingNewItem ? undefined : clickAwayToCancel}
    >
      <h3 className={styles.title}>Want to See</h3>
      <hr />
      <ul>
        {props.list.map((v, i) => {
          console.log(v.fromGoogle); // FOR NEXT TIME: from_google vs fromGoogle, need to add helper function in backend to convert snake to camelcase.
          return v.id === editItemId ? (
            <li key={v.id} id={String(v.id)}>
              <div className={styles.editItemWrapper}>
                <form
                  onSubmit={(e) => handleEditItem(e, i, v.id)}
                  className={styles.form}
                >
                  <input
                    className={`${styles.input} ${
                      v.fromGoogle && styles.noEditingInput
                    }`}
                    type="text"
                    name="newItem"
                    autoComplete="off"
                    ref={inputRef}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    id="newItem"
                    disabled={v.fromGoogle}
                  />
                  <div
                    className={`${styles.hiddenMessage} ${
                      v.fromGoogle && styles.showMessage
                    }`}
                  >
                    Places added from map cannot be edited
                  </div>
                </form>
                <button
                  type="button"
                  className={styles.trashButton}
                  onClick={(e) => {
                    handleDeleteItem(e, v.id);
                  }}
                >
                  <img
                    src={trashIcon}
                    className={styles.trashIcon}
                    alt="trashIcon"
                  />
                </button>
              </div>
            </li>
          ) : (
            <li
              key={v.id}
              id={String(v.id)}
              onDoubleClick={(e) => editItem(e, i, v.id)}
            >
              {v.value}
            </li>
          );
        })}{" "}
        {addingNewItem && (
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
