import { env } from "../../config/env.js";


const consoleProvider = {
  async send({ to, message }) {
    console.log(`[SMS:console] → ${to}: ${message}`);
  },
};

const PROVIDERS = {
  console: consoleProvider,
};

export function getSmsProvider() {
  const provider = PROVIDERS[env.smsProvider];
  if (!provider) {
    throw new Error(`Unknown SMS_PROVIDER "${env.smsProvider}". Available: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  return provider;
}
