// Map fill colors (dark theme background)
export const getVisitCountFill = (count: number, isNative: boolean): string => {
  if (isNative) return "#34d399"; // emerald green reserved for native
  if (count >= 6) return "#f87171";
  if (count >= 4) return "#fb923c";
  if (count >= 2) return "#facc15";
  return "#e8e4d9"; // 1 visit - offwhite
};

// Hover variants
export const getVisitCountHoverFill = (count: number, isNative: boolean): string => {
  if (isNative) return "#10b981";
  if (count >= 6) return "#ef4444";
  if (count >= 4) return "#f97316";
  if (count >= 2) return "#eab308";
  return "#d4d0c5"; // 1 visit hover
};

// Pressed variants
export const getVisitCountPressedFill = (count: number, isNative: boolean): string => {
  if (isNative) return "#059669";
  if (count >= 6) return "#dc2626";
  if (count >= 4) return "#ea580c";
  if (count >= 2) return "#ca8a04";
  return "#c0bcb1"; // 1 visit pressed
};

// For (xN) text color in travel log / friend cards
export const getVisitCountTextColor = (count: number, isNative: boolean): string => {
  if (isNative) return "#34d399";
  if (count >= 6) return "#f87171";
  if (count >= 4) return "#fb923c";
  if (count >= 2) return "#fbbf24";
  return "#ffffff"; // 1 visit - white
};

// Format the visit count label
export const formatVisitCount = (count: number, isNative: boolean): string => {
  if (isNative) return "∞";
  return `x${count}`;
};
