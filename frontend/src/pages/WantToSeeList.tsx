import styles from "../styles/WantToSee.module.css";
import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import trashIcon from "../assets/trash-icon.svg";
import { AuthContext } from "../context/AuthContext";
import CheckBubble from "../components/CheckBubble";
import { type UniqueIdentifier } from "@dnd-kit/core";
import ListItem from "../components/ListItem";

const apiURL = import.meta.env.VITE_API_URL;

const WantToSeeList = (props: WantToSeeListProps) => {
  const { tripId } = useParams();
  //const [list, props.setList] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState<string>("");
  const [addingNewItem, setAddingNewItem] = useState<boolean>(true);
  const [editItemId, setEditItemId] = useState<UniqueIdentifier>("-1");
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
      if (response.status === 401) {
        navigate("/login", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      } else if (response.status === 403) {
        alert("You do not have permission to access this resource");
      } else if (response.status === 404) {
        alert("This list could not be found");
      } else if (response.status >= 500) {
        alert(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
      } else if (response.ok) {
        const data = await response.json();
        props.setList(data.data);
        props.loadSecond();
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

    if (res === 200 || res === 400 || res === 500) {
      setEditItemId("-1");
      setNewItem("");
    }
  };

  const handleEditItem = async (
    e: React.FormEvent<HTMLFormElement>,
    index: number,
    itemId: UniqueIdentifier
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = formData.get("newItem");
    if (!raw || typeof raw !== "string") {
      return;
    }
    const item: string = raw.trim();
    const response = await fetch(`${apiURL}/list/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        value: item,
        tripId,
        lastModified: props.list[index].lastModified,
      }),
    });

    if (response.status === 401) {
      navigate("/login", {
        state: { message: "Session expired, redirecting to log in..." },
      });
    } else if (response.status === 403) {
      alert("You do not have permission to access this resource");
    } else if (response.status === 404) {
      alert("Error: Trip not found");
    } else if (response.status === 409) {
      const data = await response.json();
      props.setList(data.newData);
      alert(
        "Another user has updated this resource, your change was not applied"
      );
    } else if (response.status >= 500) {
      alert(
        "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
      );
    } else {
      alert("Error: Could not process change at this time");
    }
    const data = await response.json();
    if (response.ok) {
      props.setList((prev) => {
        return [
          ...prev.slice(0, index),
          { ...prev[index], value: data.data[0].value },
          ...prev.slice(index + 1),
        ];
      });
    }
    setEditItemId("-1");
    setNewItem("");
    setAddingNewItem(true);
  };

  const editItem = (
    e: React.MouseEvent,
    index: number,
    itemId: UniqueIdentifier
  ) => {
    e.preventDefault();
    setAddingNewItem(false);
    setEditItemId(itemId);
    setNewItem(props.list[index].value);
  };

  const handleDeleteItem = async (
    e: React.MouseEvent,
    itemId: UniqueIdentifier
  ) => {
    e.preventDefault();
    const res = await props.handleDeleteItem(itemId, false);

    if (res === 200 || res === 400 || res === 500) {
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

  const handleCheckItem = async (
    e: React.MouseEvent,
    currentState: boolean,
    itemId: UniqueIdentifier,
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const newValue = !currentState;
    const result = await fetch(`${apiURL}/check-list-item/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        newValue,
        tripId,
      }),
    });
    if (result.ok) {
      const data = await result.json();
      props.setList((prev) => [
        ...prev.slice(0, index),
        { ...prev[index], itemAdded: data.data[0].itemAdded },
        ...prev.slice(index + 1),
      ]);
    } else {
      if (result.status === 401) {
        navigate("/login", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      } else if (result.status === 403) {
        alert("You do not have permission to access this resource");
      } else if (result.status === 404) {
        alert("Error: Trip not found");
      } else if (result.status >= 500) {
        alert(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again"
        );
      }
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
          return v.id === editItemId ? (
            <li key={v.id} id={String(v.id)} className={styles.editListItem}>
              <div className={styles.checkBubbleWrapper}>
                <CheckBubble checked={v.itemAdded} />
              </div>
              <div className={styles.editItemWrapper}>
                <form
                  onSubmit={(e) => handleEditItem(e, i, v.id)}
                  className={`${styles.form} ${
                    v.fromGoogle && styles.showMessage
                  }`}
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
                    disabled={v.fromGoogle ? true : false}
                  />
                  <div className={`${styles.hiddenMessage}`}>
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
            <ListItem
              v={v}
              key={v.id}
              i={i}
              editItem={editItem}
              handleCheckItem={handleCheckItem}
              activeListId={props.activeListId}
            />
          );
        })}{" "}
        {addingNewItem && (
          <li className={styles.newItem}>
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
