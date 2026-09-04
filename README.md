# Mizan

**ميزان — the balance, the scales.**

Money that follows you. Borderless payments for people who moved — built on Sui.

Submitted to **MUBA Blockchain Hackathon 2026** · Sui Foundation Track 1: Payments & Stablecoins

---

## The problem

An international student lands in Kuala Lumpur in August. Their tuition is paid, their
hostel deposit is due, and their mother is trying to send them living expenses from
Dhaka. They cannot open a Malaysian bank account yet — that takes weeks and paperwork
that depends on documents still being processed.

So the money arrives the expensive way. A bank wire costs around USD 45 and takes two to
five days. A money changer takes a cut on the rate as well as a fee. Meanwhile rent is
split four ways among housemates over WhatsApp, chased for a fortnight, and settled in
cash.

The same problem is much larger for Malaysia's migrant workforce, who send money home
every month through the highest-friction corridors in the region.

**The reason this is hard is not technology. It is permission.** A bank account has to be
granted by an institution that is allowed to refuse. Someone new to the country, with
incomplete documents, is exactly the person that process is designed to exclude.

## What Mizan does

Mizan gives that person somewhere to receive and send money on day one.

- **Sign in with Google.** The account is derived from the Google credential itself.
  No seed phrase, no documents, no branch visit, no approval step. What that derivation
  is *today* is set out under **Sign-in and key derivation** below.
- **Send to a person, not an address.** Recipients are chosen by name and handle.
- **Settles in about two seconds** for a network fee of roughly two cents, with no
  correspondent bank in the path.
- **Split rent and bills** with housemates and settle instantly.
- **Cash out** to ringgit or a local currency through a licensed exchange partner.

The account cannot be refused, because it is not granted by anyone. It is derived
mathematically and settled on a public network.

## Why this needs a blockchain

This is the question the product has to answer, so it is worth being direct.

A conventional fintech app still sits on top of a bank account somewhere, and that
account carries the same permission requirement that excluded the user in the first
place. Moving the ledger on-chain removes the gatekeeper entirely: the account exists as
soon as the key is derived, and value moves between two addresses without an
intermediary institution deciding whether the transfer is allowed.

Sui is a good fit specifically because two of its features address the parts of crypto
that normally break mainstream users:

| Sui feature | What it solves here |
| --- | --- |
| **zkLogin** | Account from a Google sign-in, with no seed phrase to lose — the single biggest onboarding failure for non-crypto users. Designed for; see the section below for what this build actually does. |
| **Sponsored transactions** | The user needs no gas token to transact. They never learn what gas is. |
| **Programmable Transaction Blocks** | A split-and-settle across several housemates batches into one atomic transaction. |
| **Sub-second finality, fees under a cent** | Makes small transfers — a share of the groceries — economically sensible. |

## Blockchain technology used

- **Network:** Sui **testnet**
- **SDK:** `@mysten/sui` v1.x (`SuiClient`, `Ed25519Keypair`, `Transaction`)
- **Transaction type:** native SUI transfer via `splitCoins` + `transferObjects`
- **Explorer:** Suiscan testnet

### Smart contract addresses

**None — and this is deliberate.** Transfers in this prototype use Sui's *native* coin
transfer, which is a built-in operation of the chain rather than a deployed Move module.
There is no custom contract to publish, so there is no package address to report.

What can be verified instead:

- **Account address:** generated per browser session, shown in full under the Account
  tab. Open it on Suiscan from the link there.
- **Transaction digests:** every transfer made in Live mode returns a real testnet
  digest, linked to Suiscan from the receipt screen.

A Move module becomes necessary at the point where the product adds escrow, scheduled
transfers or shared-custody group accounts. Those are on the roadmap below, not in this
build.

## Sign-in and key derivation

Being precise about this matters more than the pitch sounding better.

**What is real.** Sign-in is a genuine Google OAuth 2.0 flow. Clicking *Continue with
Google* opens Google's own account chooser in a popup while the provisioning sequence
plays in the main window; the popup lands back on this origin, hands the ID token to its
opener and closes. The name shown throughout the app is that account's.

**How the wallet is derived.** The Sui keypair is derived deterministically from the
Google subject id: `Ed25519(SHA-256(app_salt : sub))`. The consequence that matters is
that the same Google account always yields the same Sui address, on any machine — so an
account funded once from the faucet stays usable.

**When no client id is configured.** A web page cannot enumerate the Google accounts
signed in on the device — only Google can, and only through a registered OAuth client.
So without `VITE_GOOGLE_CLIENT_ID` the app shows its own chooser instead: the same
layout, over a list of accounts seeded in `lib/auth.js` and extended through *Use
another account*, which remembers what it is given in `localStorage`. Whichever chooser
answers, the app receives the same three things — name, email and a stable subject id —
and the address is derived from that id the same way. Set the client id and the real
chooser takes over with no other change.

**What this is not.** It is not zkLogin. zkLogin derives the address from the same
credential but proves the link in zero knowledge and leaves no private key in the
browser; this build holds the key client-side and derives the address with a hash. Two
further gaps follow from having no backend: the ID token's signature is not verified
(that needs Google's JWKS on a server), and the salt is a fixed constant rather than
coming from a salt service.

Swapping in real zkLogin replaces one function — `keypairForSubject` in `lib/sui.js` —
plus a proving service and a salt service. Nothing else in the app changes.

## Sending

A transfer needs two things: an address and an amount. The address is not optional —
it is the only thing that identifies an account on Sui — so the send screen asks for it
in one of two ways:

- **Saved.** Pick a recipient from the list. Nothing to type.
- **New address.** Paste the recipient's public wallet address. It is validated as you
  type, and **saved once the transfer goes through**, so any address is typed exactly
  once and appears under *Saved* from then on.

Saved recipients live in `lib/recipients.js`, shared by the account page and the wallet,
and persist in `localStorage`.

## The wallet

The *Wallet* button in the header opens a full wallet: balance, Send / Receive / Buy /
Sell, a SUI token page with a price line, transaction history grouped by month, and
settings holding the address and the live-transfer switch. It is built on the same
paper, ink and hairlines as the rest of the product — a wallet's shape, not a wallet's
palette.

It is not a second set of numbers. The wallet and the Mizan screens read the same
balance and the same transaction list, and every entry — a transfer, a card purchase, a
withdrawal to a bank — is written through one function in `App.jsx`. Buy from a card in
the wallet and the dashboard's balance, month chart and fee total have already moved by
the time you close it.

The spending rules are real arithmetic, not decoration: nothing can be sent that the
balance plus its network fee will not cover, *Max* offers exactly that figure, and the
message on a rejected amount says which limit was hit.

## Demo mode and Live mode

The app ships with two modes, switchable from the Account tab. Being explicit about
which is which matters more than making the demo look impressive.

| | Demo mode (default) | Live mode |
| --- | --- | --- |
| Balances, contacts, history | Fabricated fixture data | Fabricated fixture data |
| Exchange rate | Fixed at 14.86 MYR/SUI | Fixed at 14.86 MYR/SUI |
| Send button | Simulated, receipt generated locally | **Real transaction signed and submitted to Sui testnet** |
| Spending limit | The demo balance | **The account's real on-chain balance, polled from the fullnode** |
| Digest on receipt | Locally generated, labelled as such | **Real digest, verifiable on Suiscan** |
| Wallet buy and sell | Simulated on-ramp and off-ramp; no card is charged | Simulated on-ramp and off-ramp; no card is charged |

Testnet coins have no monetary value. No real money moves anywhere in this project.

**To use Live mode:** open the Account tab, turn on *Live transfers*, copy the account
address, fund it from [faucet.sui.io](https://faucet.sui.io), then send to any valid
testnet address. The in-app *Add test coins* button is a shortcut, but the public faucet
rate-limits browser origins, so the website is the reliable route.

With Live transfers on, the send screen switches its limit to the account's real
on-chain balance and says so. An unfunded account cannot start a transfer it would only
fail, and when the network does reject one the message says what to do about it rather
than reporting `Failed to fetch`.

## Running it

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

**For real Google sign-in**, create an OAuth client and point the app at it:

1. Google Cloud Console → APIs & Services → Credentials
2. Create credentials → OAuth client ID → **Web application**
3. Authorised JavaScript origins: `http://localhost:5173`
4. Authorised redirect URIs: `http://localhost:5173/`
5. `cp .env.example .env` and paste the client id into `VITE_GOOGLE_CLIENT_ID`

Without a client id the app signs in with a demo identity and everything else behaves
identically, so the build never hard-fails on stage.

Once signed in, the account card carries the Sui address and a **Copy** button. Paste it
into [faucet.sui.io](https://faucet.sui.io) to claim testnet SUI, then turn on *Live
transfers* under **Account** and the send button signs a real testnet transaction.

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build
```

There is no backend and no database. The one environment variable is the Google client
id above. The browser talks to the Sui fullnode directly, which is the point.

## Project structure

```
src/
├── main.jsx                  entry point
├── App.jsx                   screen and sheet orchestration, account state
├── components/
│   ├── SignIn.jsx            landing page, Google sign-in, provisioning sequence
│   ├── GoogleChooser.jsx     account chooser shown when no OAuth client id is set
│   ├── Dashboard.jsx         account card, monthly tiles and chart, wallet door
│   ├── Home.jsx              quick actions, activity list
│   ├── SendSheet.jsx         send flow, execution, on-chain receipt
│   ├── Sheets.jsx            receive, split, cash-out, account
│   ├── Icons.jsx             inline SVG set
│   └── wallet/
│       ├── Wallet.jsx        wallet shell, balance, token page, bottom nav
│       ├── Flows.jsx         send, receive, buy, sell, history, settings
│       └── WalletUI.jsx      the wallet's own icons and screen primitives
├── lib/
│   ├── auth.js               Google OAuth redirect, ID token decoding, known accounts
│   ├── recipients.js         saved send-to addresses, shared by the app and the wallet
│   ├── sui.js                all chain interaction — key derivation, reads, transfer, faucet
│   ├── ledger.js             every derived figure: month totals, fees, spend limits
│   └── format.js             SUI, ringgit, address and explorer-link formatting
├── data/
│   └── mockData.js           every piece of fixture data, isolated in one file
└── styles/
    ├── global.css            design tokens and component styles
    ├── chooser.css           the account chooser, in Google's own idiom
    └── wallet.css            the wallet, in its own dark palette

brand.md                      palette, typography and voice
```

Fixture data is confined to `data/mockData.js` and chain interaction to `lib/sui.js`, so
the boundary between what is demonstrated and what is real is one import away in either
direction.

## What is deliberately not built

Naming these is more useful than pretending otherwise.

- **Cash-out settlement.** Converting to ringgit is a regulated money services activity
  under Bank Negara Malaysia. Commercially this runs through a licensed exchange partner.
  The wallet's buy and sell screens walk the full flow, quote a rate and charge a fee,
  but no card is charged and no bank transfer is placed.
- **KYC and sanctions screening.** Required before any real deployment.
- **zkLogin proper.** The address comes from the Google credential, but by hash rather
  than by zero-knowledge proof, and the key sits in the browser. See the section above.
- **Sponsored transactions.** Gasless UX needs a sponsor service to co-sign, which needs
  a backend. Designed for, not implemented.
- **Stablecoin denomination.** Everything in this build is denominated in SUI, which
  means a balance held between two paydays carries SUI's price risk. A production build
  settles in a USDC-equivalent on Sui and quotes the corridor in it.

## Roadmap

1. Move module for milestone escrow and shared-custody group accounts
2. zkLogin proving and salt services, replacing the hash-derived keypair
3. Sponsored transaction relayer for genuinely gasless onboarding
4. Licensed off-ramp partner for the Malaysia, Bangladesh and Nepal corridors
5. React Native build sharing this component layer

## Team

| Name | Role |
| --- | --- |
| Eya Hia | Product, frontend, Sui integration, pitch |
| *(add teammates)* | |

## AI tool declaration

Claude (Anthropic) was used for architecture discussion, code scaffolding and README
drafting. All design decisions, product scoping and the demo build were directed by the
team.

## Licence

MIT
