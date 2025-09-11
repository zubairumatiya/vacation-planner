import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Schedule = {
  id: number;
  trip_id: number;
  location: string;
  details: string;
  start_time: string;
  end_time: string;
  cost: string;
  multi_day: boolean;
};
type innerObject = { index: number; cells: Schedule }[];
type MasterObject = {
  [key: string]: innerObject; // values must be arrays of any type
};

function SortableRow({
  id,
  cells,
  index,
  day,
}: {
  id: string;
  cells: Schedule;
  index: string;
  day: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, data: { index, day } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {Object.values(cells).map((value, index) => {
        if (index === 0) {
          return (
            <td
              key={index}
              {...attributes} // we are adding these towo to the first td only because they are will be the only cells we are able to drag with
              {...listeners} // we are adding these towo to the first td only because they are will be the only cells we are able to drag with
              style={{
                padding: "8px",
                overflow: "clip",
                border: "1px solid gray",
              }}
            >
              {value}
            </td>
          );
        } else {
          return (
            <td
              key={index}
              style={{ padding: "8px", border: "1px solid gray" }}
            >
              {value}
            </td>
          );
        }
      })}
    </tr>
  );
}

export default function App() {
  const dataFromDb: Schedule[] = [
    {
      id: 27,
      trip_id: 1,
      location: "nyc bb",
      details: "dsid",
      start_time: "2025-07-15T11:00:00.000Z",
      end_time: "2025-07-15T18:00:00.000Z",
      cost: "123.00",
      multi_day: false,
    },
    {
      id: 37,
      trip_id: 1,
      location: "eh",
      details: "beh",
      start_time: "2025-07-16T00:00:00.000Z",
      end_time: "2025-07-16T08:00:00.000Z",
      cost: "3.00",
      multi_day: false,
    },
    {
      id: 26,
      trip_id: 1,
      location: "Aus",
      details:
        "flight - Delta-5123 a;skldjf;alskjdf;alskjdf;a;skdj;flaksjf;laksjdf;lasjdf;laskjdf;laksjdf;alkjsdf;lakj;f asdkfj;alskdjf;alsjdfpiojqpoiwjepqoweijtqpwoinvas;kjcnvqeurngq[peunr[fqiwhj[oefij[sadfj[iajs[d",
      start_time: "2025-07-17T02:00:00.000Z",
      end_time: "2025-07-17T13:00:00.000Z",
      cost: "412.00",
      multi_day: false,
    },
    {
      id: 38,
      trip_id: 1,
      location: "Guam",
      details: "nada",
      start_time: "2025-07-17T03:00:00.000Z",
      end_time: "2025-07-15T09:00:00.000Z",
      cost: "52.00",
      multi_day: false,
    },
  ];
  const [allData, setAllData] = useState<MasterObject>({});

  useEffect(() => {
    //we will have this precalculated
    //const length = 3;

    // we will have the days selected
    const day = [15, 16, 17];

    // sort so that the index is properly assigned -
    dataFromDb.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    //make a prefilled object of the days

    const masterObj: MasterObject = {};
    day.forEach((v) => (masterObj[v + ""] = []));

    Object.entries(masterObj).map(([key]) => {
      dataFromDb.forEach((v, i) => {
        const startTime = new Date(v.start_time);
        if (key === String(startTime.getUTCDate()))
          masterObj[key].push({ index: i, cells: v });
      });
    });
    setAllData(masterObj);
  }, []);

  // for next time - i need to see how i can iterate over this to make a table per day, but when dragging it uses the unified index for the dragover animation
  // will need to have some way to do active.index

  /* const [rows, setRows] = useState([
    { id: "row1", cells: ["A1", "B1", "C1"] },
    { id: "row2", cells: ["A2", "B2", "C2"] },
    { id: "row3", cells: ["A3", "B3", "C3"] },
    { id: "row4", cells: ["A4", "B4", "C4"] },
    { id: "row5", cells: ["A5", "B5", "C5"] },
  ]);*/

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = active.data.current?.index;
      const newIndex = over.data.current?.index;
      const oldTable = active.data.current?.day;
      const newTable = over.data.current?.day;
      setAllData((prev) => {
        const oldLocalIndex = prev[oldTable].findIndex(
          (v) => v.index === oldIndex
        );
        const newLocalIndex = prev[newTable].findIndex(
          (v) => v.index === newIndex
        );
        const movingItem = prev[oldTable][oldLocalIndex];
        return {
          ...prev,
          [oldTable]: [...prev[oldTable].filter((v) => v.index !== oldIndex)],
          [newTable]: [
            ...prev[newTable].slice(0, newLocalIndex),
            movingItem,
            ...prev[newTable].slice(newLocalIndex),
          ],
        };
      }); // will this mess up the order of the tables
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {Object.entries(allData).flatMap(
        (
          [key, value] // for next time: we need to see how we are going sort the schedule items into the right tables, we already did it so it should work, but how will we ensure it stays in the right buckets?
        ) => (
          <table
            key={key}
            id={key}
            style={{
              borderCollapse: "collapse",
              tableLayout: "fixed",
              width: "100%",
              minWidth: "600px",
              marginTop: "20px",
            }}
          >
            <caption>{key}</caption>
            <thead>
              <tr>
                <th style={{ border: "1px solid gray", padding: "8px" }}>id</th>
                <th style={{ border: "1px solid gray", padding: "8px" }}>
                  trip_id
                </th>
                <th style={{ border: "1px solid gray", padding: "8px" }}>
                  location
                </th>
                <th style={{ border: "1px solid gray", padding: "8px" }}>
                  details
                </th>
                <th style={{ border: "1px solid gray", padding: "8px" }}>
                  start_time
                </th>
                <th style={{ border: "1px solid gray", padding: "8px" }}>
                  end_time
                </th>
                <th style={{ border: "1px solid gray", padding: "8px" }}>
                  cost
                </th>
                <th style={{ border: "1px solid gray", padding: "8px" }}>
                  multi-day
                </th>
              </tr>
            </thead>
            <SortableContext
              items={value.map((v) => {
                console.log(v.cells.id);
                return v.cells.id;
              })}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {value.map(
                  (
                    v // the rows should be rendered per day (table) not all days on each table
                  ) => (
                    <SortableRow
                      key={v.cells.id}
                      id={String(v.cells.id)}
                      cells={v.cells}
                      index={String(v.index)}
                      day={key}
                    />
                  )
                )}
              </tbody>
            </SortableContext>
          </table>
        )
      )}
    </DndContext>
  );
}
