# Mizan — Money that follows you.

A payment account for people who moved, built on Sui.

**Team Red Sea** · MUBA Blockchain Hackathon 2026 · Sui Foundation Track: Payments & Stablecoins

| | |
| --- | --- |
| **Live demo** | **https://mizan17.vercel.app** — open it and sign in, nothing to install |
| **Demo video** | _(add link before submitting)_ |
| **Source** | https://github.com/eyahia1712/mizan17 |
| **Network** | Sui testnet |
| **Status** | Working prototype. No real money moves anywhere. |

---

## The problem

**Sending money across a border is easy. Turning it back into money you can spend is not.**

An international student arrives in Kuala Lumpur. Their mother wants to send living
expenses from Dhaka. Today that means one of three bad options:

- **A bank wire** — around USD 45 in fees, two to five days, and the student needs a
  Malaysian bank account they cannot open yet.
- **A money changer** — a cut on the rate *and* a fee, paid in cash, with no record.
- **Crypto** — fast and cheap to send, but then the money is stuck. It is a token in a
  wallet, not ringgit in a hand. Getting it out means a seed phrase, an exchange, KYC,
  and steps nobody outside crypto knows how to take.

The same problem is far bigger for Malaysia's migrant workforce, who send money home
every month through some of the highest-cost corridors in the region.

**Two things are actually broken:**

1. **Getting an account.** A bank account has to be *granted* by an institution that is
   allowed to refuse. Someone new to the country, with documents still processing, is
   exactly who that process excludes.
2. **Getting the money out.** Crypto solved the transfer and ignored the last mile. The
   money has to land as **taka, rupees, peso or ringgit** — in a bank account or an
   e-wallet the family already uses.

Mizan is built around the second one, because that is the half everybody skips.

## What Mizan does

**Sign in with Google. Get a Sui account. Send money. Cash it out in real currency.**

- **No seed phrase, no documents, no approval.** The Sui address is derived from the
  Google account itself. Sign in on any device and you get the same address back.
- **Send in about two seconds** for a network fee of roughly two cents.
- **Read your money in your own currency.** Eleven are supported — MYR, USD, SGD, BDT,
  NPR, INR, IDR, PHP, EUR, GBP, AED. Pick one and every figure in the app changes.
- **Cash out to real money**, through the same two steps a real off-ramp uses: swap SUI
  for a stablecoin, then sell the stablecoin into a bank account or e-wallet. Both fees
  are shown, because both are really charged.
- **Buy crypto** by comparing what three licensed on-ramps would deliver for the same
  ringgit — they differ on fee *and* spread.
- **Split rent and bills** with housemates, with the occasion attached so the request
  still makes sense a week later.
- **Pay by voice.** Say *"Hey Trisha, send twenty five to Ayesha"*, she reads the
  transaction back, and it only sends once you say yes out loud.

The account cannot be refused, because nobody grants it. It is derived from a key and
settled on a public network.

## Why this needs a blockchain

A normal fintech app still sits on a bank account somewhere — and that account carries
the same permission requirement that excluded the user in the first place.

Moving the ledger on-chain removes the gatekeeper. The account exists the moment the key
is derived, and value moves between two addresses with no institution deciding whether
it is allowed.

**Why Sui specifically:**

| Sui feature | What it solves here |
| --- | --- |
| **zkLogin** | An account from a Google sign-in, with no seed phrase to lose. This is the single biggest reason non-crypto users bounce. |
| **Sub-second finality, sub-cent fees** | Makes small transfers — a share of the groceries — worth doing at all. |
| **Sponsored transactions** | The user never needs a gas token, and never learns what gas is. |
| **Programmable Transaction Blocks** | A split across four housemates settles as one atomic transaction. |

## The business case

**The market.** Malaysia sent out roughly **USD 8 billion** in remittances in 2023, with
about 2.7 million migrant workers and over 130,000 international students. The
Bangladesh, Nepal, Indonesia and Philippines corridors out of Malaysia carry some of the
highest fees in Southeast Asia — commonly 5–7% all-in once the exchange-rate spread is
counted.

**Where the money is made.** Not on the transfer — that part is nearly free and should
stay that way. Revenue comes from the edges, which is where incumbents already charge:

- **Off-ramp margin** — a spread on converting the stablecoin to local currency. Even at
  a fraction of what a bank charges, this is the main line.
- **On-ramp referral** — a share of the provider fee when a user buys through MoonPay,
  Transak or Banxa.
- **Business accounts** — landlords, hostels and universities collecting recurring
  payments from students who all already hold the app.

**Why we win against the incumbents:**

| | Bank wire | Money changer | Wise / Remitly | **Mizan** |
| --- | --- | --- | --- | --- |
| Fee | ~USD 45 | 3–7% | 1–3% | **Under 1%** |
| Speed | 2–5 days | Same day | Hours to days | **~2 seconds** |
| Account needed | Yes | No | Yes | **No** |
| Works for a new arrival | No | Yes | No | **Yes** |

**Go to market.** Universities first. International students arrive in cohorts, share
housing, split bills, and already tell each other how they are moving money. One campus
is a network, not a hundred separate customers.

## Our vision

**Everyone should be able to hold and move money without asking permission first.**

The account is step one. Where it goes:

1. **Payroll for migrant workers** — paid on-chain, cashed out at home, no employer
   holding a passport as collateral.
2. **Group accounts** — shared custody for households, hostels and student societies.
3. **Escrow** — deposits and milestone payments held by a Move contract, not by a
   landlord's goodwill.
4. **More corridors** — the same product works anywhere an off-ramp partner exists.

## Blockchain technology used

- **Network:** Sui **testnet**
- **SDK:** `@mysten/sui` v1.x — `SuiClient`, `Ed25519Keypair`, `Transaction`
- **Transaction type:** native SUI transfer via `splitCoins` + `transferObjects`
- **Explorer:** Suiscan testnet
- **Backend:** none. The browser talks to the Sui fullnode directly.

### Smart contract addresses

**None — and that is deliberate.** Transfers here use Sui's *native* coin transfer, which
is a built-in operation of the chain, not a deployed Move module. There is no custom
contract, so there is no package address to report.

What can be verified instead:

- **Account address** — derived from your Google sign-in, shown in full under **Account**
  and on the wallet's settings screen, with a link to Suiscan.
- **Transaction digests** — every transfer made in Live mode returns a real testnet
  digest, linked to Suiscan from the receipt.

A Move module becomes necessary when we add escrow, scheduled transfers and
shared-custody group accounts. Those are on the roadmap, not in this build.

## Demo mode and Live mode

Switchable from the **Account** sheet or the wallet's settings.

| | Demo mode (default) | Live mode |
| --- | --- | --- |
| Balances, contacts, history | Fixture data | Fixture data |
| Send | Simulated, receipt generated locally | **Real transaction signed and submitted to Sui testnet** |
| Spending limit | The demo balance | **The account's real on-chain balance** |
| Digest on receipt | Locally generated, labelled as such | **Real digest, verifiable on Suiscan** |
| Buy and cash out | Simulated — no card charged, no bank transfer placed | Same |

Testnet coins have no monetary value. **No real money moves anywhere in this project.**

**To use Live mode:** open **Account** → turn on *Live transfers* → copy your address →
fund it at [faucet.sui.io](https://faucet.sui.io) → send to any valid testnet address.

This works on the deployed site as well as locally. There is no backend to run — the
browser signs the transaction and submits it to the Sui fullnode itself.

## Setup and installation

**Nothing to install.** The app is deployed and ready to use:

### → https://mizan17.vercel.app

To run it locally instead, you need **Node.js 18 or newer**:

```bash
git clone https://github.com/eyahia1712/mizan17.git
cd mizan17
npm install
npm run dev
```

Open **http://localhost:5173**. That is the whole setup — no backend, no database, no
API keys required.

**Optional — real Google sign-in.** Without a client id the app uses its own account
chooser and everything else behaves identically, so the demo never hard-fails.

1. Google Cloud Console → APIs & Services → Credentials
2. Create credentials → OAuth client ID → **Web application**
3. Authorised JavaScript origins: `http://localhost:5173`
4. Authorised redirect URIs: `http://localhost:5173/`
5. `cp .env.example .env` and paste the client id into `VITE_GOOGLE_CLIENT_ID`

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build
```

**Browser note.** Trisha, the voice assistant, needs Chrome or Edge and microphone
permission. Everything else works everywhere. Without a microphone you can drive her
from the console:

```js
window.dispatchEvent(new CustomEvent('trisha:hear', { detail: 'send 20 to ayesha' }))
```

## How the sign-in works

Being precise about this matters more than the pitch sounding good.

- **Real:** a genuine Google OAuth 2.0 flow. The popup is Google's own account chooser,
  and the name in the app is that account's.
- **The wallet:** the Sui keypair is derived from the Google subject id —
  `Ed25519(SHA-256(salt : sub))`. Same Google account, same Sui address, any machine.
- **Not yet real:** this is **not** zkLogin. zkLogin derives the address from the same
  credential but proves it in zero knowledge and leaves no key in the browser. This build
  holds the key client-side and derives the address with a hash. The ID token signature
  is also unverified, because that needs Google's JWKS on a server.
- **The upgrade path:** swapping in real zkLogin replaces **one function** —
  `keypairForSubject` in `src/lib/sui.js` — plus a proving service and a salt service.
  Nothing else in the app changes.

## Project structure

```
src/
├── App.jsx                   screen state, the one write path to the ledger
├── main.jsx                  entry point
├── components/
│   ├── SignIn.jsx            landing page and Google sign-in
│   ├── GoogleChooser.jsx     account chooser used when no OAuth client id is set
│   ├── Dashboard.jsx         account card, monthly tiles and chart
│   ├── Home.jsx              quick actions, activity list
│   ├── SendSheet.jsx         send flow and on-chain receipt
│   ├── Sheets.jsx            receive, split, cash out, account
│   ├── Trisha.jsx            the voice assistant
│   ├── Icons.jsx             inline SVG set
│   └── wallet/               the wallet: shell, flows, and its own UI parts
├── lib/
│   ├── sui.js                all chain access — keys, reads, transfer, faucet
│   ├── auth.js               Google OAuth, ID token decoding, known accounts
│   ├── ledger.js             every derived figure: totals, fees, spend limits
│   ├── market.js             swap, provider and payout quotes
│   ├── currency.js           the eleven display currencies
│   ├── format.js             money, address and explorer-link formatting
│   ├── recipients.js         saved send-to addresses
│   ├── commands.js           spoken sentences → transactions, no model
│   └── voice.js              wake word, recognition, speech, chime, mic level
├── data/mockData.js          all fixture data, isolated in one file
└── styles/                   global, wallet, chooser and assistant CSS
```

Fixture data lives only in `data/mockData.js`, and chain access only in `lib/sui.js` — so
the line between what is demonstrated and what is real is one import away either way.

## What we deliberately did not build

Naming these is more useful than pretending.

- **Real cash-out settlement.** Converting to ringgit is a regulated money-services
  activity under Bank Negara Malaysia. It runs through a licensed partner. Our screens
  walk the full flow and charge the real fees, but no card is charged and no bank
  transfer is placed.
- **KYC and sanctions screening.** Required before any real deployment.
- **zkLogin proper.** See above.
- **Sponsored transactions.** Gasless onboarding needs a sponsor service to co-sign,
  which needs a backend.
- **Stablecoin denomination.** This build counts in SUI, so a balance held between two
  paydays carries SUI's price risk. Production settles in a USDC-equivalent on Sui.

## Roadmap

1. Move module for escrow and shared-custody group accounts
2. zkLogin proving and salt services, replacing the hash-derived keypair
3. Sponsored transaction relayer for genuinely gasless onboarding
4. Licensed off-ramp partner for the Malaysia → Bangladesh, Nepal and Indonesia corridors
5. React Native build sharing this component layer

## Team Red Sea

| Name | Role |
| --- | --- |
| **Eya Hia** | Team lead — product, frontend, Sui integration |
| **Abu Sadat Md Sayem** | Product and research |
| **Shah Rabbi Hasan Foyej** | Frontend and testing |

## AI tool declaration

**Claude (Anthropic), via Claude Code**, was used during development for architecture
discussion, code scaffolding, refactoring and documentation drafting.

All product scoping, design decisions, problem framing and the final build were directed
and reviewed by the team. Every line of the submitted code was read and accepted by us.

## Licence

MIT
