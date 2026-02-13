export default function camelToSpacedLower(input: string): string {
  return input
    .replace(/([A-Z])/g, " $1") //$1 is the matched part
    .toLowerCase()
    .trim();
}
