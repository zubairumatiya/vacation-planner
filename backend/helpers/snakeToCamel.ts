export function snakeToCamel<T>(rows: T[]): void {
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key.includes("_")) {
        const camelKey = key.replace(/_(\w)/g, (_, p1) => p1.toUpperCase());

        (row as Record<string, unknown>)[camelKey] = (
          row as Record<string, unknown>
        )[key];

        delete (row as Record<string, unknown>)[key];
      }
    }
  }
}
