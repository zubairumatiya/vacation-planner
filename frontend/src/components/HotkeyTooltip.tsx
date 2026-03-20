import type { ReactNode } from "react";
import Tooltip from "./Tooltip";

type HotkeyTooltipProps = {
  label: string;
  shortcut: string;
  children: ReactNode;
  position?: "top" | "bottom";
  wrapperStyle?: React.CSSProperties;
  topOffset?: string;
};

const HotkeyTooltip = ({
  label,
  shortcut,
  children,
  position = "bottom",
  wrapperStyle,
  topOffset,
}: HotkeyTooltipProps) => (
  <Tooltip label={label} shortcut={shortcut} position={position} wrapperStyle={wrapperStyle} topOffset={topOffset}>
    {children}
  </Tooltip>
);

export default HotkeyTooltip;
