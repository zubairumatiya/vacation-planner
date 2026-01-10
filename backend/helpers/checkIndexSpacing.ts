import renumberIndexDb from "./renumberIndexDb.js";

type Chunk = {
  above?: { id: string; sortIndex: number };
  below?: { id: string; sortIndex: number };
};

export default async function checkIndexSpacing(
  chunk: Chunk,
  tripId: string,
  add?: boolean | undefined
): Promise<number | null | undefined> {
  const above = chunk.above?.sortIndex;
  const below = chunk.below?.sortIndex;
  console.log("aboveId:", chunk.above?.id, "belowId:", chunk.above?.id);
  if (above == null && below == null) {
    return 0;
  } else if (above == null) {
    console.log("No above in chunk");
    return below - 1000;
  } else if (below == null) {
    console.log("No below in chunk");
    return above + 1000;
  } else {
    if (below - above <= 4) {
      console.log("TOO CLOSE...reindexing");
      // the same as middle - above <= 2 || below - middle <= 2 but easier to read represents the gap
      if (add) {
        return null;
      } else {
        const rowCount = await renumberIndexDb(tripId);
        if (rowCount < 1) {
          // renumbering failed
          return undefined;
        }
        return null;
      }
    } else {
      console.log("our middle spot:", Math.floor((above + below) / 2));
      return Math.floor((above + below) / 2);
    }
  }
}
