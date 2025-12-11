I’d picture a *10-year, multi-phase plan* with one big theme:

> **BSV becomes “crypto-agile” at the script level, PQ-default at the wallet level, and eventually PQ-only for *new* value.**

Here’s how I’d map it if we were running the BSV tech roadmap.

---

## 0. Ground rules & threat model (first 6–12 months)

**Goals:**

1. **Adopt global standards, don’t invent lone-wolf crypto.**
   Anchor to NIST PQC standards:

   * ML-KEM (Kyber) for key exchange (FIPS 203)
   * ML-DSA (CRYSTALS-Dilithium) for signatures (FIPS 204)
   * SLH-DSA (SPHINCS+) as hash-based backup (FIPS 205) ([NIST][1])

2. **Assume “harvest now, decrypt later.”**
   Anyone recording raw ECDSA pubkeys or signatures can attack them once big quantum machines arrive. BSV, as a fork of BTC/BCH, shares this basic vulnerability. ([Kent Academic Repository][2])

3. **Recognize migration is slow.**
   Big orgs moving to PQC are budgeting *8–15 years* to fully rotate keys & infra. ([AppViewX][3])
   So a serious BSV roadmap starts **now**, even if quantum is still “early.”

**Concrete actions:**

* Spin up a **BSV PQ Working Group** (core devs + wallets + exchanges + infra + a few PQC cryptographers).
* Publish a **Post-Quantum Threat & Design Brief**:

  * Which BSV use-cases are most exposed (long-lived UTXOs, static on-chain pubkeys, multi-sig wallets, etc.)?
  * Target PQ schemes: **ML-DSA as primary**, **SLH-DSA as backup**, **FN-DSA/Falcon** as performance option when FIPS 206 is finalized. ([NIST][1])
* Commit to one high-level principle:

  > *No more cryptographic dead ends.* Every new feature must be upgradable to PQ primitives without a new fork.

---

## 1. Script-level crypto agility (0–2 years)

The nice thing: BSV already highlights that **new signature schemes can be embedded at the script level without changing the base protocol**, and its unbounded scaling is ideal because PQ signatures are larger. ([CoinGeek][4])

So step one is making that real, not just theoretical.

### 1.1 New script templates

Design **standard locking script patterns** (like BSV’s version of BIP-templates) that support PQ:

1. **Hybrid “pay to ECDSA *or* ML-DSA” outputs**

   Example conceptually:

   ```text
   OP_IF
     <ECDSA_pubkey> OP_CHECKSIG
   OP_ELSE
     <MLDSA_pubkey> OP_CHECKSIG_MLDSA
   OP_ENDIF
   ```

   * Lets users *today* use familiar ECDSA, while already having a PQ escape hatch.
   * Ideal for early wallet experiments and long-term HODL outputs.

2. **PQ-only templates**

   * `P2PQ_MLDSA`: pay to ML-DSA pubkey
   * `P2PQ_SLHDSA`: pay to SLH-DSA pubkey for ultra-conservative use cases

3. **Multi-alg multi-sig**

   * Outputs that require *k-of-n where n is mix of ECDSA + ML-DSA + SLH-DSA*.
   * This keeps flexibility for governance and complex custody.

### 1.2 New opcodes / VM hooks

Add consensus-level support for verifying PQ sigs:

* `OP_CHECKSIG_MLDSA`
* `OP_CHECKSIG_SLHDSA`
* Optional: a generic `OP_CHECKSIG_ALG <alg_id> <pubkey> <sig>` that routes to the right verifier.

Prototype implementations **first** in:

* A PQ testnet / regtest mode.
* Non-standard policy (not relayed on mainnet) until vetted.

### 1.3 Benchmarks & limits

Use the PQC benchmarking literature (ML-DSA/Falcon/SLH-DSA timings & sizes) to:

* Set sane limits on:

  * Max script size
  * Max total sig size per transaction
  * CPU cost accounting for PQ verification vs ECDSA
* Leverage BSV’s big-block story: **larger sigs are manageable as long as fee & CPU costs are modeled correctly.** ([arXiv][5])

---

## 2. Wallets, keys & migration UX (1–3 years)

Once script support exists, the next big front is *wallets & dev tooling*.

### 2.1 Dual-stack key derivation

Define BSV’s answer to a “PQ-aware BIP32”:

* From one seed, derive:

  * secp256k1 keys for legacy ECDSA
  * ML-DSA keys (and maybe SLH-DSA/Falcon) using clearly versioned derivation paths.
* Standardize this so Paymail, exchanges, custodians, and hardware wallets can implement the *same* paths.

### 2.2 Migration tools

Shipping features like:

* **“Sweep to Hybrid”**:
  One-click tool to move all coins from ECDSA-only outputs into ECDSA+PQ hybrid outputs.
* **“No naked pubkeys”**:
  Best-practice rule in SDKs: avoid exposing raw ECDSA pubkeys unnecessarily (mitigate future Shor-style attacks).

### 2.3 Developer SDKs

Update `bsv` libraries & BSV ecosystem SDKs to support:

* Generating PQ keypairs.
* Building PQ scripts & transactions.
* Verifying PQ sigs client-side.
* Signing messages & auth tokens with PQ keys for apps that use BSV as identity layer.

---

## 3. Network & ecosystem rollout (2–5 years)

Now move from “possible” to “normal.”

### 3.1 Policy & miner signaling

* Miners agree on a **“PQ standardness” schedule**:

  * Year X: hybrid ECDSA+PQ outputs are *standard* and cheap to relay.
  * Year Y: pure ECDSA scripts are still valid, but may get slightly higher relay / miner fees.
* Node releases ship with PQ support **enabled by default**.

### 3.2 Service-level deadlines

Coordinate ecosystem-wide milestones:

* **Exchanges & custodians**

  * By date T₁: support PQ deposit & withdrawal addresses.
  * By date T₂: new cold storage must be hybrid or PQ-only.
* **Wallets**

  * By date T₃: generate only hybrid or PQ-capable addresses by default for new wallets.
* **Identity + Paymail**

  * Define how PQ keys bind to identities (multiple keys per identity, algorithm agility, metadata).

---

## 4. Long-term tightening (5–10+ years)

This phase depends heavily on the real-world quantum curve, but I’d still sketch it now.

### 4.1 Gradual disincentive for ECDSA-only UTXOs

* Increase recommended fee multipliers for transactions spending from purely ECDSA scripts.
* Introduce wallet warnings for users sending to non-PQ outputs:

  > “This address uses only pre-quantum signatures. It may be at higher risk in the future.”

### 4.2 Emergency “Q-Day” plan

Have a **contingency plan** written and simulated *before* it’s needed, e.g.:

* A fast-track soft-fork (or governed flag day) that:

  * Makes it more expensive or restricted to spend from non-PQ outputs.
  * Potentially allows a *one-time* “claim” mechanism where holders can move coins into PQ scripts based on known pubkeys, if a live attack emerges.
* Clear communication templates for exchanges, custodians, and users.

---

## 5. Parallel R&D tracks

While the main roadmap rolls, I’d keep a few research sub-streams going.

### 5.1 PQ-friendly smart contracts & AI

* Design contract patterns that **assume** PQ signatures from day one:

  * Token protocols
  * Identity and verifiable credential systems
  * Notarization / NotaryHash / GovHash-style services
* For verifiable AI on BSV (like zkScript and notarized AI outputs), require PQ signatures for:

  * Model/artifact attestations
  * Data provenance trails ([Medium][6])

### 5.2 Hybrid off-chain protocols

* For any future payment channels / layer-2s on BSV, use:

  * ML-KEM (Kyber) for session key establishment.
  * PQ signatures for state commitments.
* Explore “dual-stack” channels that can be closed on-chain using either ECDSA or PQ signatures, but favor PQ in new deployments.

### 5.3 Crypto-agility as a first-class feature

Design BSV-level standards for:

* Declaring *supported algorithms* in script, identities, and wallets.
* Upgrading those algorithms *without* changing the base protocol (just by rolling out new standard scripts and op-codes).

---

## 6. Governance, education & messaging

Finally, if we were steering the roadmap, I’d make sure the *story* is as solid as the engineering:

* **Public “BSV PQC Roadmap” document** that’s updated yearly.
* Regular **testnet events** (“PQ Week”) where wallets & services run PQ-only challenges.
* Clear messaging that:

  * Quantum is a systemic internet problem, not “just crypto.” ([CoinGeek][4])
  * BSV’s script-level flexibility and big-block capacity actually *help* with PQ migration (room for larger signatures, easier introduction of new schemes). ([CoinGeek][4])

---

If you want, we can:

* Pick **one specific track** (e.g., “design the actual ML-DSA script template set for BSV”) and flesh it out in code / pseudo-Script, or
* Draft an internal **“BSV PQC Working Group charter + 12-month action plan”** you could literally drop into a tech team meeting.

[1]: https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards"NIST Releases First 3 Finalized Post-Quantum Encryption ..."
[2]: https://kar.kent.ac.uk/110944/1/219Quantum_Advantage_On_Blockchain_Technologies.pdf "QUANTUM ADVANTAGE ON BLOCKCHAIN TECHNOLOGIES"
[3]: https://www.appviewx.com/blogs/post-quantum-cryptography-preparing-for-a-quantum-future/ "Post-Quantum Cryptography: Preparing for a Quantum Future"
[4]: https://coingeek.com/beyond-quantum-threat-building-the-next-era-of-digital-finance/ "Beyond quantum threat: Building the next era of digital finance"
[5]: https://arxiv.org/abs/2510.09271 "Assessing the Impact of Post-Quantum Digital Signature Algorithms on Blockchains"
[6]: https://medium.com/%40w.zhang/verifiable-ai-on-bitcoin-fccb66eeee71 "Verifiable AI on Bitcoin - by Wei Zhang"
