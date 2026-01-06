import db from "../db/db.js";

export default async function renumberIndexDb(tripId: string): Promise<number> {
  await db.query("BEGIN");
  try {
    const result = await db.query(
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
      WHERE t.id = ordered.id;`,
      [tripId]
    );
    await db.query("COMMIT");
    console.log(`Updated rows: ${result.rowCount}`);
    return result.rowCount;
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}
