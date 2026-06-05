import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { assertRequiredEnv, env } from "./config/env.js";

async function bootstrap() {
  assertRequiredEnv();
  await connectDb();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

bootstrap().catch((err) => {
  console.error("[server] fatal error:", err);
  process.exit(1);
});
