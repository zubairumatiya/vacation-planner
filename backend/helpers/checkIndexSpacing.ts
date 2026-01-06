import renumberIndexDb from "./renumberIndexDb";

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

  if (above == null && below == null) {
    return 0;
  } else if (above == null) {
    return below - 1000;
  } else if (below == null) {
    return above + 1000;
  } else {
    if (below - above <= 4) {
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
      return Math.floor((above + below) / 2);
    }
  }
}
