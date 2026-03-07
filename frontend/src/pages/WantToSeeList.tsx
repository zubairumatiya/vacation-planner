import styles from "../styles/WantToSee.module.css";
import { useState, useRef, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import trashIcon from "../assets/trash-icon.svg";
import { AuthContext } from "../context/AuthContext";
import CheckBubble from "../components/CheckBubble";
import { type UniqueIdentifier } from "@dnd-kit/core";
import ListItem from "../components/ListItem";
import { BannerContext } from "../context/BannerContext";
import refreshFn from "../utils/refreshFn";

const apiURL = import.meta.env.VITE_API_URL;

const WantToSeeList = (props: WantToSeeListProps) => {
  const { tripId } = useParams();
  const [newItem, setNewItem] = useState<string>("");
  const [addingNewItem, setAddingNewItem] = useState<boolean>(true);
  const [editItemId, setEditItemId] = useState<UniqueIdentifier>("-1");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;

  const { setBannerMsg } = useContext(BannerContext);
  const loggingOutRef = auth?.loggingOutRef;

  useEffect(() => {
    if (loggingOutRef?.current) return;
    const getTripList = async () => {
      const response = await fetch(`${apiURL}/list/${tripId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        const resData = (await response.json()) as ApiErrorResponse;
        if (resData.error === "JwtError") {
          if (logout) {
            await logout();
          }
          return;
        }
        if (refreshInFlightRef == null) {
          console.error("Auth flight ref not set");
          return;
        }
        if (loggingOutRef?.current) return;
        const continueReq: { token: string | null; err: boolean } =
          await refreshFn(apiURL, refreshInFlightRef);
        if (!continueReq.err) {
          if (login && continueReq.token) {
            login(String(continueReq.token));
          }
          const retryReq = await fetch(`${apiURL}/list/${tripId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${continueReq.token}`,
            },
          });
          if (!retryReq.ok) {
            alert("Trouble completing request, please try again");
          } else if (retryReq.ok) {
            const data = (await retryReq.json()) as ListGetResponse;
            props.setList(data.data);
            props.loadSecond();
          }
        } else if (continueReq.err) {
          if (logout) {
            await logout();
          }
          return;
        }
      } else if (response.status === 403) {
        setBannerMsg("You do not have permission to access this resource");
      } else if (response.status === 404) {
        setBannerMsg("This list could not be found");
      } else if (response.status >= 500) {
        setBannerMsg(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
        );
      } else if (response.ok) {
        const data = (await response.json()) as ListGetResponse;
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
    if (!item) return;
    const details = noteText.trim() || null;
    const res = await props.handleSubmitItem(item, undefined, details);

    if (res === 200 || res === 400 || res === 500) {
      setEditItemId("-1");
      setNewItem("");
      setNoteText("");
      setShowNoteInput(false);
    }
  };

  const handleEditItem = async (
    e: React.FormEvent<HTMLFormElement>,
    index: number,
    itemId: UniqueIdentifier,
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = formData.get("newItem");
    if (!raw || typeof raw !== "string") {
      return;
    }
    const item: string = raw.trim();
    const details = noteText.trim() || null;
    console.log(props.list[index]);
    const response = await fetch(`${apiURL}/list/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        value: item,
        details,
        tripId,
        lastModified: props.list[index].lastModified,
      }),
    });
    console.log("lastModified:", props.list[index].lastModified);
    if (response.status === 401) {
      const resData = (await response.json()) as ApiErrorResponse;
      if (resData.error === "JwtError") {
        if (logout) {
          await logout();
        }
        return;
      }
      if (refreshInFlightRef == null) {
        console.error("Auth flight ref not set");
        return;
      }
      const continueReq: { token: string | null; err: boolean } =
        await refreshFn(apiURL, refreshInFlightRef);
      if (!continueReq.err) {
        if (login && continueReq.token) {
          login(String(continueReq.token));
        }
        const retryReq = await fetch(`${apiURL}/list/${itemId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${continueReq.token}`,
          },
          body: JSON.stringify({
            value: item,
            details,
            tripId,
            lastModified: props.list[index].lastModified,
          }),
        });
        if (!retryReq.ok) {
          alert("Trouble completing request, please try again");
        } else if (retryReq.ok) {
          const data = (await retryReq.json()) as ListUpdateResponse;
          props.setList((prev) => {
            return [
              ...prev.slice(0, index),
              { ...data.data[0] },
              ...prev.slice(index + 1),
            ];
          });
        }
      } else if (continueReq.err) {
        if (logout) {
          await logout();
        }
        return;
      }
    } else if (response.status === 403) {
      setBannerMsg("You do not have permission to access this resource");
    } else if (response.status === 404) {
      setBannerMsg("Error: Trip not found");
    } else if (response.status === 409) {
      const data = (await response.json()) as ListConflictResponse;
      props.setList(data.newData);
      setBannerMsg(
        "Another user has updated this resource, your change was not applied",
      );
    } else if (response.status >= 500) {
      setBannerMsg(
        "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
      );
    } else if (response.ok) {
      const data = (await response.json()) as ListUpdateResponse;
      props.setList((prev) => {
        return [
          ...prev.slice(0, index),
          { ...data.data[0] },
          ...prev.slice(index + 1),
        ];
      });
    } else {
      setBannerMsg("Error: Could not process change at this time");
    }

    setEditItemId("-1");
    setNewItem("");
    setNoteText("");
    setShowNoteInput(false);
    setAddingNewItem(true);
  };

  const editItem = (
    e: React.MouseEvent,
    index: number,
    itemId: UniqueIdentifier,
  ) => {
    e.preventDefault();
    setAddingNewItem(false);
    setEditItemId(itemId);
    setNewItem(props.list[index].value);
    setNoteText(props.list[index].details || "");
    setShowNoteInput(!!props.list[index].details);
  };

  const handleDeleteItem = async (
    e: React.MouseEvent,
    itemId: UniqueIdentifier,
  ) => {
    e.preventDefault();
    const res = await props.handleDeleteItem(itemId, false);

    if (res === 200 || res === 400 || res === 500) {
      setEditItemId("-1");
      setNewItem("");
      setNoteText("");
      setShowNoteInput(false);
      setAddingNewItem(true);
    }
  };

  const clickAwayToCancel = (e: React.MouseEvent) => {
    // prettier-ignore
    if (!(e.target instanceof HTMLImageElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      setEditItemId("-1");
      setNewItem("");
      setNoteText("");
      setShowNoteInput(false);
      setAddingNewItem(true);
    }
  };

  const handleCheckItem = async (
    e: React.MouseEvent,
    currentState: boolean,
    itemId: UniqueIdentifier,
    index: number,
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
      const data = (await result.json()) as ListUpdateResponse;
      props.setList((prev) => [
        ...prev.slice(0, index),
        { ...data.data[0] },
        ...prev.slice(index + 1),
      ]);
    } else {
      if (result.status === 401) {
        const resData = (await result.json()) as ApiErrorResponse;
        if (resData.error === "JwtError") {
          if (logout) {
            await logout();
          }
          return;
        }
        if (refreshInFlightRef == null) {
          console.error("Auth flight ref not set");
          return;
        }
        const continueReq: { token: string | null; err: boolean } =
          await refreshFn(apiURL, refreshInFlightRef);
        if (!continueReq.err) {
          if (login && continueReq.token) {
            login(String(continueReq.token));
          }
          const retryReq = await fetch(`${apiURL}/check-list-item/${itemId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${continueReq.token}`,
            },
            body: JSON.stringify({
              newValue,
              tripId,
            }),
          });
          if (!retryReq.ok) {
            alert("Trouble completing request, please try again");
          } else if (retryReq.ok) {
            const data = (await retryReq.json()) as ListUpdateResponse;
            props.setList((prev) => [
              ...prev.slice(0, index),
              { ...data.data[0] },
              ...prev.slice(index + 1),
            ]);
          }
        } else if (continueReq.err) {
          if (logout) {
            await logout();
          }
          return;
        }
      } else if (result.status === 403) {
        setBannerMsg("You do not have permission to access this resource");
      } else if (result.status === 404) {
        setBannerMsg("Error: Trip not found");
      } else if (result.status >= 500) {
        setBannerMsg(
          "Uh oh. Something went wrong. Please try again, or try refreshing and then try again",
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
              <div className={styles.itemValueWrapper}>
                <div className={styles.editItemWrapper}>
                  <form
                    onSubmit={(e) => handleEditItem(e, i, v.id)}
                    className={`${styles.form} ${
                      v.fromGoogle && styles.showMessagei
                    }`}
                  >
                    <div className={`${styles.editItemTopRow}`}>
                      <div className={v.fromGoogle ? styles.showMessage : ""}>
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
                      </div>
                      <div className={`${styles.hiddenMessage}`}>
                        Places added from map cannot be edited
                      </div>

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
                    <div className={styles.noteSection}>
                      {showNoteInput ? (
                        <div className={styles.noteInputWrapper}>
                          <textarea
                            className={styles.noteTextarea}
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Write a note..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                const form = e.currentTarget.form;
                                if (form) {
                                  form.requestSubmit();
                                }
                              }
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.noteToggleBtn}
                          onClick={() => setShowNoteInput(true)}
                        >
                          {v.details ? "Edit note" : "Add note"}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
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
              isMobile={props.isMobile}
              days={props.days}
              onMobileAddToSchedule={props.onMobileAddToSchedule}
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

              {newItem.trim() && (
                <div className={styles.noteSection}>
                  {showNoteInput ? (
                    <div className={styles.noteInputWrapper}>
                      <textarea
                        className={styles.noteTextarea}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Write a note..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            const form = e.currentTarget.form;
                            if (form) {
                              form.requestSubmit();
                            }
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.noteToggleBtn}
                      onClick={() => setShowNoteInput(true)}
                    >
                      Add note
                    </button>
                  )}
                </div>
              )}
            </form>
          </li>
        )}
      </ul>
    </div>
  );
};

export default WantToSeeList;
