import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import styles from "../styles/Home.module.css";

const apiUrl = import.meta.env.VITE_API_URL;

const Home = () => {
  const auth = useContext(AuthContext);
  const token = auth?.token;
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
      setTrips(data);
      setLoading(false);
    };
    // add error handling for like expired tokens where we send a refresh token
    getTrips();
  }, trips);

  return (
    <>
      {!loading && (
        <div className={styles.content}>
          <div>
            <h2>Upcoming Trips...</h2>
          </div>
          <br />
          <div>
            {trips.length === 0 ? (
              <p>no trips to display...</p>
            ) : (
              trips.map((v: Trip) => (
                <div id={v.id} key={v.id}>
                  <h4>{v.trip_name}</h4>
                  <p>{`Start date: ${v.start_date}`}</p>
                  <p>{`End date: ${v.end_date}`}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
