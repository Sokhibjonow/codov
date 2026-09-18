// Phone helpers that are safe to use in the browser too.

/** +998901234567 → +998 90 123 45 67 */
export function formatPhone(phone: string | null) {
  if (!phone) return "";
  const m = phone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

/** Input mask for Uzbek numbers: whatever is typed becomes "+998 (90) 123-45-67". */
export function maskUzPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  if (!digits) return "";
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  let out = `+998 (${parts[0]}`;
  if (digits.length >= 2) out += ")";
  if (parts[1]) out += ` ${parts[1]}`;
  if (parts[2]) out += `-${parts[2]}`;
  if (parts[3]) out += `-${parts[3]}`;
  return out;
}
