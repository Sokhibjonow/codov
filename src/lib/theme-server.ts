import { cookies } from "next/headers";
import { isThemeMode, THEME_COOKIE, type ThemeMode } from "./theme";

/** The theme the user picked, or null when the site follows the device setting. */
export async function getThemeMode(): Promise<ThemeMode | null> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemeMode(value) ? value : null;
}
