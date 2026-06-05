import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Message from './src/models/message.model.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to DB");
    const msgs = await Message.find({ fileUrl: { $exists: true } }).limit(10);
    console.log("Messages with fileUrl:", JSON.stringify(msgs, null, 2));
    process.exit(0);
}
run().catch(console.error);
