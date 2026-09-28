export const DEBUG = false;
export const SCHEMA_VERSION = 1;
export const MAX_RULES = 20;
export const MAX_RULE_LENGTH = 200;
export const MAX_CUSTOM_PLATFORMS = 50;
export const INTERVAL_HOURS = [1, 2, 3, 4, 6, 8, 12];
export const BYPASS_HOLD_MS = 5000;

export const PLATFORM_CATEGORIES = [
  { id: 'futures', label: 'Futures' },
  { id: 'stocks', label: 'Stocks & multi-asset' },
  { id: 'fx', label: 'FX & CFDs' },
];

// Public trading hosts checked against official sources; see PLATFORM_PROPOSAL.md.
// Categories are for browsing, not a guarantee of each account's available products.
export const BUILT_IN_PLATFORMS = [
  { id: 'tradovate', name: 'Tradovate', hostname: 'trader.tradovate.com', category: 'futures', builtIn: true },
  { id: 'topstepx', name: 'TopstepX', hostname: 'topstepx.com', category: 'futures', builtIn: true },
  { id: 'tradesea', name: 'TradeSea', hostname: 'app.tradesea.ai', category: 'futures', builtIn: true },
  { id: 'tradingview', name: 'TradingView', hostname: 'www.tradingview.com', category: 'stocks', builtIn: true },
  { id: 'ninjatrader', name: 'NinjaTrader Web', hostname: 'web.ninjatrader.com', category: 'futures', builtIn: true },
  { id: 'ironbeam', name: 'Ironbeam', hostname: 'trade.ironbeam.com', category: 'futures', builtIn: true },
  { id: 'cqg', name: 'CQG Desktop / Web', hostname: 'm.cqg.com', category: 'futures', builtIn: true },
  { id: 'rithmic', name: 'Rithmic Web', hostname: 'rtraderpro.rithmic.com', category: 'futures', builtIn: true },
  { id: 'thinkorswim', name: 'thinkorswim Web (Schwab)', hostname: 'trade.thinkorswim.com', category: 'stocks', builtIn: true },
  { id: 'webull', name: 'Webull WebTrade', hostname: 'app.webull.com', category: 'stocks', builtIn: true },
  { id: 'robinhood', name: 'Robinhood / Legend', hostname: 'robinhood.com', category: 'stocks', builtIn: true },
  { id: 'ibkr', name: 'Interactive Brokers (IBKR)', hostname: 'portal.interactivebrokers.com', category: 'stocks', builtIn: true },
  { id: 'tradestation', name: 'TradeStation Web', hostname: 'webtrading.tradestation.com', category: 'stocks', builtIn: true },
  { id: 'fidelity', name: 'Fidelity Trader+ Web', hostname: 'digital.fidelity.com', category: 'stocks', builtIn: true },
  { id: 'saxo', name: 'SaxoTrader', hostname: 'www.saxotrader.com', category: 'stocks', builtIn: true },
  { id: 'etoro', name: 'eToro', hostname: 'www.etoro.com', category: 'stocks', builtIn: true },
  { id: 'zerodha', name: 'Zerodha Kite', hostname: 'kite.zerodha.com', category: 'stocks', builtIn: true },
  { id: 'dhan', name: 'Dhan TradingView', hostname: 'tv.dhan.co', category: 'stocks', builtIn: true },
  { id: 'fyers', name: 'FYERS Trader', hostname: 'trade.fyers.in', category: 'stocks', builtIn: true },
  { id: 'upstox', name: 'Upstox Pro', hostname: 'pro.upstox.com', category: 'stocks', builtIn: true },
  { id: 'oanda', name: 'OANDA Web', hostname: 'trade.oanda.com', category: 'fx', builtIn: true },
  { id: 'forexcom', name: 'FOREX.com Web Trader', hostname: 'webtrader.forex.com', category: 'fx', builtIn: true },
  { id: 'ig', name: 'IG Web', hostname: 'deal.ig.com', category: 'fx', builtIn: true },
  { id: 'cmc', name: 'CMC Markets Next Generation', hostname: 'platform.cmcmarkets.com', category: 'fx', builtIn: true },
  { id: 'ctrader', name: 'cTrader Web', hostname: 'app.ctrader.com', category: 'fx', builtIn: true },
  { id: 'tradelocker', name: 'TradeLocker', hostname: 'app.tradelocker.com', category: 'fx', builtIn: true },
  { id: 'plus500', name: 'Plus500 WebTrader', hostname: 'app.plus500.com', category: 'fx', builtIn: true },
  { id: 'xtb', name: 'XTB xStation', hostname: 'xstation5.xtb.com', category: 'fx', builtIn: true },
];

export const MAX_PLATFORMS = BUILT_IN_PLATFORMS.length + MAX_CUSTOM_PLATFORMS;

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
    newTabSettings: { enabled: false },
    confirmation: { lastConfirmedAt: null, lastConfirmedLocalDate: null },
  };
}
