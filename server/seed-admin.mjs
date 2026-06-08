import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "crypto";

// Import schema using dynamic require since we're in ESM
const users = (await import("../drizzle/schema.ts")).users;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

async function seed() {
  try {
    const passwordHash = await bcrypt.hash("Bomax47@", 10);
    const openId = "local_" + randomBytes(16).toString("hex");

    await db.insert(users).values({
      openId,
      username: "kayronfpss1",
      email: "giacomo01011999@gmail.com",
      passwordHash,
      name: "kayronfpss1",
      loginMethod: "local",
      role: "admin",
      lastSignedIn: new Date(),
    });

    console.log("✅ Admin account created: kayronfpss1");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
