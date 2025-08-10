import "dotenv/config";

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  JWT_SECRET: process.env.JWT_SECRET || "dev_secret_change_me"
};
