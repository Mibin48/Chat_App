import PushSubscription from "../models/push.model.js";

export const subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ error: "Invalid subscription payload." });
    }

    const userId = req.user._id;

    // Use upsert to avoid duplicate subscriptions for same endpoint and user
    await PushSubscription.findOneAndUpdate(
      { userId, "subscription.endpoint": subscription.endpoint },
      { userId, subscription },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Successfully subscribed to push notifications." });
  } catch (error) {
    console.error("Error in subscribePush:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint required to unsubscribe." });
    }

    const userId = req.user._id;

    await PushSubscription.findOneAndDelete({ userId, "subscription.endpoint": endpoint });

    res.status(200).json({ message: "Successfully unsubscribed." });
  } catch (error) {
    console.error("Error in unsubscribePush:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
