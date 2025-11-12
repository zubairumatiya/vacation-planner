import EditVacationSchedule from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import MyMapComponent from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState, useCallback, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const apiURL = import.meta.env.VITE_API_URL;

const EditCanvas = () => {
  const { tripId } = useParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [loading2, setLoading2] = useState<boolean>(true);
  const [vp, setVp] = useState<null | Vp>(null);
  const [location, setLocation] = useState<string>("");
  const [gId, setGId] = useState<string>("");
  const [wishList, setWishList] = useState<Item[]>([]);
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const gValuesFn = (vp: Vp, gLocation: string, gId: string) => {
    setVp(vp);
    setLocation(gLocation);
    setGId(gId);
  };

  const handleSubmitItem = async (value: string, id?: string) => {
    const item = value;

    // insert backend query here - it will return our added item so we can use the DB ID as our key. We will have to make our data structure an array with objects inside
    const response = await fetch(`${apiURL}/list/${tripId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: item }), // SEND ID!
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
      const apiData: { data: Item } = await response.json();

      apiData.data.id = id; // TODO this part will need to change, it will work until we have to refresh, then the id of the google place will be replaced by the DB id.
      setWishList((prev) => [...prev, apiData.data]);

      setWishList((prev) => [...prev, apiData.data]); // rmr our list items are now objects
      return 200;
      setEditItemId("-1");
      setNewItem("");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    // this will only work if the google item is stored with its id. And serial primary key is an integer, so we might have to come up with some algorithm to store it as a number and be able to decipher it upon retrieval. Easiest way is to prob move away from primary serial id and create our own id's or soemthing. honestly, i just want to be able to store it as my ID, that would be the simplest.
    const response = await fetch(`${apiURL}/list/${itemId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
      setWishList((prev) => prev.filter((v) => v.id !== itemId));
      return 200;
      setEditItemId("-1");
      setNewItem("");
      setAddingNewItem(true);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <EditVacationSchedule
        loadFirst={() => setLoading(false)}
        getMapValues={gValuesFn}
      />
      {!loading && (
        <WantToSeeList
          loadSecond={() => setLoading2(false)}
          setList={setWishList}
          list={wishList}
          handleSubmitItem={handleSubmitItem}
          handleDeleteItem={handleDeleteItem}
        />
      )}
      {!loading2 && (
        <MyMapComponent
          bounds={vp}
          startLocation={location}
          gId={gId}
          setList={setWishList}
          list={wishList}
          handleSubmitItem={handleSubmitItem}
          handleDeleteItem={handleDeleteItem}
        />
      )}
    </div>
  );
};

export default EditCanvas;
