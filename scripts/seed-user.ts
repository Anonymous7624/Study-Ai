/**
 * Seed a dev user for local development.
 * Run: npm run seed:user
 *
 * Creates: dev@classpilot.local / devuser / DevPass123!
 * Override via env: SEED_EMAIL, SEED_USERNAME, SEED_PASSWORD
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

async function seedUser() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/classpilot";
  await mongoose.connect(uri);

  const email = process.env.SEED_EMAIL || "dev@classpilot.local";
  const username = process.env.SEED_USERNAME || "devuser";
  const password = process.env.SEED_PASSWORD || "DevPass123!";

  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }],
  });

  if (existing) {
    console.log(`User already exists: ${(existing as { email?: string }).email ?? existing.username}`);
    if (!(existing as { email?: string }).email) {
      (existing as { email?: string }).email = `${existing.username}@classpilot.local`;
      console.log("Added missing email for migration.");
    }
    existing.hashedPassword = await bcrypt.hash(password, 10);
    await existing.save();
    console.log("Password updated.");
  } else {
    await User.create({
      email: email.toLowerCase(),
      username,
      hashedPassword: await bcrypt.hash(password, 10),
      displayName: username,
    });
    console.log(`Created user: ${email} / ${username}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedUser().catch((e) => {
  console.error(e);
  process.exit(1);
});
