export const ADMIN_EMAILS = [
  'akashbehera599@gmail.com',
  'akstarofficial732@gmail.com'
].map(e => e.toLowerCase());

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
