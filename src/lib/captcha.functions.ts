import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Self-hosted arithmetic CAPTCHA. The answer never leaves the server in
 * plain form: the client gets a signed, short-lived challenge token and
 * must send back the answer for verification.
 */

const TTL_MS = 5 * 60 * 1000;

function sign(payload: string): string {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_URL"] ?? "omdeyar-captcha";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export const issueCaptcha = createServerFn({ method: "GET" }).handler(async () => {
  const a = 2 + Math.floor(Math.random() * 8);
  const b = 2 + Math.floor(Math.random() * 8);
  const answer = a + b;
  const payload = JSON.stringify({ answer, exp: Date.now() + TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  return { question: `${a} + ${b}`, token: `${encoded}.${sign(encoded)}` };
});

export const verifyCaptcha = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(1), answer: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const [encoded, signature] = data.token.split(".");
    if (!encoded || !signature) return { ok: false as const };
    const expected = sign(encoded);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return { ok: false as const };

    try {
      const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { answer: number; exp: number };
      if (Date.now() > parsed.exp) return { ok: false as const };
      return { ok: Number(data.answer) === parsed.answer };
    } catch {
      return { ok: false as const };
    }
  });
