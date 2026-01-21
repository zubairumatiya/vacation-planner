import styles from "../styles/CustomTimePicker.module.css";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import dropDownArrow from "../assets/arrow-drop.svg";

type Props = {
  onChange: (hour: string, minute: string, meridiem: string) => void;
  className: string | undefined;
  preTime: () => string | undefined;
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
    null
  );
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const skipNextHourFocus = useRef(false);
  const skipNextMinuteFocus = useRef(false);
  const hourImageRef = useRef<HTMLImageElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [hourAnchor, setHourAnchor] = useState<HTMLElement | null>(null);
  const [minuteBlurCheck, setMinuteBlurCheck] = useState<boolean>(false);
  const [hourBlurCheck, setHourBlurCheck] = useState<boolean>(false);
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

  /* useEffect(() => {
    if (props.preTime) {
      const preTime = props.preTime();
      if (preTime == null) return;
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
  }, []);*/

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
    setAnchor(hideMinutes ? null : minuteButtonRef.current);
  }, [hideMinutes]);

  /*
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
        return;
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
  */

  // SHOULD BE
  // clicking on input = false
  // clicking on button = toggle
  // focusing in = false (show)
  // focusing out = true (hide)
  // PROBLEM
  //clicking button
  // --> unfocuses input
  // --> true (hide)
  // --> focuses on input again
  // --> false (show)

  // the problem seems to be focus. in an ideal world, a click on input or button would not unfocus it
  // maybe we don't need focus at all, anyone who is using tab to focus elements won't start scrolling seeking a number, although it is almost trained when a dropdown pops up to use it.

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      //const isFocused
      if (hourInputRef.current?.contains(e.target as Node)) {
        console.log("hqwouihre");
        //setHideHours(true);
      } else {
        //setHideHours(true);
      }
      if (minuteInputRef.current?.contains(e.target as Node)) {
        //setHideMinutes(true);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (hourInputRef.current?.contains(e.target as Node)) {
        setHideHours(false);
      } else if (hourButtonRef.current?.contains(e.target as Node)) {
        if (hideHours === true) {
          debugger;
          hourInputRef.current?.focus();
        }
        setHideHours((prev) => !prev);
      } else if (hourUlRef.current?.contains(e.target as Node)) {
        setHideHours(true);
      } else if (minuteInputRef.current?.contains(e.target as Node)) {
        setHideMinutes(false);
      } else if (minuteButtonRef.current?.contains(e.target as Node)) {
        setHideMinutes((prev) => !prev);
      } else if (minuteUlRef.current?.contains(e.target as Node)) {
        setHideMinutes(true);
      } else {
        setHideHours(true);
        setHideMinutes(true);
      }
    };

    document.addEventListener("focusout", handleFocus);
    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  useEffect(() => {
    if (hideHours === false) {
      //
    }

    // I want to focus into input when button is clicked so I can type numbers
  }, [hideHours]);

  /*

  function Dropdown({
    anchorEl,
    children,
  }: {
    anchorEl: HTMLElement | null;
    children: React.ReactNode;
  }) {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
      if (!anchorEl) return;

      const updatePosition = () => setRect(anchorEl.getBoundingClientRect());

      updatePosition(); // initial position

      // Find scrollable ancestor elements
      const scrollParents: HTMLElement[] = [];
      let parent = anchorEl.parentElement;
      while (parent) {
        const overflowY = getComputedStyle(parent).overflowY;
        if (overflowY === "auto" || overflowY === "scroll") {
          scrollParents.push(parent);
        }
        parent = parent.parentElement;
      }

      // Add scroll listeners to ancestors
      const onScroll = () => updatePosition();
      scrollParents.forEach((el) =>
        el.addEventListener("scroll", onScroll, true)
      );

      // Add window scroll and resize listeners separately
      const onResize = () => updatePosition();
      window.addEventListener("scroll", onScroll);
      window.addEventListener("resize", onResize);

      return () => {
        scrollParents.forEach((el) =>
          el.removeEventListener("scroll", onScroll, true)
        );
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
      };
    }, [anchorEl]);

    if (!anchorEl || !rect) return null;

    return createPortal(
      <div
        style={{
          position: "absolute",
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          zIndex: 10,
        }}
      >
        {children}
      </div>,
      document.body
    );
  }
*/
  const captureMinuteSelection = (e: React.MouseEvent) => {
    const li = e.target as HTMLLIElement;
    console.log(li.innerText);
    setMinuteSelection(li.innerText);
    minuteLiRef.current = li;
    const toNumber = Number(li.innerText);
    setFocusedMinuteIndex(toNumber);
    //setHideMinutes((prev) => !prev);
  };

  const captureHourSelection = (e: React.MouseEvent) => {
    const li = e.target as HTMLLIElement;
    console.log(li.innerText);
    setHourSelection(li.innerText);
    hourLiRef.current = li;
    const toNumber = Number(li.innerText);
    setFocusedHourIndex(toNumber - 1);
    //setHideHours((prev) => !prev);
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
    //NEED TODO - change the scrollinto behavior on the number we type
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
      console.log(toNumber);
      setFocusedHourIndex(Number(e.target.value[2]) - 1);
      setHourSelection("0" + e.target.value[2]);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    ////NEED TODO - change the scrollinto behavior on the number we type
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
            onChange={handleHourChange} // TODO -- would like to allow specific type of key
            ref={hourInputRef}
            /*
            onFocus={() => {
              setHideMinutes(true);
              if (skipNextHourFocus.current) {
                skipNextHourFocus.current = false;
                return;
              }
              setHideHours(false);
            }}
            onBlur={() => {
              setHideHours((prev) => !prev);
              setHourBlurCheck(true);
              setTimeout(() => {
                setHourBlurCheck(false);
              }, 250);
            }}
            */
            onKeyDown={handleKeyDownForHour}
          />

          <div className={styles.dropDownWrapper}>
            <div>
              <button
                className={styles.hourButton}
                ref={hourButtonRef}
                type="button"
                tabIndex={-1}
                /*
                onClick={() => {
                  if (hourBlurCheck) {
                    setHourBlurCheck(false);
                  } else {
                    handleHourToggleClick();
                  }
                }}
                  */
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
            //onClick={() => setHideMinutes(false)} // can do this if i want it open no matter how many times i click on input
            /*
            onFocus={() => {
              setHideHours(true);
              if (skipNextMinuteFocus.current) {
                skipNextMinuteFocus.current = false;
                return;
              }
              setHideMinutes(false);
            }}
            onBlur={() => {
              setHideMinutes((prev) => !prev);
              setMinuteBlurCheck(true);
              setTimeout(() => {
                setMinuteBlurCheck(false);
              }, 250);
            }}*/
            onKeyDown={handleKeyDownForMinute}
          />{" "}
          <div className={styles.dropDownWrapper}>
            <div>
              <button
                className={styles.minuteButton}
                ref={minuteButtonRef}
                type="button"
                tabIndex={-1}
                /*
                onClick={() => {
                  if (minuteBlurCheck) {
                    setMinuteBlurCheck(false);
                  } else {
                    handleMinuteToggleClick();
                  }
                }}
                  */
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
