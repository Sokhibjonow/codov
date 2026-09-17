import { cookies } from "next/headers";
import { isThemeMode, THEME_COOKIE, type ThemeMode } from "./theme";

export async function getThemeMode(): Promise<ThemeMode> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemeMode(value) ? value : "system";
}
