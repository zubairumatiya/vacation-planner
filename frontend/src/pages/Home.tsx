import { useEffect, useState, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Home.module.css";
import editIcon from "../assets/edit-icon.svg";
import VacationForm from "../components/VacationForm";
import refreshFn from "../utils/refreshFn";

const apiUrl = import.meta.env.VITE_API_URL;

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-us", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const permissionLabel = (role: string) => {
  if (role === "editor") return "editor";
  if (role === "reader") return "view only";
  return "";
};

const Home = () => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const login = auth?.login;
  const logout = auth?.logout;
  const loggingOutRef = auth?.loggingOutRef;
  const refreshInFlightRef = auth?.refreshInFlightRef;
  const [trips, setTrips] = useState<HomeTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const editingRef = useRef<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [submitButtonDisabled, setSubmitButtonDisabled] =
    useState<boolean>(false);
  const [submitClicked, setSubmitClicked] = useState<boolean>(false);
  const [updateList, setUpdateList] = useState<boolean>(false);
  const [pastTripsOpen, setPastTripsOpen] = useState(false);

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
    if (loggingOutRef?.current) return;
    const getTrips = async () => {
      try {
        const res = await fetch(`${apiUrl}/home`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          const resData = (await res.json()) as ApiErrorResponse;
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
              const retryData = (await retryReq.json()) as HomeTrip[];
              setTrips(retryData);
              setLoading(false);
            }
          } else if (continueReq.err) {
            if (logout) {
              logout();
            }
          }
        } else if (res.ok) {
          const data = (await res.json()) as HomeTrip[];
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
      setTrips((prev) => prev.filter((v: HomeTrip) => v.id !== id));
      setEditing(false);
      editingRef.current = false;
      setEditingId("");
    } else if (result.status === 401) {
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
          setTrips((prev) => prev.filter((v: HomeTrip) => v.id !== id));
          setEditing(false);
          editingRef.current = false;
          setEditingId("");
        }
      } else if (continueReq.err) {
        if (logout) {
          await logout();
        }
        return;
      }
    } else {
      console.log("~~~~ error deleting item");
    }
  };

  // Split trips into categories
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPast = (trip: HomeTrip) => new Date(trip.end_date) < today;

  const myTrips = trips.filter((t) => t.role === "owner" && !isPast(t));

  const sharedTrips = trips.filter((t) => t.role !== "owner" && !isPast(t));

  const pastTrips = trips
    .filter((t) => isPast(t))
    .sort(
      (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime(),
    );

  const renderTripCard = (v: HomeTrip) => {
    const startFormat = formatDate(v.start_date);
    const endFormat = formatDate(v.end_date);
    const ownerName = `${v.owner_first_name} ${v.owner_last_name}`;

    if (editingId === v.id) {
      return (
        <form onSubmit={formSubmit} key={v.id}>
          <VacationForm
            preFill={{
              trip_name: v.trip_name,
              location: v.location,
              start_date: v.start_date,
              end_date: v.end_date,
              id: v.id,
              is_public: v.is_public,
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
      );
    }

    return (
      <div id={v.id} key={v.id} className={styles.wrapper}>
        <div className={styles.titleNEdit}>
          <Link
            to={`/vacation/${v.id}`}
            className={`${styles.title} ${editing && styles.editing}`}
          >
            <h2
              className={`text-xl font-semibold hover:text-indigo-600 ${
                editing ? "text-gray-500" : "text-indigo-500"
              }`}
            >
              {v.trip_name}
              {v.role !== "owner" && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  Owner: {ownerName} ({permissionLabel(v.role)})
                </span>
              )}
            </h2>
          </Link>
          <div className={styles.editIcon} onClick={() => editTrip(v.id)}>
            {editing ? undefined : <img src={editIcon} alt="editIcon" />}
          </div>
        </div>
        <p>{`Start date: ${startFormat}`}</p>
        <p>{`End date: ${endFormat}`}</p>
      </div>
    );
  };

  const renderPastTripCard = (v: HomeTrip) => {
    const startFormat = formatDate(v.start_date);
    const endFormat = formatDate(v.end_date);
    const ownerName = `${v.owner_first_name} ${v.owner_last_name}`;

    return (
      <div
        id={v.id}
        key={v.id}
        className={styles.wrapper}
        style={{ opacity: 0.5 }}
      >
        <div className={styles.titleNEdit}>
          <Link to={`/vacation/${v.id}`} className={styles.title}>
            <h2 className="text-xl font-semibold text-indigo-400 hover:text-indigo-500">
              {v.trip_name}
              {v.role !== "owner" && (
                <span className="text-sm font-normal text-gray-400 ml-2">
                  Owner: {ownerName} ({permissionLabel(v.role)})
                </span>
              )}
            </h2>
          </Link>
        </div>
        <p>{`Start date: ${startFormat}`}</p>
        <p>{`End date: ${endFormat}`}</p>
      </div>
    );
  };

  const noActiveTrips = myTrips.length === 0 && sharedTrips.length === 0;

  return (
    <>
      {!loading && (
        <div className={styles.content}>
          {/* My Trips Section */}
          <div>
            <h2 className="text-xl font-bold">My Trips</h2>
          </div>
          <br />
          <div>
            {myTrips.length === 0 ? (
              <p>no trips to display...</p>
            ) : (
              myTrips.map((v) => renderTripCard(v))
            )}
          </div>

          {/* Shared With Me Section */}
          <br />
          <div>
            <h2 className="text-xl font-bold">Shared With Me</h2>
          </div>
          <br />
          <div>
            {sharedTrips.length === 0 ? (
              <p>no shared trips to display...</p>
            ) : (
              sharedTrips.map((v) => renderTripCard(v))
            )}
          </div>

          {/* Past Trips Section */}
          {pastTrips.length > 0 && (
            <>
              <br />
              <div
                className={styles.pastTripsHeader}
                onClick={() => setPastTripsOpen((prev) => !prev)}
              >
                <h2 className="text-xl font-bold cursor-pointer select-none text-indigo-400">
                  Past Trips{" "}
                  <span className="text-green-400">
                    {pastTripsOpen ? "▾" : "▸"}
                  </span>
                </h2>
              </div>
              {pastTripsOpen && (
                <div>
                  <br />
                  {pastTrips.map((v) => renderPastTripCard(v))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Home;
