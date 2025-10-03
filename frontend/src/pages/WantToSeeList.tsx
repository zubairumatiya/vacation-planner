import styles from "../styles/WantToSee.module.css";
import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import trashIcon from "../assets/trash-icon.svg";
import { AuthContext } from "../context/AuthContext";

const apiURL = import.meta.env.VITE_API_URL;

type Item = {
  id: number;
  value: string;
};

const WantToSeeList = () => {
  const { tripId } = useParams();
  const [list, setList] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [addingNewItem, setAddingNewItem] = useState<boolean>(true);
  const [editItemId, setEditItemId] = useState<number>(-1);
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
        setList(data.data);
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
    const item: string = raw.trim();

    // insert backend query here - it will return our added item so we can use the DB ID as our key. We will have to make our data structure an array with objects inside
    const response = await fetch(`${apiURL}list/${tripId}`, {
      method: "POST",
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
      const data: Item[] = await response.json();
      setList((prev) => [...prev, data[0]]); // rmr our list items are now objects
      setEditItemId(-1);
      setNewItem("");
    }
  };

  const handleEditItem = async (
    e: React.FormEvent<HTMLFormElement>,
    index: number,
    itemId: number
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = formData.get("newItem");
    if (!raw || typeof raw !== "string") {
      return;
    }
    const item: string = raw.trim();

    // insert backend query here - it will return our added item so we can use the DB ID as our key. We will have to make our data structure an array with objects inside
    const response = await fetch(`${apiURL}list/${itemId}`, {
      method: "POST",
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
      setList((prev) => {
        return [
          ...prev.slice(0, index),
          { ...prev[index], value: item },
          ...prev.slice(index + 1),
        ];
      });
      setEditItemId(-1);
      setNewItem("");
      setAddingNewItem(true);
    }
  };

  const editItem = (e: React.MouseEvent, index: number, itemId: number) => {
    e.preventDefault();
    setAddingNewItem(false);
    setEditItemId(itemId);
    setNewItem(list[index].value);
  };

  const handleDeleteItem = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    //add api request
    setList((prev) => prev.filter((_, index) => index !== i));
    setEditItemId(-1);
    setNewItem("");
    setAddingNewItem(true);
  };

  const clickAwayToCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    setEditItemId(-1);
    setNewItem("");
    setAddingNewItem(true);
  };

  return (
    <div
      className={styles.pageWrapper}
      onClick={addingNewItem ? undefined : clickAwayToCancel}
    >
      <h3 className={styles.title}>Want to See</h3>
      <hr />
      <ul>
        {list.map(
          (v, i) =>
            i === editItemId ? (
              <li key={i}>
                <div className={styles.editItemWrapper}>
                  <form onSubmit={(e) => handleEditItem(e, i, v.id)}>
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
                  <button
                    type="button"
                    className={styles.trashButton}
                    onClick={(e) => {
                      handleDeleteItem(e, i);
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
                key={i}
                id={String(i)}
                onDoubleClick={(e) => editItem(e, i, v.id)}
              >
                {v.value}
              </li>
            ) // will have to change the key here to id, once i get it from the DB
        )}{" "}
        {/* soooo would it look better of just hiding this instead of disabling it?? */}
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
