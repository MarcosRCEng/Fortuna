function readBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export const featureFlags = {
  enableIsometricCity: readBooleanFlag(import.meta.env.VITE_ENABLE_ISOMETRIC_CITY),
} as const;
