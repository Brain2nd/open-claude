export const resetLimits = { type: "local" as const, name: "reset-limits", description: "Reset rate limits", isEnabled: () => false, handler: async () => {} }
export const resetLimitsNonInteractive = resetLimits
