import styles from "../styles/Test.module.css";
import { useState, useRef, useEffect } from "react";
import dropDownArrow from "../assets/arrow-drop.svg";

const Test = () => {
  const [hideHours, setHideHours] = useState(true);
  const [hideMinutes, setHideMinutes] = useState(true);
  const minuteUlRef = useRef<HTMLUListElement>(null);
  const hourUlRef = useRef<HTMLUListElement>(null);
  const minuteButtonRef = useRef<HTMLButtonElement>(null);
  const hourButtonRef = useRef<HTMLButtonElement>(null);
  const [hourSelection, setHourSelection] = useState("");
  const [minuteSelection, setMinuteSelection] = useState("");
  const [focusedMinuteIndex, setFocusedMinuteIndex] = useState(0);
  const [focusedHourIndex, setFocusedHourIndex] = useState(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        minuteUlRef.current &&
        hourUlRef.current &&
        minuteButtonRef.current &&
        hourButtonRef.current &&
        !minuteUlRef.current.contains(e.target as Node) &&
        !hourUlRef.current.contains(e.target as Node) &&
        !minuteButtonRef.current.contains(e.target as Node) &&
        !hourButtonRef.current.contains(e.target as Node)
      ) {
        setHideHours(true);
        setHideMinutes(true);
      }

      if (
        hideMinutes === false &&
        hourButtonRef.current?.contains(e.target as Node)
      ) {
        setHideMinutes((prev) => !prev);
      }

      if (
        hideHours === false &&
        minuteButtonRef.current?.contains(e.target as Node)
      ) {
        setHideHours((prev) => !prev);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hideHours, hideMinutes]);

  const captureMinuteSelection = (e: React.MouseEvent) => {
    const li = e.target as HTMLLIElement;
    console.log(li.innerText);
    setMinuteSelection(li.innerText);
    setHideMinutes((prev) => !prev);
  };

  const captureHourSelection = (e: React.MouseEvent) => {
    const li = e.target as HTMLLIElement;
    console.log(li.innerText);
    setHourSelection(li.innerText);
    const toNumber = Number(li.innerText);
    setFocusedHourIndex(toNumber - 1);
    setHideHours((prev) => !prev);
  };

  const handleKeyDownForHour = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next =
        focusedHourIndex === null ? 0 : Math.min(focusedHourIndex + 1, 12);
      setFocusedHourIndex(next);
      const toString = String(next < 9 ? "0" + (next + 1) : next);
      setHourSelection(toString);
    }
  };

  return (
    <div className="flex">
      <form>
        <div className={styles.wrapper}>
          <div className={styles.inputWrapper}>
            <input
              className={styles.input}
              type="text"
              placeholder="hh"
              name="hourInput"
              id="hourInput"
              value={hourSelection}
              onChange={() => undefined}
              onClick={() => setHideHours((prev) => !prev)}
              onFocus={() => setHideHours(false)}
              onBlur={() => setHideHours(true)}
              onKeyDown={}
            />

            <div className={styles.dropDownWrapper}>
              <div>
                <button
                  className={styles.hourButton}
                  ref={hourButtonRef}
                  type="button"
                  onClick={() => setHideHours((prev) => !prev)}
                >
                  <img
                    src={dropDownArrow}
                    alt="dropDown"
                    className={`transition-transform duration-200 ${
                      hideHours ? "rotate-0" : "rotate-180"
                    }`}
                  />
                </button>
              </div>
              <div>
                <ul
                  ref={hourUlRef}
                  hidden={hideHours}
                  className={styles.scrollContainer}
                  onClick={captureHourSelection}
                >
                  {[...new Array(12)].map((_, i) => {
                    return (
                      <li
                        key={i}
                        className={`${styles.listItem} ${
                          i === focusedHourIndex && styles.focused
                        }`}
                      >
                        {i < 9 ? "0" + (i + 1) : i + 1}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.inputWrapper}>
            <input
              className={styles.input}
              type="text"
              placeholder="mm"
              name="minuteInput"
              id="minuteInput"
              value={minuteSelection}
              onChange={() => undefined}
              onClick={() => setHideMinutes((prev) => !prev)}
              onFocus={() => setHideMinutes(false)}
              onBlur={() => setHideMinutes(true)}
            />{" "}
            <div className={styles.dropDownWrapper}>
              <div>
                <button
                  className={styles.minuteButton}
                  ref={minuteButtonRef}
                  type="button"
                  onClick={() => setHideMinutes((prev) => !prev)}
                >
                  <img
                    src={dropDownArrow}
                    alt="dropDown"
                    className={`transition-transform duration-200 ${
                      hideMinutes ? "rotate-0" : "rotate-180"
                    }`}
                  />
                </button>
              </div>
              <div>
                <ul
                  hidden={hideMinutes}
                  className={styles.scrollContainer}
                  onClick={captureMinuteSelection}
                  ref={minuteUlRef}
                >
                  {[...new Array(60)].map((_, i) => {
                    return (
                      <li key={i} className={styles.listItem}>
                        {i < 10 ? "0" + i : i}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
          <div>
            <select name="meridiem" id="meridiem">
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Test;
