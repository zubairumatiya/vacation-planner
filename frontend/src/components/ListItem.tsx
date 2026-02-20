import styles from "../styles/WantToSee.module.css";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import CheckBubble from "./CheckBubble";
import { useState, useRef, useEffect } from "react";

const TIME_OPTIONS = [
  { label: "12:00 AM", value: "00:00" },
  { label: "3:00 AM", value: "03:00" },
  { label: "6:00 AM", value: "06:00" },
  { label: "9:00 AM", value: "09:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "3:00 PM", value: "15:00" },
  { label: "6:00 PM", value: "18:00" },
  { label: "9:00 PM", value: "21:00" },
];

const LONG_PRESS_MS = 500;

const ListItem = ({
  v,
  i,
  editItem,
  handleCheckItem,
  activeListId,
  isMobile,
  days,
  onMobileAddToSchedule,
}: ListItemProps) => {
  const draggable = useDraggable({
    id: v.id,
    data: { type: "list" } as DragData,
    disabled: isMobile || activeListId === v.id,
  });

  const useDrag = !isMobile && activeListId !== v.id;
  const style = useDrag
    ? { transform: CSS.Translate.toString(draggable.transform!) }
    : {};

  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState(TIME_OPTIONS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const clearTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = () => {
    clearTimer();
    longPressTimerRef.current = setTimeout(() => {
      if (days && days.length > 0) {
        setSelectedDay(days[0].day);
      }
      setShowDropdown(true);
    }, LONG_PRESS_MS);
  };

  const handleConfirm = async () => {
    if (!onMobileAddToSchedule || !selectedDay || submitting) return;
    setSubmitting(true);
    await onMobileAddToSchedule(v.id, selectedDay, selectedTime);
    setSubmitting(false);
    setShowDropdown(false);
  };

  const mobileHandlers = isMobile
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          startLongPress();
        },
        onTouchEnd: clearTimer,
        onTouchMove: clearTimer,
        onMouseDown: startLongPress,
        onMouseUp: clearTimer,
        onMouseLeave: clearTimer,
      }
    : {};

  return (
    <li key={v.id} id={String(v.id)} className={`${styles.listItem}`}>
      <div
        className={styles.checkBubbleWrapper}
        onClick={(e) => handleCheckItem(e, v.itemAdded, v.id, i)}
      >
        <CheckBubble checked={v.itemAdded} />
      </div>
      <div
        className={`${styles.itemValueWrapper}`}
        style={{ position: "relative" }}
      >
        {activeListId === v.id ? (
          <div
            onDoubleClick={(e) => editItem(e, i, v.id)}
            className={`${styles.itemValue} ${v.itemAdded && styles.itemChecked} ${isMobile ? styles.itemValueMobile : ""}`}
          >
            {v.value}
          </div>
        ) : (
          <div
            onDoubleClick={(e) => editItem(e, i, v.id)}
            className={`${styles.itemValue} ${v.itemAdded && styles.itemChecked} ${isMobile ? styles.itemValueMobile : ""}`}
            ref={useDrag ? draggable.setNodeRef : undefined}
            {...(useDrag ? draggable.attributes : {})}
            {...(useDrag ? draggable.listeners : {})}
            style={useDrag ? style : undefined}
            {...mobileHandlers}
          >
            {v.value}
          </div>
        )}
        {showDropdown && isMobile && days && (
          <div ref={dropdownRef} className={styles.mobileDropdown}>
            <div className={styles.dropdownField}>
              <label htmlFor={`day-select-${v.id}`}>Day</label>
              <select
                id={`day-select-${v.id}`}
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className={styles.dropdownSelect}
              >
                {days.map((d) => (
                  <option key={d.day} value={d.day}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.dropdownField}>
              <label htmlFor={`time-select-${v.id}`}>Time</label>
              <select
                id={`time-select-${v.id}`}
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className={styles.dropdownSelect}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.dropdownActions}>
              <button
                type="button"
                className={`btnPrimary ${styles.dropdownConfirm}`}
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? "Adding..." : "Add to Schedule"}
              </button>
              <button
                type="button"
                className={styles.dropdownCancel}
                onClick={() => setShowDropdown(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
};

export default ListItem;
