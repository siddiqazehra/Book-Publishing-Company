import mongoose from "mongoose";

// Generic counter collection — one document per sequence name.
// Using findOneAndUpdate with $inc is atomic at the DB level, so two
// registrations happening at the same instant still get different numbers.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "userId"
  seq: { type: Number, default: 99 },    // first increment returns 100
});

export const Counter = mongoose.model("Counter", counterSchema, "counters");

export async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}
