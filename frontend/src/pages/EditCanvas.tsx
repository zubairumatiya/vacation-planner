import EditVacationSchedule, { Schedule } from "./EditVacationSchedule";
import WantToSeeList from "./WantToSeeList";
import MyMapComponent from "./Map";
import styles from "../styles/EditCanvas.module.css";
import { useState, useCallback, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  DndContext,
  //type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { type DaySchedule, type DraggingState } from "./EditVacationSchedule";

const apiURL = import.meta.env.VITE_API_URL;

const EditCanvas = () => {
  const { tripId } = useParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [loading2, setLoading2] = useState<boolean>(true);
  const [vp, setVp] = useState<null | Vp>(null);
  const [location, setLocation] = useState<string>("");
  const [gId, setGId] = useState<string>("");
  const [wishList, setWishList] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule>({});
  const [dragItem, setDragItem] = useState<DraggingState | null>(null);
  const [dragRow, setDragRow] = useState<Schedule | null>(null);
  const auth = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id);
    const containerAndIndex = findContainerAndIndex(e.active.id);
    setDragItem(containerAndIndex);
    if (containerAndIndex.container && containerAndIndex.index)
      setDragRow(
        schedule[containerAndIndex?.container][containerAndIndex.index]
      );
  };

  const handleDragOver = (e: DragOverEvent) => {
    if (e.over) setOverId(e.over.id);
    else setOverId(null);
  };

  const handleDragEnd = () => {
    setActiveId(null);
    // will prob just end up moving time change and api end point fetch request here instead, will be easier since we are wanting to incorporate drag across components
  };

  const findContainerAndIndex = (
    id: UniqueIdentifier | undefined
  ): DraggingState => {
    const containerAndIndex: DraggingState = { container: null, index: null };

    for (const v of Object.keys(schedule)) {
      for (let i = 0; i < schedule[v].length; i++) {
        if (schedule[v][i].id === id) {
          containerAndIndex["container"] = v;
          containerAndIndex["index"] = i;
          return containerAndIndex;
        }
      }
    }
    return containerAndIndex;
  };

  const gValuesFn = (vp: Vp, gLocation: string, gId: string) => {
    setVp(vp);
    setLocation(gLocation);
    setGId(gId);
  };

  const handleSubmitItem = useCallback(async (value: string, id?: string) => {
    const val = value;
    const response = await fetch(`${apiURL}/list/${tripId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: val, id: id ?? null }),
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
      setWishList((prev) => [...prev, apiData.data]);
      return 200;
    }
  }, []);

  const handleDeleteItem = useCallback(async (itemId: string) => {
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
    }
  }, []);

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.pageWrapper}>
        <EditVacationSchedule
          loadFirst={() => setLoading(false)}
          getMapValues={gValuesFn}
          activeId={activeId}
          overId={overId}
          schedule={schedule}
          setSchedule={setSchedule}
          dragRow={dragRow}
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
            list={wishList}
            handleSubmitItem={handleSubmitItem}
            handleDeleteItem={handleDeleteItem}
          />
        )}
      </div>
    </DndContext>
  );
};

export default EditCanvas;
