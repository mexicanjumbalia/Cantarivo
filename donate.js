const funding = window.DRIVER_COMPANION_DONATIONS ?? {};
const fundingUrl = typeof funding.url === "string" ? funding.url.trim() : "";
const isVerifiedHttpsUrl = /^https:\/\/[^\s]+$/i.test(fundingUrl);

if (isVerifiedHttpsUrl) {
  const provider = typeof funding.providerName === "string" && funding.providerName.trim() ? funding.providerName.trim() : "the selected provider";
  const title = document.querySelector("[data-funding-title]");
  const copy = document.querySelector("[data-funding-copy]");
  const link = document.querySelector("[data-funding-link]");
  title.textContent = `Support is available through ${provider}.`;
  copy.textContent = "Support is optional. Selecting the button opens the provider’s own secure page in a new tab; Driver Companion does not receive payment details.";
  link.href = fundingUrl;
  link.hidden = false;
}
