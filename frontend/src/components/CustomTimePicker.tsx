import styles from "../styles/CustomTimePicker.module.css";
import { useState, useRef, useEffect } from "react";
import dropDownArrow from "../assets/arrow-drop.svg";

const CustomTimePicker = (props) => {
  const [hideHours, setHideHours] = useState(true);
  const [hideMinutes, setHideMinutes] = useState(true);
  const minuteUlRef = useRef<HTMLUListElement>(null);
  const hourUlRef = useRef<HTMLUListElement>(null);
  const minuteLiRef = useRef<HTMLLIElement>(null);
  const hourLiRef = useRef<HTMLLIElement>(null);
  const minuteButtonRef = useRef<HTMLButtonElement>(null);
  const hourButtonRef = useRef<HTMLButtonElement>(null);
  const [hourSelection, setHourSelection] = useState("");
  const [minuteSelection, setMinuteSelection] = useState("");
  const [meridiemSelection, setMeridiemSelection] = useState("");
  const [focusedMinuteIndex, setFocusedMinuteIndex] = useState<null | number>(
    null
  );
  const [focusedHourIndex, setFocusedHourIndex] = useState<null | number>(null);
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const skipNextHourFocus = useRef(false);
  const skipNextMinuteFocus = useRef(false);

  useEffect(() => {
    props.onChange(captureHourSelection, captureMinuteSelection);
  }, [hourSelection, minuteSelection, meridiemSelection]);

  useEffect(() => {
    if (hourInputRef.current !== null) {
      hourInputRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [hourLiRef]);

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
    const toNumber = Number(li.innerText);
    setFocusedMinuteIndex(toNumber);
    setHideMinutes((prev) => !prev);
  };

  const captureHourSelection = (e: React.MouseEvent) => {
    const li = e.target as HTMLLIElement;
    console.log(li.innerText);
    setHourSelection(li.innerText);
    hourLiRef.current = li;
    const toNumber = Number(li.innerText);
    setFocusedHourIndex(toNumber - 1);
    setHideHours((prev) => !prev);
  };

  const handleKeyDownForHour = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next =
        focusedHourIndex === null ? 0 : Math.min(focusedHourIndex + 1, 11);
      setFocusedHourIndex(next);
      const toString = String(next < 9 ? "0" + (next + 1) : next + 1);
      setHourSelection(toString);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const previous =
        focusedHourIndex === null ? 0 : Math.max(focusedHourIndex - 1, 0);
      setFocusedHourIndex(previous);
      const toString = String(
        previous < 9 ? "0" + (previous + 1) : previous + 1
      );
      setHourSelection(toString);
    } else if (e.code === "Space") {
      e.preventDefault();
      setHideHours((prev) => !prev);
    } else if (e.key === "Enter" && focusedHourIndex !== null) {
      e.preventDefault();
      setHideHours(true);
    }
  };

  const handleKeyDownForMinute = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next =
        focusedMinuteIndex === null ? 0 : Math.min(focusedMinuteIndex + 1, 59);
      setFocusedMinuteIndex(next);
      const toString = String(next < 9 ? "0" + next : next);
      setMinuteSelection(toString);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const previous =
        focusedMinuteIndex === null ? 0 : Math.max(focusedMinuteIndex - 1, 0);
      setFocusedMinuteIndex(previous);
      const toString = String(previous < 9 ? "0" + previous : previous);
      setMinuteSelection(toString);
    } else if (e.code === "Space") {
      e.preventDefault();
      console.log("space");
      setHideMinutes((prev) => !prev);
    } else if (e.key === "Enter" && focusedMinuteIndex !== null) {
      e.preventDefault();
      setHideMinutes(true);
    }
  };

  const handleHourToggleClick = () => {
    skipNextHourFocus.current = true;
    hourInputRef.current?.focus();
    setHideHours((prev) => !prev);
  };

  const handleMinuteToggleClick = () => {
    skipNextMinuteFocus.current = true;
    minuteInputRef.current?.focus();
    setHideMinutes((prev) => !prev);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const toNumber = Number(e.target.value);
    if (e.target.value === "" || e.target.value === "0") {
      setHourSelection("");
    }
    if (isNaN(toNumber)) {
      return;
    }
    if (toNumber > 0 && toNumber < 10) {
      setHourSelection("0" + toNumber);
      return;
    }
    if (e.target.value.length === 3) {
      if (e.target.value[2] === "0") {
        if (e.target.value[1] === "1") {
          setHourSelection("10");
        }
        return;
      }
      if (toNumber > 9 && toNumber < 13) {
        setHourSelection(String(toNumber));
        return;
      }
      setHourSelection("0" + e.target.value[2]);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const toNumber = Number(e.target.value);
    if (isNaN(toNumber)) {
      return;
    }
    if (e.target.value === "" || e.target.value === "0") {
      setMinuteSelection(e.target.value);
    }
    if (toNumber >= 0 && toNumber < 10) {
      setMinuteSelection("0" + toNumber);
    }
    if (toNumber > 9 && toNumber < 60) {
      setMinuteSelection(String(toNumber));
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
              onChange={handleHourChange} // TODO -- would like to allow specific type of key
              ref={hourInputRef}
              onFocus={() => {
                setHideMinutes(true);
                if (skipNextHourFocus.current) {
                  skipNextHourFocus.current = false;
                  return;
                }
                setHideHours(false);
              }}
              onKeyDown={handleKeyDownForHour}
            />

            <div className={styles.dropDownWrapper}>
              <div>
                <button
                  className={styles.hourButton}
                  ref={hourButtonRef}
                  type="button"
                  onClick={handleHourToggleClick}
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
                  onMouseDown={captureHourSelection}
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
              ref={minuteInputRef}
              value={minuteSelection}
              onChange={handleMinuteChange}
              //onClick={() => setHideMinutes(false)} // can do this if i want it open no matter how many times i click on input

              onFocus={() => {
                setHideHours(true);
                if (skipNextMinuteFocus.current) {
                  skipNextMinuteFocus.current = false;
                  return;
                }
                setHideMinutes(false);
              }}
              onKeyDown={handleKeyDownForMinute}
            />{" "}
            <div className={styles.dropDownWrapper}>
              <div>
                <button
                  className={styles.minuteButton}
                  ref={minuteButtonRef}
                  type="button"
                  onClick={handleMinuteToggleClick}
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
                      <li
                        key={i}
                        className={`${styles.listItem} ${
                          i === focusedMinuteIndex && styles.focused
                        }`}
                      >
                        {i < 10 ? "0" + i : i}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
          <div>
            <select
              name="meridiem"
              id="meridiem"
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setMeridiemSelection(e.target.value)
              }
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CustomTimePicker;
