const SKIP_PREFIXES = [
  "walk", "walk to", "walking", "walking to",
  "drive", "drive to", "driving", "driving to",
  "go to", "head to", "heading to", "continue to", "proceed to", "travel to",
  "take", "take the", "ride", "ride to", "riding", "use",
  "take bus", "take the bus",
  "take train", "take the train",
  "take subway", "take the subway",
  "take metro", "take the metro",
  "take tram", "take the tram",
  "take ferry", "take the ferry",
  "take taxi", "take uber", "take lyft",
  "take flight", "fly", "fly to", "flying to",
  "transfer", "transfer to", "change to", "switch to",
  "get on", "get off", "board", "depart", "arrive", "exit at",
  "follow", "follow signs", "continue on",
  "commute", "commute to", "catch", "catch the", "hop on", "hop off",
].sort((a, b) => b.length - a.length);

export function isTransitItem(location: string): boolean {
  const lower = location.toLowerCase().trim();
  return SKIP_PREFIXES.some(
    (prefix) =>
      lower === prefix || lower.startsWith(prefix + " "),
  );
}
