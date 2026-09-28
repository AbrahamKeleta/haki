# Approved browser platform catalog

**Implemented September 27, 2026 after user approval; all ProjectX entries excluded.**

The approved catalog contains 24 additions plus the 4 original entries: 28 total. It is a broad catalog, not an exhaustive worldwide registry. Broker-branded and regional deployments can use different hosts.

The sources below establish public platform entry points or official outbound links. They do **not** establish authenticated compatibility with Haki, account availability in every country, or endorsement of a provider. Verify post-login redirects and test the gate before release. Each hostname is opt-in and requires its own permission; adding a built-in never grants access automatically.

## Already included

| Platform | Current hostname |
| --- | --- |
| TradingView | `www.tradingview.com` |
| Tradovate | `trader.tradovate.com` |
| TopstepX | `topstepx.com` |
| TradeSea | `app.tradesea.ai` |

Existing hostname sources are recorded in [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Futures platforms

| Platform | Approved hostname | Source |
| --- | --- | --- |
| NinjaTrader Web | `web.ninjatrader.com` | [Official source](https://support.ninjatrader.com/s/article/Accessing-NinjaTrader-Arena-Challenges-NinjaTrader-Web?language=en_US) |
| Ironbeam | `trade.ironbeam.com` | [Official source](https://www.ironbeam.com/app/) |
| CQG Desktop / Web | `m.cqg.com` | [Official source](https://partners.cqg.com/marketing-resources/cqg-desktop) |
| Rithmic R \| Trader Pro Web | `rtraderpro.rithmic.com` | [Official source](https://www.rithmic.com/products/web-mobile) |

## Stocks, options and multi-asset browser platforms

| Platform | Approved hostname | Source |
| --- | --- | --- |
| thinkorswim Web (Schwab) | `trade.thinkorswim.com` | [Official source](https://www.schwab.com/trading/thinkorswim/web) |
| Webull WebTrade | `app.webull.com` | [Official source](https://www.webull.com/trading-platforms) |
| Robinhood / Legend | `robinhood.com` | [Official source](https://robinhood.com/us/en/support/articles/recommended-specs-on-legend/) |
| Interactive Brokers Client Portal | `portal.interactivebrokers.com` | [Official source](https://portal.interactivebrokers.com/portal/) |
| TradeStation Web | `webtrading.tradestation.com` | [Official source](https://webtrading.tradestation.com/) |
| Fidelity Trader+ Web | `digital.fidelity.com` | [Official source](https://digital.fidelity.com/ftgw/digital/trader-dashboard?ccsource=CustomerService) |
| SaxoTrader | `www.saxotrader.com` | [Official source](https://www.home.saxo/login) |
| eToro | `www.etoro.com` | [Official source](https://www.etoro.com/watchlists) |
| Zerodha Kite | `kite.zerodha.com` | [Official source](https://kite.zerodha.com/) |
| Dhan TradingView | `tv.dhan.co` | [Official source](https://tv.dhan.co/) |
| FYERS Trader | `trade.fyers.in` | [Official source](https://trade.fyers.in/) |
| Upstox Pro | `pro.upstox.com` | [Official source](https://pro.upstox.com/) |

## FX / CFD browser platforms

| Platform | Approved hostname | Source |
| --- | --- | --- |
| OANDA Web | `trade.oanda.com` | [Official source](https://trade.oanda.com/) |
| FOREX.com Web Trader | `webtrader.forex.com` | [Official source](https://webtrader.forex.com/) |
| IG Web | `deal.ig.com` | [Official source](https://deal.ig.com/web-platform/) |
| CMC Markets Next Generation | `platform.cmcmarkets.com` | [Official source](https://platform.cmcmarkets.com/) |
| cTrader Web | `app.ctrader.com` | [Official source](https://help.ctrader.com/ctrader-web/) |
| TradeLocker | `app.tradelocker.com` | [Official source](https://tradelocker.com/how-to/log-in/) |
| Plus500 WebTrader | `app.plus500.com` | [Official source](https://app.plus500.com/) |
| XTB xStation | `xstation5.xtb.com` | [Official source](https://xstation5.xtb.com/) |

## Additional candidates requiring more URL verification

These names are not included in the approved catalog. Do not infer a trading hostname from a company name or protect a marketing/account-management site as a substitute for a verified terminal.

| Candidate | Remaining verification |
| --- | --- |
| tastytrade Web | Official sign-in is `my.tastytrade.com`; confirm the actual terminal host after sign-in. [Web platform](https://tastytrade.com/web-platform/) |
| E*TRADE / Power E*TRADE | Verify terminal hosts reached through the authenticated launchpad. [Official access instructions](https://us.etrade.com/platforms/etrade-pro-transition-guide) |
| Trading 212 | Confirm the current app destination and redirects; do not assume `app.trading212.com`. [Official web-app announcement](https://community.trading212.com/t/new-web-app-beta/68152) |
| DEGIRO | Confirm the correct current WebTrader hostname for each region. [Official WebTrader help](https://www.degiro.nl/helpdesk/handelsplatform/hoe-kan-ik-de-taal-van-het-platform-veranderen) |
| FXCM Trading Station Web | Resolve the current Web 3.0 launch destination. [Official platform](https://www.fxcm.com/markets/platforms/trading-station/) |
| City Index Web Trader | Verify the current production terminal and regional redirects. [Official platforms page](https://www.cityindex.com/en-uk/trading-platforms/web-trader/) |
| MetaTrader 4 / 5 WebTerminal | Broker-specific deployments need individual hosts; a vendor demo does not cover all live accounts. [MetaTrader 5 Web](https://www.metatrader5.com/en/trading-platform/web-trading) |
| DXtrade | Add verified broker/firm terminals individually. [Provider's broker directory](https://dx.trade/featured-brokers/) |
| Match-Trader | Add each broker/firm's own web app host. [Provider's platform description](https://match-trader.com/trading-platform/) |

Further discovery candidates: Capital.com, Pepperstone, IC Markets, FP Markets, Eightcap, CMC Invest, Swissquote, Questrade Edge Web, Qtrade, Public, Wealthsimple, moomoo Web, Tiger Web, Groww, Angel One, Dhan Web, and ProRealTime Web. Browser product availability and exact production hosts still need primary-source checks before including them.

## Exclusions and implementation

- The entire proposed ProjectX group was excluded at the user's request. No ProjectX hostname is in the runtime catalog or landing-page carousel.
- The old E8 ProjectX terminal `x.e8markets.com` was excluded as well. E8's [current futures-platform instructions](https://helpfutures.e8markets.com/en/articles/10207237-available-trading-platforms-for-futures) and [Tradovate sign-in instructions](https://helpfutures.e8markets.com/en/articles/12996653-how-to-log-into-the-tradovate-trading-platform) identify Tradovate, already included above.
- Search and category filters keep the list manageable. Existing enabled choices and rules survive updates; new entries start disabled. An existing custom entry with a matching hostname becomes built-in while keeping its enabled state.
- Fifty custom sites are supported independently of the built-in catalog. Existing installations at the previous 50-total limit remain valid across reads and saves.
- No subdomain wildcard grants. Protection covers every page on the displayed exact host, including non-trading pages on shared account domains such as Fidelity. Regional or broker-specific terminals can be added separately.
- The landing-page carousel is generated from the same catalog. It scrolls left without separators, supports pausing and respects reduced motion.
- Unit tests and Chrome fixtures cover migration, permission grants/denials, filters and all 24 added hosts. Authenticated demo/safe-account checks of login redirects, platform shortcuts and live layouts remain release work; public research and synthetic fixtures cannot replace them.
