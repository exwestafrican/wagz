export default function normalizeUsername(username: string): string {
  return username.split('.').join('');
}
