import { NextResponse } from "next/server";
import { loginDev } from "@/lib/auth";
import { AUTH_PROVIDER } from "@/lib/env";

export async function POST(req: Request) {
  if (AUTH_PROVIDER !== "dev") {
    return NextResponse.json({ error: "dev login disabled" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  const user = await loginDev(email);
  return NextResponse.json({ ok: true, user });
}
