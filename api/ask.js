// api/ask.js
// Vercel serverless function: answers macro/markets questions using ONLY the
// live dashboard state passed in from the client (so the model cites real
// numbers currently on screen, not invented ones). Requires ANTHROPIC_API_KEY
// to be set in this project's Vercel environment variables.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in this project's environment variables" });
    return;
  }

  const { question, context } = req.body || {};
  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "Missing required field: question" });
    return;
  }

  const system = `You are the built-in macro assistant for a personal trading dashboard called TAPE.
Answer the user's question using ONLY the JSON snapshot of live dashboard data provided below —
this is the current state of the dashboard the user is looking at right now.
Rules:
- Cite the specific indicators/values you used (e.g. "CPI at 2.7%, trending down").
- If the snapshot doesn't contain what's needed to answer, say so plainly instead of guessing.
- Keep answers tight: 2-4 short sentences, no headers, no markdown bullets.
- Never give personalized investment advice or tell the user to buy/sell. This is educational only.
- End every answer with a one-line "Based on:" list of the indicator IDs you cited.

Live dashboard snapshot:
${JSON.stringify(context || {}, null, 2)}`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text();
      res.status(anthropicRes.status).json({ error: "Anthropic API request failed", detail });
      return;
    }

    const data = await anthropicRes.json();
    const answer = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ answer });
  } catch (err) {
    res.status(500).json({ error: "Unexpected error calling Anthropic API", detail: String(err) });
  }
}
