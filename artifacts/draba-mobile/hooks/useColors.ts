import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useThemeStore } from "@/store/themeStore";

/**
 * Returns the design tokens for the current effective color scheme.
 *
 * Theme preference is stored in themeStore:
 *   "light"  → always light palette
 *   "dark"   → always dark palette
 *   "system" → follows device appearance setting
 */
export function useColors() {
  const scheme = useColorScheme();
  const { theme } = useThemeStore();

  const effective = theme === "system" ? scheme : theme;
  const palette = effective === "dark" ? colors.dark : colors.light;

  return { ...palette, radius: colors.radius };
}
