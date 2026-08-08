import { getRedis } from "../../lib/redis";
import { hashPassword, signSession, setSessionCookie, isValidEmail } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const { email, password } = req.body || {};
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address" });
    return;
  }
  if (!password || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const redis = getRedis();
    const key = `user:${email.toLowerCase()}`;
    const existing = await redis.get(key);
    if (existing) {
      res.status(409).json({ error: "An account with that email already exists" });
      return;
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
    const role = adminEmail && email.toLowerCase() === adminEmail ? "admin" : "member";

    const user = {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role,
      createdAt: new Date().toISOString(),
    };

    await redis.set(key, JSON.stringify(user));

    const token = signSession(user);
    setSessionCookie(res, token);
    res.status(200).json({ email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: "Signup failed", detail: String(err) });
  }
}
