import "./load-database-env.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

let parsed;

try {
  parsed = new URL(connectionString);
} catch {
  console.error("DATABASE_URL is not a valid URL");
  process.exit(1);
}

const host = parsed.hostname;
const sslmode = parsed.searchParams.get("sslmode") || "(none)";
const database = decodeURIComponent(parsed.pathname.replace(/^\//, "") || "(none)");
const pooled = host.includes("pooler") || parsed.port === "6543";

let target = "other";

if (host.includes("neon.tech")) {
  target = "neon";
} else if (host === "localhost" || host === "127.0.0.1" || host === "postgres") {
  target = "local";
}

console.log(`target=${target}`);
console.log(`host=${host}`);
console.log(`database=${database}`);
console.log(`sslmode=${sslmode}`);
console.log(`pooled=${pooled ? "yes" : "no"}`);

if (process.env.PRISMA_ENV === "neon" && target !== "neon") {
  console.error("PRISMA_ENV=neon but DATABASE_URL does not point at Neon.");
  process.exit(1);
}
