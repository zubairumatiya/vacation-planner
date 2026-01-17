import { PoolClient } from "pg";
import renumberIndexDb from "./renumberIndexDb.js";
import { UUID } from "crypto";
import { Schedule } from "../types/express.js";

type Chunk = {
  above?: { id: string; sortIndex: number };
  below?: { id: string; sortIndex: number };
};

type Body = {
  chunk: Chunk;
  start: string;
  tripId?: string;
  [key: string]: string | number | UUID | boolean | Chunk;
};

export default async function checkIndexSpacing(
  body: Body,
  client: PoolClient,
  paramTripId?: string | undefined,
  add?: boolean | undefined,
  itemId?: string
): Promise<number | Schedule[] | undefined> {
  const above = body.chunk.above?.sortIndex;
  const below = body.chunk.below?.sortIndex;
  const tripId = paramTripId ?? body.tripId;
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
        return undefined;
      } else {
        // UPDATE THE INDEX before sending! But we have problem, our renumbering is time and index dependent, we insert the new index, but not time, so it won't be accurate.
        const result = await client.query(
          "UPDATE trip_schedule SET start_time=$1, sort_index=$2 WHERE id=$3",
          [body.start, Math.floor((above + below) / 2), itemId]
        );
        if (result.rowCount < 1) {
          return undefined;
        }
        const renumRows = await renumberIndexDb(tripId, client);
        if (renumRows.length < 1) {
          // renumbering failed
          return undefined;
        }
        return renumRows;
      }
    } else {
      return Math.floor((above + below) / 2);
    }
  }
}
