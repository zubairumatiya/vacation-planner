import { PoolClient } from "pg";
import { Schedule } from "../types/app-types";

export default async function renumberIndexDb(
  tripId: string,
  client: PoolClient
): Promise<Schedule[]> {
  const result = await client.query(
    `WITH ordered AS (
      SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY start_time ASC, sort_index ASC) AS rn
      FROM trip_schedule
      WHERE trip_id = $1
      )
      UPDATE trip_schedule t
      SET sort_index = ordered.rn * 1000
      FROM ordered
      WHERE t.id = ordered.id
      RETURNING *;`,
    [tripId]
  );
  return result.rows;
}
