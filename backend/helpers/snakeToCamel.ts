export const snakeToCamel = (dbRows: object[]) => {
  //will change array in place
  dbRows.map((row: object, index) => {
    const newObj = {};
    for (const key in row) {
      const camelKey = key.replace(/_(\w)/g, (match, p1) => p1.toUpperCase()); // if no matches found (no _) then it will just return the string
      newObj[camelKey] = row[key];
    }
    dbRows[index] = newObj;
  });
};
