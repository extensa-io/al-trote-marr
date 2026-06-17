export const ALLOWED_EMAILS = (
  process.env.ALLOWED_EMAILS ?? "nestor.daza@gmail.com,lilo.ayala@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAllowed(email?: string | null): boolean {
  return !!email && ALLOWED_EMAILS.includes(email.toLowerCase());
}
