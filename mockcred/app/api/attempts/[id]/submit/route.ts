import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { submitAttempt } from "@/lib/attempts";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    answers?: Record<string, string[]>;
  };

  try {
    const result = await submitAttempt(user.id, params.id, body.answers ?? {});
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "submit failed" },
      { status: 400 },
    );
  }
}
