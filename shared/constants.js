export const DEBUG = false;
export const SCHEMA_VERSION = 1;
export const MAX_RULES = 20;
export const MAX_RULE_LENGTH = 200;
export const MAX_PLATFORMS = 50;
export const INTERVAL_HOURS = [1, 2, 3, 4, 6, 8, 12];
export const BYPASS_HOLD_MS = 5000;

// Production hosts verified against official sources; see IMPLEMENTATION.md.
export const BUILT_IN_PLATFORMS = [
  { id: 'tradovate', name: 'Tradovate', hostname: 'trader.tradovate.com', builtIn: true },
  { id: 'topstepx', name: 'TopstepX', hostname: 'topstepx.com', builtIn: true },
  { id: 'tradesea', name: 'TradeSea', hostname: 'app.tradesea.ai', builtIn: true },
];

export const EXAMPLE_RULES = [
  'Only trade my setup', 'Never move my stop',
  'Never add to a losing trade', 'Accept the risk before entering',
];

export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    onboardingComplete: false,
    enabled: true,
    rules: [],
    platforms: BUILT_IN_PLATFORMS.map(p => ({ ...p, enabled: false })),
    promptSettings: { mode: 'tab', intervalHours: 4 },
    confirmation: { lastConfirmedAt: null, lastConfirmedLocalDate: null },
  };
}
