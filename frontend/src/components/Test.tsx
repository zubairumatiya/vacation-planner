import styles from "../styles/Test.module.css";
import { useState, useRef, useEffect } from "react";
import dragger from "../assets/dragger.svg";

type Item = {
  id: number;
  number1: number;
  number2: number;
};

const scheduleFromApi = [
  { id: 11, number1: 100, number2: 111 },
  {
    id: 22,
    number1: 200,
    number2: 222,
  },
  {
    id: 33,
    number1: 300,
    number2: 333,
  },
  { id: 44, number1: 400, number2: 444 },
  { id: 55, number1: 500, number2: 555 },
];

const Test = () => {
  const [schedule, setSchedule] = useState<Item[]>(scheduleFromApi);
  const dragIndexRef = useRef(-1); // hold index of payload we are dragging

  const handleDragStart = (
    e: React.DragEvent,
    itemID: number,
    index: number
  ) => {
    console.log("drag started");
    dragIndexRef.current = index;
    e.dataTransfer.setData("text/plain", String(itemID));
  };

  const handleDragDrop = (e: React.DragEvent) => {
    console.log("drag dropped");
    e.preventDefault();
    const target = e.target as HTMLElement;

    const targetIndex: number = Number(target.closest("tr")?.dataset.index);
    //const targetId = target.closest("tr")?.id; // might not need this
    const copy = schedule.slice(); // makes a copy of array but not the objects inside which remail references
    const removedElement = copy.splice(dragIndexRef.current, 1); // let's remove our drag element from the copy BUT now we will have an array

    //if (targetIndex === 0) {
    //  console.log("place at index 0");
    //  setSchedule([removedElement[0], ...copy]);
    //} else if (targetIndex > 0 && targetIndex < schedule.length - 1) {
    console.log("place in between");
    setSchedule([
      ...copy.slice(0, targetIndex),
      removedElement[0],
      ...copy.slice(targetIndex),
    ]);
    //} else if (targetIndex === schedule.length - 1) {
    //  console.log("place at end");
    //  setSchedule([...copy, removedElement[0]]);
    //}
    dragIndexRef.current = -1;
  };

  return (
    <table
      className={styles.table}
      onDrop={(e) => handleDragDrop(e)}
      onDragOver={(e) => e.preventDefault()}
    >
      <thead className={styles.thead}>
        <tr>
          <th>Drag-hide-this</th>
          <th>number1</th>
          <th>number2</th>
        </tr>
      </thead>
      <tbody>
        {schedule.map((v, i) => (
          <tr key={v.id} id={String(v.id)} data-index={i}>
            <td
              className={`${styles.td} ${
                dragIndexRef.current === i && styles.dragging
              }`}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, v.id, i)}
            >
              <img src={dragger} alt="dragger" className={styles.img} />
            </td>
            <td className={styles.td}>{v.number1}</td>
            <td className={styles.td}>{v.number2}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
export default Test;
