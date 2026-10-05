/**
 * Where the app's cloud copy lives. These values identify the project; they are not secrets
 * (what protects the data is the sign-in and the rules in Firestore). While `apiKey` is blank,
 * sync stays switched off and the app works exactly as before, on this device only.
 */
/**
 * Where Firebase's sign-in pages are served from. On the Netlify site (and local testing) they're
 * served from the app's own address, because a different address gets blocked by browsers that
 * partition third-party storage. Anywhere else (the GitHub Pages copy) the standard one is used.
 */
const OWN_ADDRESS_OK = typeof location !== "undefined" && (location.hostname === "localhost" || location.hostname.endsWith(".netlify.app"));

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDHb7o-Utun9lb0sgn-OY11C9AB_woEF2I",
  authDomain: OWN_ADDRESS_OK ? location.host : "counter-gym-app.firebaseapp.com",
  projectId: "counter-gym-app",
  storageBucket: "counter-gym-app.firebasestorage.app",
  messagingSenderId: "768451689553",
  appId: "1:768451689553:web:e20867f9d69c242eec8c70",
};

export const syncConfigured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
