import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("Missing MONGODB_URI in .env — copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      dbName: "PublishingCompany",
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}
