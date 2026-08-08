# Privacy Legal Review Notes

**Last research check:** July 27, 2026

This is an issue-spotting note for Cantarivo, not legal advice, a legal opinion, or a substitute for counsel licensed in the places where the app is offered.

## Practical legal position

The lowest-risk product position is narrow and verifiable:

- no audio recording or retention;
- no transcript retention or transmission;
- no cloud speech fallback;
- no speaker identification, voiceprint creation, or biometric profiling;
- no analytics, advertising, sale, sharing, or data-broker access involving microphone-derived data;
- explicit, per-session user activation; immediate stop; visible active state; and button controls that work when voice is unavailable.

This design reduces privacy risk, but does not make the product automatically lawful in every place or scenario. A privacy policy must match the released binary, not merely state an intention.

## Federal issues to recheck before public release

1. **Truthful privacy promises.** The Federal Trade Commission can pursue unfair or deceptive acts or practices. In practice, a statement such as "audio never leaves the device" should be made only when the built app, its dependencies, logs, and crash reporting actually honor it. See [15 U.S.C. 45](https://uscode.house.gov/view.xhtml?req=(title:15%20section:45%20edition:prelim)) and the [FTC privacy and security guidance](https://www.ftc.gov/business-guidance/privacy-security).
2. **Interception/recording risk.** Federal wiretap law restricts intentional interception and disclosure of wire, oral, and electronic communications, subject to specific exceptions. An app must not become a tool for recording, monitoring, or transmitting other people&apos;s private conversations. See [18 U.S.C. 2511](https://uscode.house.gov/view.xhtml?req=(title:18%20section:2511%20edition:prelim)).
3. **Children and special audiences.** Do not market the voice feature to children or add a child-directed version without a separate COPPA and app-store review. Do not add health, insurance, employment, safety-scoring, or law-enforcement uses without a new legal analysis.

## State issues to recheck before public release

1. **Recording-consent and wiretap rules vary by state.** The app should not record or transmit nearby speech, and users should be told not to activate it around other people without permission. Counsel should review intended launch states and any cross-border use before public testing.
2. **Voice biometrics are a separate risk.** Illinois&apos; Biometric Information Privacy Act expressly includes a "voiceprint" in its definition of biometric identifier. Cantarivo&apos;s product requirement is therefore to avoid creating, retaining, receiving, or using voiceprints or speaker identity data. See [740 ILCS 14/10](https://www.ilga.gov/legislation/ilcs/fulltext?DocName=074000140K10).
3. **Comprehensive state privacy laws may apply when a business meets their scope tests or changes practices.** For example, the California Consumer Privacy Act gives covered businesses obligations about notices, data minimization, rights, and sale/sharing. A no-collection design may significantly reduce what must be handled, but the project owner should confirm applicability and thresholds with counsel rather than self-certify an exemption. See the [California Privacy Protection Agency FAQ](https://cppa.ca.gov/faq).

## Owner decisions recorded August 2, 2026

- Cantarivo is positioned as a general singing companion rather than a driving product.
- No unnecessary in-app adult age gate. Google Play target-audience and content-rating declarations must match the released product.
- Project operator does not intend to sell captured or transmitted voice, transcripts, analytics, or nearby speech to a third party. The shipped preview must retain the no-capture/no-transmission design before that commitment is presented as fact.
- No counsel has reviewed these materials. This note and the privacy policy are product documentation, not a legal opinion.

## Owner decisions still required

Before a public mobile release, the project owner needs to provide or approve:

- the legal operator name, if a company or other legal entity is formed;
- the launch countries or territories and distribution channel;
- the final list of SDKs, hosting, crash reporting, analytics, and support tools;
- the exact voice implementation and whether it can ever send data off-device;
- the policy contact method and response process for privacy requests; and
- a counsel review if the project adds any recording, transcript storage, cloud service, external pilot testers, payments, ads, accounts, or sensitive-person-data feature.

## Release rule

If any shipped behavior conflicts with [privacy.html](../privacy.html), block the release until the code, in-app disclosure, store privacy labels, and policy are all corrected together.
