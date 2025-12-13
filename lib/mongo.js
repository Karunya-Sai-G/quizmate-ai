import mongoose from "mongoose";

let isConnected = false;

export default async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGO_URL;
  if (!uri) throw new Error("MongoDB connection string missing!");

  await mongoose.connect(uri);

  isConnected = true;
  console.log("MongoDB Connected ✔");
}
