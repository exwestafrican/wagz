export default function buildUsername(
  firstname: string,
  lastname: string,
): string {
  return [firstname, lastname].map((name) => name.toLowerCase()).join('.');
}
