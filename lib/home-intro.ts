export const HOME_INTRO_SESSION_KEY = "css-home-intro-seen";

export function hasSeenHomeIntro() {
  try {
    return window.sessionStorage.getItem(HOME_INTRO_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function markHomeIntroSeen() {
  try {
    window.sessionStorage.setItem(HOME_INTRO_SESSION_KEY, "true");
  } catch {
    // Session storage can be unavailable in privacy-restricted contexts.
  }
}
