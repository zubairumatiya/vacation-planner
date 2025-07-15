import { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Home.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

const Home = () => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  type Trip = {
    id: string;
    trip_name: string;
    start_date: string;
    end_date: string;
  };

  useEffect(() => {
    const getTrips = async () => {
      const res = await fetch(`${apiUrl}/home`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 401) {
        navigate("/redirect", {
          state: { message: "Session expired, redirecting to log in..." },
        });
      }
      setTrips(data);
      setLoading(false);
    };
    // add error handling for like expired tokens where we send a refresh token
    getTrips();
  }, []);

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
                return (
                  <div id={v.id} key={v.id}>
                    <Link to={`/vacation/${v.id}`}>
                      <h2 className="text-xl font-semibold text-indigo-500 hover:text-indigo-600 ">
                        {v.trip_name}
                      </h2>
                    </Link>
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
