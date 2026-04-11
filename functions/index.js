const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendPush = functions.firestore
  .document("messages/{id}")
  .onCreate(async (snap) => {
    const msg = snap.data();

    const toUser = msg.to;

    const userSnap = await admin
      .firestore()
      .collection("users")
      .where("nickname", "==", toUser)
      .get();

    if (userSnap.empty) return;

    const token = userSnap.docs[0].data().fcmToken;
    if (!token) return;

    await admin.messaging().send({
      token,
      notification: {
        title: msg.from,
        body: msg.content,
      },
    });
  });