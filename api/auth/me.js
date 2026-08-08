import { getSessionFromReq } from "../../lib/auth";

export default async function handler(req, res) {
  const session = getSessionFromReq(req);
  res.setHeader("Cache-Control", "no-store");
  if (!session) {
    res.status(200).json({ user: null });
    return;
  }
  res.status(200).json({ user: { email: session.email, role: session.role } });
}
