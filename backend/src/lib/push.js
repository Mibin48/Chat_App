import webPush from "web-push";
import "dotenv/config";

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.warn("⚠️ VAPID keys are missing from environment variables. Generating dynamic VAPID keys for this session...");
  const generated = webPush.generateVAPIDKeys();
  vapidKeys.publicKey = generated.publicKey;
  vapidKeys.privateKey = generated.privateKey;
  console.log("-----------------------------------------");
  console.log("🔑 GENERATED VAPID KEYS (Save to backend/.env):");
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log("-----------------------------------------");
}

// Set VAPID details
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@chatapp.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export const sendPushNotificationToUsers = async (userIds, payload) => {
  try {
    const PushSubscription = (await import("../models/push.model.js")).default;
    const rawIds = Array.isArray(userIds) ? userIds : [userIds];
    const subscriptions = await PushSubscription.find({ userId: { $in: rawIds } });

    const payloadString = JSON.stringify(payload);

    const promises = subscriptions.map(async (subDoc) => {
      try {
        await webPush.sendNotification(subDoc.subscription, payloadString);
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing expired subscription for user ${subDoc.userId}`);
          await PushSubscription.findByIdAndDelete(subDoc._id);
        } else {
          console.error(`Error sending push notification to user ${subDoc.userId}:`, error);
        }
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error("Failed to send push notifications:", err);
  }
};

export { webPush, vapidKeys };
export default webPush;
