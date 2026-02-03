import { useEffect, useState, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Home.module.css";
import editIcon from "../assets/edit-icon.svg";
import VacationForm from "../components/VacationForm";
import refreshFn from "../utils/refreshFn";

const apiUrl = import.meta.env.VITE_API_URL;

const Home = () => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  type Trip = {
    id: string;
    trip_name: string;
    location: string;
    start_date: string;
    end_date: string;
  };
  const [editing, setEditing] = useState(false);
  const editingRef = useRef<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [submitButtonDisabled, setSubmitButtonDisabled] =
    useState<boolean>(false);
  const [submitClicked, setSubmitClicked] = useState<boolean>(false);
  const [updateList, setUpdateList] = useState<boolean>(false);

  useEffect(() => {
    const cancel = (e: KeyboardEvent) => {
      if (editingRef.current === true) {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
          editingRef.current = false;
          setEditingId("");
        }
      }
    };
    document.addEventListener("keydown", cancel);
    return () => document.removeEventListener("keydown", cancel);
  }, []);

  useEffect(() => {
    const getTrips = async () => {
      try {
        const res = await fetch(`${apiUrl}/home`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          const resData = await res.json();
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
            await refreshFn(apiUrl, refreshInFlightRef);

          if (!continueReq.err) {
            if (login && continueReq.token) {
              login(String(continueReq.token));
            }
            const retryReq = await fetch(`${apiUrl}/home`, {
              headers: { Authorization: `Bearer ${continueReq.token}` },
            });
            if (!retryReq.ok) {
              alert("Trouble completing request, please try again");
            } else if (retryReq.ok) {
              const retryData = await retryReq.json();
              setTrips(retryData);
              setLoading(false);
            }
          } else if (continueReq.err) {
            navigate("/login", {
              state: { message: "Please log in again, redirecting..." },
            });
            if (logout) {
              await logout();
            }
            return;
          }
        } else if (res.ok) {
          const data = await res.json();
          setTrips(data);
          setLoading(false);
        } else {
          alert("Trouble completing req, please try again");
        }
      } catch (err) {
        console.error(err);
      }
    };
    getTrips();
  }, [updateList]);

  const editTrip = (tripId: string) => {
    setEditing(true);
    editingRef.current = true;
    setEditingId(tripId);
  };

  const checkError = (fieldError: boolean) => {
    setSubmitButtonDisabled(fieldError);
  };

  const handleCancel = () => {
    setEditing(false);
    editingRef.current = false;
    setEditingId("");
  };

  const formSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitClicked(true);
  };

  const checkSubmission = (result: boolean) => {
    if (result) {
      setUpdateList((prev) => !prev);
      setEditingId("");
      editingRef.current = false;
      setEditing(false);
      setSubmitClicked(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await fetch(`${apiUrl}/delete-vacation/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (result.ok) {
      setTrips((prev) => prev.filter((v: Trip) => v.id !== id));
      setEditing(false);
      editingRef.current = false;
      setEditingId("");
    } else if (result.status === 401) {
      const resData = await result.json();
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
        await refreshFn(apiUrl, refreshInFlightRef);
      if (!continueReq.err) {
        if (login && continueReq.token) {
          login(String(continueReq.token));
        }
        const retryReq = await fetch(`${apiUrl}/delete-vacation/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${continueReq.token}`,
          },
        });
        if (!retryReq.ok) {
          alert("Trouble completing request, please try again");
        } else if (retryReq.ok) {
          //const retryData = await retryReq.json();
          setTrips((prev) => prev.filter((v: Trip) => v.id !== id));
          setEditing(false);
          editingRef.current = false;
          setEditingId("");
        }
      } else if (continueReq.err) {
        navigate("/login", {
          state: { message: "Please log in again, redirecting..." },
        });
        if (logout) {
          await logout();
        }
        return;
      }
    } else {
      console.log("~~~~ error deleting item");
    }
  };

  return (
    <>
      {!loading && (
        <div className={styles.content}>
          <div>
            <h2 className="text-xl font-bold">Upcoming Trips...</h2>
          </div>
          <br />
          <div>
            {trips.length === 0 ? (
              <p>no trips to display...</p>
            ) : (
              trips.map((v: Trip) => {
                const start = new Date(v.start_date);
                const startFormat = start.toLocaleDateString("en-us", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const end = new Date(v.end_date);
                const endFormat = end.toLocaleDateString("en-us", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                return editingId === v.id ? (
                  <form onSubmit={formSubmit} key={v.id}>
                    <VacationForm
                      preFill={{
                        trip_name: v.trip_name,
                        location: v.location,
                        start_date: v.start_date,
                        end_date: v.end_date,
                        id: v.id,
                      }}
                      sendSubmissionResult={checkSubmission}
                      disableOrNah={checkError}
                      submit={submitClicked}
                      method="PATCH"
                    />
                    <button
                      type="submit"
                      disabled={submitButtonDisabled}
                      className="px-40 py-2 rounded bg-indigo-500 text-white pointer-events-auto cursor-pointer hover:bg-indigo-600 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:opacity-25"
                    >
                      Submit
                    </button>
                    <button type="button" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button type="button" onClick={() => handleDelete(v.id)}>
                      Delete
                    </button>
                  </form>
                ) : (
                  <div id={v.id} key={v.id} className={styles.wrapper}>
                    <div className={styles.titleNEdit}>
                      <Link
                        to={`/vacation/${v.id}`}
                        className={`${styles.title} ${
                          editing && styles.editing
                        }`}
                      >
                        <h2
                          className={`text-xl font-semibold hover:text-indigo-600 ${
                            editing ? "text-gray-500" : "text-indigo-500"
                          }`}
                        >
                          {v.trip_name}
                        </h2>
                      </Link>
                      <div
                        className={styles.editIcon}
                        onClick={() => editTrip(v.id)}
                      >
                        {editing ? undefined : (
                          <img src={editIcon} alt="editIcon" />
                        )}
                      </div>
                    </div>
                    <p>{`Start date: ${startFormat}`}</p>
                    <p>{`End date: ${endFormat}`}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
