import { Safepay } from "@sfpy/node-sdk";

let _safepay = null;

export function getSafepay() {
  if (_safepay) return _safepay;

  const environment = process.env.SAFEPAY_ENV === "production" ? "production" : "sandbox";

  if (!process.env.SAFEPAY_SECRET_KEY) {
    throw new Error(
      "SAFEPAY_SECRET_KEY is not set. Check that .env is in the project root and has SAFEPAY_SECRET_KEY set."
    );
  }

  _safepay = new Safepay({
    environment,
    apiKey: process.env.SAFEPAY_SECRET_KEY,
    webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET,
  });

  return _safepay;
}

export const SAFEPAY_CURRENCY = "PKR";