import mongoose from "mongoose";

const pushSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscription: {
      endpoint: { type: String, required: true },
      expirationTime: { type: Number, default: null },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per user per endpoint
pushSchema.index({ userId: 1, "subscription.endpoint": 1 }, { unique: true });

const PushSubscription = mongoose.model("PushSubscription", pushSchema);
export default PushSubscription;
