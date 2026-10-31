import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
// In-memory only cache (NEVER stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignInForGmail = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Gmail OAuth access token from Google Sign-In.');
    }

    cachedAccessToken = credential.accessToken;

    // Register encrypted token in backend AES-256-GCM vault (stored encrypted in server memory, never returned to client)
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cachedAccessToken}`,
      },
      body: JSON.stringify({
        email: result.user.email || '',
        uid: result.user.uid,
      }),
    }).catch(() => {});

    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getGmailAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const disconnectGmailAccount = async (): Promise<void> => {
  const tokenToRevoke = cachedAccessToken;
  cachedAccessToken = null;

  try {
    await fetch('/api/auth/disconnect', {
      method: 'POST',
      headers: tokenToRevoke ? { Authorization: `Bearer ${tokenToRevoke}` } : {},
    });
  } catch {
    // Ignore network error during disconnect
  }

  if (tokenToRevoke) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // Ignore revoke CORS/network warning
    }
  }

  await auth.signOut();
};
