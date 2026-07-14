import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  shopName: { type: String, default: "Publishing Company" },
  easypaisaNumber: { type: String, default: "" },
  easypaisaName: { type: String, default: "" },
  jazzcashNumber: { type: String, default: "" },
  jazzcashName: { type: String, default: "" },
});

settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

export const Settings = mongoose.model("Settings", settingsSchema);
