/**
 * Seed the local user: Ldawg / Password
 * Run: npm run seed:user
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

async function seedUser() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/classpilot";
  await mongoose.connect(uri);

  const username = "Ldawg";
  const password = "Password";

  const existing = await User.findOne({ username });
  if (existing) {
    console.log("User Ldawg already exists. Updating password.");
    existing.hashedPassword = await bcrypt.hash(password, 10);
    await existing.save();
    console.log("Password updated.");
  } else {
    await User.create({
      username,
      hashedPassword: await bcrypt.hash(password, 10),
      displayName: "Ldawg",
    });
    console.log("Created user Ldawg.");
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedUser().catch((e) => {
  console.error(e);
  process.exit(1);
});
