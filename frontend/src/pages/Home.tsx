import { useEffect, useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL;

const Home = () => {
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
      const res = await fetch(`${apiUrl}/home`);
      const data = await res.json();
      setTrips(data);
      setLoading(false);
    };

    getTrips();
  }, trips);

  return (
    <>
      {!loading && (
        <>
          <h2>Upcoming Trips...</h2>
          <br />
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
        </>
      )}
    </>
  );
};

export default Home;
