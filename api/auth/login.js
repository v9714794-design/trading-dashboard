import { getRedis } from "../../lib/redis";
import { verifyPassword, signSession, setSessionCookie, isValidEmail } from "../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const { email, password } = req.body || {};
  if (!isValidEmail(email) || !password) {
    res.status(400).json({ error: "Enter your email and password" });
    return;
  }

  try {
    const redis = getRedis();
    const raw = await redis.get(`user:${email.toLowerCase()}`);
    if (!raw) {
      res.status(401).json({ error: "Incorrect email or password" });
      return;
    }
    const user = typeof raw === "string" ? JSON.parse(raw) : raw;
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Incorrect email or password" });
      return;
    }

    const token = signSession(user);
    setSessionCookie(res, token);
    res.status(200).json({ email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: "Login failed", detail: String(err) });
  }
}
