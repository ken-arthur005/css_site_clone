export const HOME_INTRO_SESSION_KEY = "css-home-intro-seen";

// Runs once in the persistent server layout, before the first-view markup.
export const HOME_INTRO_BOOT_SCRIPT = `(() => {
  try {
    document.documentElement.dataset.homeIntro = sessionStorage.getItem("css-home-intro-seen") === "true" ? "seen" : "new";
  } catch {
    document.documentElement.dataset.homeIntro = "seen";
  }
})();`;

export function hasSeenHomeIntro() {
  try {
    return window.sessionStorage.getItem(HOME_INTRO_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function markHomeIntroSeen() {
  document.documentElement.dataset.homeIntro = "seen";
  try {
    window.sessionStorage.setItem(HOME_INTRO_SESSION_KEY, "true");
  } catch {
    // Session storage can be unavailable in privacy-restricted contexts.
  }
}
