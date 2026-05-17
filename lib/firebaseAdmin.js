import admin from "firebase-admin";

let initialized = false;

function getAdmin() {
  if (initialized || admin.apps.length > 0) return admin;

  try {
    let credential;

    if (process.env.FCM_SERVICE_ACCOUNT_KEY) {
      let raw = process.env.FCM_SERVICE_ACCOUNT_KEY.trim();
      // 단따옴표로 감싸진 경우 제거
      if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
      // 실제 줄바꿈 → \n 이스케이프 처리 (private_key 내부 newline 대응)
      const sa = JSON.parse(raw.replace(/\n/g, "\\n").replace(/\\\\n/g, "\\n"));
      // private_key 내 \\n → 실제 newline 복원
      if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
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
