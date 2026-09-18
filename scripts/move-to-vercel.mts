// Copies everything from this computer to Vercel: the database (to Neon) and uploaded files (to Vercel Blob).
// The target settings come from .env.vercel (made by `npx vercel env pull .env.vercel`) and, because
// Neon's variables are "Sensitive" and can't be pulled, from .env.neon (the snippet copied on the Neon page).
// WARNING: replaces all data in the Neon database.
// Usage: npm run move-to-vercel -- --yes
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { put } from "@vercel/blob";
import { config } from "dotenv";
import pg from "pg";

const local = config({ path: ".env", processEnv: {} }).parsed ?? {};
const target = {
  ...(config({ path: ".env.vercel", processEnv: {} }).parsed ?? {}),
  ...(config({ path: ".env.neon", processEnv: {} }).parsed ?? {}),
};

const localDb = local.DATABASE_URL;
const targetDb = target.DATABASE_URL_UNPOOLED || target.POSTGRES_URL_NON_POOLING || target.DATABASE_URL;
// Classic stores have a read-write token, newer ones use the pulled OIDC token with the store id
const blobAuth = target.BLOB_READ_WRITE_TOKEN
  ? { token: target.BLOB_READ_WRITE_TOKEN }
  : target.VERCEL_OIDC_TOKEN && target.BLOB_STORE_ID
    ? { oidcToken: target.VERCEL_OIDC_TOKEN, storeId: target.BLOB_STORE_ID }
    : null;

if (!process.argv.includes("--yes")) {
  console.log("This replaces all data in the Vercel database. Run again with --yes to continue.");
  process.exit(1);
}
if (!localDb || !targetDb || !blobAuth) {
  console.log(`Missing settings: ${[!localDb && ".env DATABASE_URL", !targetDb && ".env.neon DATABASE_URL_UNPOOLED", !blobAuth && ".env.vercel BLOB_STORE_ID + VERCEL_OIDC_TOKEN"].filter(Boolean).join(", ")}`);
  process.exit(1);
}

/** libpq doesn't understand Prisma's ?schema= parameter */
function libpqUrl(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.delete("schema");
  return parsed.toString();
}

function postgresTool(name: string) {
  const root = "C:\\Program Files\\PostgreSQL";
  const versions = existsSync(root) ? readdirSync(root).sort((a, b) => Number(b) - Number(a)) : [];
  for (const version of versions) {
    const file = path.join(root, version, "bin", `${name}.exe`);
    if (existsSync(file)) return file;
  }
  return name;
}

async function counts(url: string) {
  const client = new pg.Client({ connectionString: libpqUrl(url) });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT (SELECT count(*) FROM "User")::int AS users, (SELECT count(*) FROM "Lesson")::int AS lessons,
              (SELECT count(*) FROM "Submission")::int AS submissions, (SELECT count(*) FROM "Message")::int AS messages`,
    );
    return rows[0] as Record<string, number>;
  } finally {
    await client.end();
  }
}

// ── 1. Database ──
console.log("1/2 Database");
const dir = mkdtempSync(path.join(tmpdir(), "codov-"));
const dump = path.join(dir, "codov.dump");
try {
  const dumped = spawnSync(postgresTool("pg_dump"), ["-Fc", "--no-owner", "-f", dump, "-d", libpqUrl(localDb)], { stdio: ["ignore", "inherit", "inherit"] });
  if (dumped.status !== 0) throw new Error("pg_dump failed");

  // Errors about objects that don't exist yet are expected with --clean, so the result is checked by counting rows
  spawnSync(postgresTool("pg_restore"), ["--clean", "--if-exists", "--no-owner", "--no-privileges", "-d", libpqUrl(targetDb), dump], {
    stdio: ["ignore", "ignore", "pipe"],
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const [before, after] = await Promise.all([counts(localDb), counts(targetDb)]);
console.log("   this computer:", before);
console.log("   Vercel:       ", after);
if (JSON.stringify(before) !== JSON.stringify(after)) {
  console.log("   Counts differ — the database was not copied completely.");
  process.exit(1);
}

// ── 2. Uploaded files ──
console.log("2/2 Files");
const uploadRoot = path.resolve(local.UPLOAD_DIR || "storage/uploads");
const files: string[] = [];
const walk = (folder: string) => {
  if (!existsSync(folder)) return;
  for (const entry of readdirSync(folder)) {
    const full = path.join(folder, entry);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
};
walk(uploadRoot);

let done = 0;
for (const file of files) {
  const pathname = path.relative(uploadRoot, file).split(path.sep).join("/");
  await put(pathname, readFileSync(file), { access: "public", addRandomSuffix: false, allowOverwrite: true, ...blobAuth });
  done++;
}
console.log(`   ${done} of ${files.length} files uploaded`);
console.log("Done.");
process.exit(0);
