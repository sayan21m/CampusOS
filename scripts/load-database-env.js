import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config();

if (process.env.PRISMA_ENV === "neon") {
  const neonPath = resolve(process.cwd(), ".env.neon");

  if (!existsSync(neonPath)) {
    throw new Error(
      "PRISMA_ENV=neon but .env.neon was not found. Add a gitignored .env.neon with the Neon DIRECT DATABASE_URL (sslmode=require)."
    );
  }

  config({ path: neonPath, override: true });
}
