# GitHub Pages privacy and support URL plan

**Status:** draft prepared 2026-08-01. Do not enter these URLs in Google Play until GitHub Pages deployment is enabled and each URL has been checked in a normal browser.

## Proposed public URLs

| Need | Proposed URL | Use |
| --- | --- | --- |
| Privacy policy | `https://mexicanjumbalia.github.io/driver-companion/privacy.html` | Google Play Privacy Policy field and in-app policy link |
| Data Safety review | `https://mexicanjumbalia.github.io/driver-companion/data-safety.html` | Public review/reference page; not a replacement for the Play Console form |
| AI vocal activation review | `https://mexicanjumbalia.github.io/driver-companion/ai-vocal-companion.html` | Feature-design and consent review only |
| Privacy/support email | `mailto:drivercompanionsuppteam1@gmail.com` | Privacy inquiries, corrections, and support containing personal information |
| Public bug report | `https://github.com/mexicanjumbalia/driver-companion/issues/new/choose` | Non-sensitive bug reports only; never request audio, transcripts, phone numbers, or location |

## Publication checklist

1. Enable GitHub Pages for the intended branch/workflow, then test each URL over HTTPS with no sign-in and no geographic restriction.
2. Confirm `privacy.html` names the app or publisher and includes a working privacy contact. Google Play requires a privacy policy both in the Play Console field and within the app.
3. Create the support issue template only for non-sensitive product feedback. Direct privacy, account, or deletion requests to the support email instead.
4. Complete the actual Google Play Data Safety form separately. The local `data-safety.html` page is a review aid; it cannot submit or replace the Play Console declaration.
5. Re-run this checklist whenever the app adds a provider, account, analytics, cloud audio, crash reporting, advertising, or data transmission.

## Support handling minimum

- Do not ask people to attach recordings, transcripts, passenger information, exact travel routes, or payment details to public issues.
- Use the email channel only for requests a public issue cannot handle. Maintain a documented response and deletion process before public launch.
- If an account system is later introduced, add a public account-deletion web page and the matching in-app control before release.

The publisher remains responsible for final policy accuracy and the published URL's availability. See Google's [Privacy Policy requirements](https://support.google.com/googleplay/android-developer/answer/17105854?hl=en) and [Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
