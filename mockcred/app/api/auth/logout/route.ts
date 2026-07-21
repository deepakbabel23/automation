import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

export async function POST() {
  logout();
  return NextResponse.json({ ok: true });
}
