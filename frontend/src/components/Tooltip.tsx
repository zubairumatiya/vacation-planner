import { useState, useRef, useEffect, type ReactNode } from "react";

type TooltipProps = {
  label: string;
  shortcut?: string;
  children: ReactNode;
  position?: "top" | "bottom";
  wrapperStyle?: React.CSSProperties;
  topOffset?: string;
};

const Tooltip = ({
  label,
  shortcut,
  children,
  position = "bottom",
  wrapperStyle,
  topOffset,
}: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!visible || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const style: React.CSSProperties = {
      left: "50%",
      transform: "translateX(-50%)",
    };
    if (position === "top") {
      style.bottom = "100%";
      style.marginBottom = 6;
    } else {
      style.top = topOffset ?? "100%";
      style.marginTop = 6;
    }
    const tooltipWidth = 160;
    const overshootRight =
      rect.left + rect.width / 2 + tooltipWidth / 2 - window.innerWidth;
    if (overshootRight > 0) {
      style.left = undefined;
      style.right = 0;
      style.transform = "none";
    }
    const overshootLeft = -(rect.left + rect.width / 2 - tooltipWidth / 2);
    if (overshootLeft > 0) {
      style.left = 0;
      style.transform = "none";
    }
    setTooltipStyle(style);
  }, [visible, position]);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 150);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ position: "relative", display: "inline-flex", ...wrapperStyle }}
    >
      {children}
      {visible && (
        <div
          style={{
            position: "absolute",
            display: "flex",
            alignItems: "center",
            gap: shortcut ? "0.5rem" : undefined,
            whiteSpace: "nowrap",
            background: "#1e1e1e",
            border: "1px solid #3a3a3a",
            borderRadius: 7,
            padding: "0.2rem 0.45rem",
            fontSize: "0.7rem",
            color: "#e0e0e0",
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            ...tooltipStyle,
          }}
        >
          <span>{label}</span>
          {shortcut && (
            <span style={{ color: "#999", fontSize: "0.65rem" }}>
              {shortcut}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
