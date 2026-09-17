import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

// No look-alike characters (0/O, 1/l/I) so passwords are easy to dictate to students
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 8) {
  let result = "";
  for (let i = 0; i < length; i++) result += ALPHABET[randomInt(ALPHABET.length)];
  return result;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
