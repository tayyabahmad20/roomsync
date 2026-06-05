import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.mongodbUri, {
    autoIndex: env.nodeEnv !== "production"
  });

  const { host, name } = mongoose.connection;
  console.log(`[db] connected: ${host}/${name}`);
}
