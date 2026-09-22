import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:8080")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES || 5),
  otpLength: Number(process.env.OTP_LENGTH || 6),
  smsProvider: process.env.SMS_PROVIDER || "console",
};
