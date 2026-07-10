import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
        userId: {
      type: Number,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false, // never returned by default in queries
    },
        accessLevel: {
      type: String,
      enum: ["usual", "master"],
      default: "usual",
    },
  },
  { timestamps: true,
    collection: "user",
   }
);

export const User = mongoose.model("User", userSchema);
