import admin from "firebase-admin";

let initialized = false;

function getAdmin() {
  if (initialized || admin.apps.length > 0) return admin;

  try {
    let credential;

    if (process.env.FCM_SERVICE_ACCOUNT_KEY) {
      const sa = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(sa);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      });
    } else {
      return null;
    }

    admin.initializeApp({ credential });
    initialized = true;
  } catch {
    return null;
  }

  return admin;
}

export default getAdmin;
