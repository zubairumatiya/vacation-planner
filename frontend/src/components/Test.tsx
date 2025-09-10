import { useState } from "react";
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
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableRow({ id, cells }: { id: string; cells: string[] }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {cells.map((cell, index) => {
        if (index === 0) {
          return (
            <td
              key={index}
              {...attributes}
              {...listeners}
              style={{ padding: "8px", border: "1px solid gray" }}
            >
              {cell}
            </td>
          );
        } else {
          return (
            <td
              key={index}
              style={{ padding: "8px", border: "1px solid gray" }}
            >
              {cell}
            </td>
          );
        }
      })}
    </tr>
  );
}

export default function App() {
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

  //we will have this precalculated
  const length = 3;

  // we will have the days selected
  const day = [15, 16, 17];

  // sort so that the index is properly assigned -
  dataFromDb.sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  //make a prefilled object of the days
  type MasterObject = {
    [key: string]: { index: number; cells: Schedule }[]; // values must be arrays of any type
  };
  const masterObj: MasterObject = {};
  day.forEach((v) => (masterObj[v + ""] = []));

  Object.entries(masterObj).map(([key]) => {
    dataFromDb.forEach((v, i) => {
      const startTime = new Date(v.start_time);
      if (key === String(startTime.getUTCDate()))
        masterObj[key].push({ index: i, cells: v });
    });
  });

  // for next time - i need to see how i can iterate over this to make a table per day, but when dragging it uses the unified index for the dragover animation
  // will need to have some way to do active.index

  const [rows, setRows] = useState([
    { id: "row1", cells: ["A1", "B1", "C1"] },
    { id: "row2", cells: ["A2", "B2", "C2"] },
    { id: "row3", cells: ["A3", "B3", "C3"] },
    { id: "row4", cells: ["A4", "B4", "C4"] },
    { id: "row5", cells: ["A5", "B5", "C5"] },
  ]);

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rows.findIndex((r) => r.id === active.id);
      const newIndex = rows.findIndex((r) => r.id === over.id);
      setRows(arrayMove(rows, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <table
        style={{ borderCollapse: "collapse", width: "100%", minWidth: "600px" }}
      >
        <thead>
          <tr>
            <th style={{ border: "1px solid gray", padding: "8px" }}>Col A</th>
            <th style={{ border: "1px solid gray", padding: "8px" }}>Col B</th>
            <th style={{ border: "1px solid gray", padding: "8px" }}>Col C</th>
          </tr>
        </thead>
        <SortableContext
          items={rows.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <tbody>
            {rows
              .filter((_, index) => index >= 0 && index <= 2)
              .map((row) => (
                <SortableRow key={row.id} id={row.id} cells={row.cells} />
              ))}
          </tbody>
        </SortableContext>
      </table>
      <table
        style={{ borderCollapse: "collapse", width: "100%", minWidth: "600px" }}
      >
        <thead>
          <tr>
            <th style={{ border: "1px solid gray", padding: "8px" }}>Col A</th>
            <th style={{ border: "1px solid gray", padding: "8px" }}>Col B</th>
            <th style={{ border: "1px solid gray", padding: "8px" }}>Col C</th>
          </tr>
        </thead>
        <SortableContext
          items={rows.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <tbody>
            {rows
              .filter((_, index) => index >= 3 && index <= 4)
              .map((row) => (
                <SortableRow key={row.id} id={row.id} cells={row.cells} />
              ))}
          </tbody>
        </SortableContext>
      </table>
    </DndContext>
  );
}
