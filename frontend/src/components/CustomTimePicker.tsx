import styles from "../styles/CustomTimePicker.module.css";
import { useState, useRef, useEffect } from "react";
import dropDownArrow from "../assets/icons/arrow-drop.svg";

type Props = {
  onChange: (hour: string, minute: string, meridiem: string) => void;
  className: string | undefined;
  preTime: () => string | undefined;
  focusRef?: React.RefObject<HTMLInputElement | null>;
};

const CustomTimePicker = (props: Props) => {
  const [hideHours, setHideHours] = useState(true);
  const [hideMinutes, setHideMinutes] = useState(true);
  const hourUlRef = useRef<HTMLUListElement>(null);
  const minuteUlRef = useRef<HTMLUListElement>(null);
  const hourLiRef = useRef<HTMLLIElement>(null);
  const minuteLiRef = useRef<HTMLLIElement>(null);
  const hourButtonRef = useRef<HTMLButtonElement>(null);
  const minuteButtonRef = useRef<HTMLButtonElement>(null);
  const [hourSelection, setHourSelection] = useState("");
  const [minuteSelection, setMinuteSelection] = useState("");
  const [meridiemSelection, setMeridiemSelection] = useState("AM");
  const [focusedHourIndex, setFocusedHourIndex] = useState<null | number>(null);
  const [focusedMinuteIndex, setFocusedMinuteIndex] = useState<null | number>(
    null,
  );
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const hourImageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (!loaded) {
      if (props.preTime) {
        const preTime = props.preTime();
        if (preTime == null) {
          setLoaded(true);
          return;
        }
        const hourNMinute = preTime.split(":");
        const justMinute = hourNMinute[1].split(" ")[0];
        const getMeridiem = preTime.split(" ")[1];
        if (Number(hourNMinute[0]) < 10) {
          setHourSelection("0" + hourNMinute[0]);
        } else {
          setHourSelection(hourNMinute[0]);
        }
        setMinuteSelection(justMinute);
        setMeridiemSelection(getMeridiem);
      }
      setLoaded(true);
    } else {
      props.onChange(hourSelection, minuteSelection, meridiemSelection);
    }
  }, [hourSelection, minuteSelection, meridiemSelection, loaded]);

  useEffect(() => {
    if (hourSelection) {
      if (!minuteSelection) {
        setMinuteSelection("00");
      }
    }
  }, [hourSelection]);

  useEffect(() => {
    if (minuteSelection) {
      if (!hourSelection) {
        setHourSelection("01");
      }
    }
  }, [minuteSelection]);

  useEffect(() => {
    if (hourLiRef.current !== null) {
      hourLiRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [hideHours, hourSelection]);

  useEffect(() => {
    if (minuteLiRef.current !== null) {
      minuteLiRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [hideMinutes, minuteSelection]);

  useEffect(() => {
    const keyDownIsTab = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (document.activeElement === hourInputRef.current) {
          setHideHours(false);
          setHideMinutes(true);
        } else if (document.activeElement === minuteInputRef.current) {
          setHideHours(true);
          setHideMinutes(false);
        } else {
          setHideHours(true);
          setHideMinutes(true);
        }
      }
    };

    const handleClick = (e: MouseEvent | KeyboardEvent) => {
      if (hourButtonRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        hourInputRef.current?.focus();
      }

      if (hourInputRef.current?.contains(e.target as Node)) {
        setHideHours(false);
      } else if (hourButtonRef.current?.contains(e.target as Node)) {
        if (hideHours === true) {
          hourInputRef.current?.focus();
        }
        setHideHours((prev) => !prev);
      } else if (hourUlRef.current?.contains(e.target as Node)) {
        setHideHours(true);
      } else if (minuteInputRef.current?.contains(e.target as Node)) {
        setHideMinutes(false);
      } else if (minuteButtonRef.current?.contains(e.target as Node)) {
        if (hideMinutes === true) {
          minuteInputRef.current?.focus();
        }
        setHideMinutes((prev) => !prev);
      } else if (minuteUlRef.current?.contains(e.target as Node)) {
        setHideMinutes(true);
      } else {
        setHideHours(true);
        setHideMinutes(true);
      }
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("keyup", keyDownIsTab);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keyup", keyDownIsTab);
    };
  }, []);

  useEffect(() => {
    if (hideHours === false) {
      setHideMinutes(true);
    }
  }, [hideHours]);

  useEffect(() => {
    if (hideMinutes === false) {
      setHideHours(true);
    }
  }, [hideMinutes]);

  const captureMinuteSelection = (e: React.MouseEvent) => {
    const li = e.target as HTMLLIElement;
    setMinuteSelection(li.innerText);
    minuteLiRef.current = li;
    const toNumber = Number(li.innerText);
    setFocusedMinuteIndex(toNumber);
  };

  const captureHourSelection = (e: React.MouseEvent) => {
    const li = e.target as HTMLLIElement;
    setHourSelection(li.innerText);
    hourLiRef.current = li;
    const toNumber = Number(li.innerText);
    setFocusedHourIndex(toNumber - 1);
  };

  const handleKeyDownForHour = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      let next;
      if (focusedHourIndex === 11) {
        next = 0;
      } else {
        next = focusedHourIndex === null ? 0 : focusedHourIndex + 1;
      }
      setFocusedHourIndex(next);

      const toString = String(next < 9 ? "0" + (next + 1) : next + 1);
      setHourSelection(toString);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      let previous;
      if (focusedHourIndex === null || focusedHourIndex === 0) {
        previous = 11;
      } else {
        previous = focusedHourIndex - 1;
      }
      setFocusedHourIndex(previous);

      const toString = String(
        previous < 9 ? "0" + (previous + 1) : previous + 1,
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
      let next;
      if (focusedMinuteIndex === 59) {
        next = 0;
      } else {
        next = focusedMinuteIndex === null ? 0 : focusedMinuteIndex + 1;
      }
      setFocusedMinuteIndex(next);

      const toString = String(next < 10 ? "0" + next : next);
      setMinuteSelection(toString);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      let previous = null;
      if (focusedMinuteIndex === null || focusedMinuteIndex === 0) {
        previous = 59;
      } else {
        previous = focusedMinuteIndex - 1;
      }
      setFocusedMinuteIndex(previous);
      const toString = String(previous < 9 ? "0" + previous : previous);
      setMinuteSelection(toString);
    } else if (e.code === "Space") {
      e.preventDefault();
      setHideMinutes((prev) => !prev);
    } else if (e.key === "Enter" && focusedMinuteIndex !== null) {
      e.preventDefault();
      setHideMinutes(true);
    }
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const toNumber = Number(e.target.value);
    if (e.target.value === "" || e.target.value === "0") {
      setFocusedHourIndex(0);
      setHourSelection("");
      return;
    }
    if (isNaN(toNumber)) {
      return;
    }
    if (toNumber > 0 && toNumber < 10) {
      setFocusedHourIndex(toNumber - 1);
      setHourSelection("0" + toNumber);
      return;
    }
    if (e.target.value.length === 3) {
      if (e.target.value[2] === "0") {
        if (e.target.value[1] === "1") {
          setFocusedHourIndex(9);
          setHourSelection("10");
        }
        return;
      }
      if (toNumber > 9 && toNumber < 13) {
        setFocusedHourIndex(toNumber - 1);
        setHourSelection(String(toNumber));
        return;
      }
      setFocusedHourIndex(Number(e.target.value[2]) - 1);
      setHourSelection("0" + e.target.value[2]);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const toNumber = Number(e.target.value);
    if (isNaN(toNumber)) {
      return;
    }
    if (e.target.value === "" || e.target.value === "0") {
      setFocusedMinuteIndex(0);
      setMinuteSelection(e.target.value);
    }
    if (toNumber >= 0 && toNumber < 10) {
      setFocusedMinuteIndex(toNumber);
      setMinuteSelection("0" + toNumber);
    }
    if (toNumber > 9 && toNumber < 60) {
      setFocusedMinuteIndex(toNumber);
      setMinuteSelection(String(toNumber));
    }
  };

  const combinedRef = (el: HTMLInputElement) => {
    hourInputRef.current = el;
    if (props.focusRef) props.focusRef.current = el;
  };

  return (
    <div className="flex">
      <div className={styles.wrapper}>
        <div className={styles.inputWrapper}>
          <input
            className={`${styles.input} ${props.className}`}
            type="text"
            placeholder="hh"
            name="hourInput"
            id="hourInput"
            value={hourSelection}
            onChange={handleHourChange}
            ref={combinedRef}
            onKeyDown={handleKeyDownForHour}
          />

          <div className={styles.dropDownWrapper}>
            <div>
              <button
                className={styles.hourButton}
                ref={hourButtonRef}
                type="button"
                tabIndex={-1}
              >
                <img
                  src={dropDownArrow}
                  alt="dropDown"
                  className={`transition-transform duration-200 ${
                    hideHours ? "rotate-0" : "rotate-180"
                  }`}
                  ref={hourImageRef}
                />
              </button>
            </div>

            <ul
              ref={hourUlRef}
              hidden={hideHours}
              className={styles.scrollContainer}
              onMouseDown={captureHourSelection}
              tabIndex={-1}
            >
              {[...new Array(12)].map((_, i) => {
                return (
                  <li
                    key={i}
                    id={i + ""}
                    ref={i === focusedHourIndex ? hourLiRef : null}
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

        <div className={styles.inputWrapper}>
          <input
            className={`${styles.input} ${props.className}`}
            type="text"
            placeholder="mm"
            name="minuteInput"
            id="minuteInput"
            ref={minuteInputRef}
            value={minuteSelection}
            onChange={handleMinuteChange}
            onKeyDown={handleKeyDownForMinute}
          />{" "}
          <div className={styles.dropDownWrapper}>
            <div>
              <button
                className={styles.minuteButton}
                ref={minuteButtonRef}
                type="button"
                tabIndex={-1}
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
                onMouseDown={captureMinuteSelection}
                ref={minuteUlRef}
                tabIndex={-1}
              >
                {[...new Array(60)].map((_, i) => {
                  return (
                    <li
                      key={i}
                      id={i + ""}
                      ref={i === focusedMinuteIndex ? minuteLiRef : null}
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
            className={styles.meridiem}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setMeridiemSelection(e.target.value)
            }
            onFocus={() => {
              setHideMinutes(true);
            }}
            value={meridiemSelection}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default CustomTimePicker;
