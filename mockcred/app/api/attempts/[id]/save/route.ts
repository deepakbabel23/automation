import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveAttemptProgress } from "@/lib/attempts";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    answers?: Record<string, string[]>;
    flagged?: string[];
  };

  await saveAttemptProgress(user.id, params.id, body.answers ?? {}, body.flagged ?? []);
  return NextResponse.json({ ok: true });
}
