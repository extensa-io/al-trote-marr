import { currentOwner, unauthorized } from "@/lib/owner";
import { getSession, updateSession } from "@/lib/db";
import { validateActual, validateStatus } from "@/lib/validation";

export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const owner = await currentOwner();
  if (!owner) return unauthorized();
  const { date } = await params;
  const doc = await getSession(owner, date);
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(doc);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ date: string }> }) {
  const owner = await currentOwner();
  if (!owner) return unauthorized();
  const { date } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Parameters<typeof updateSession>[2] = {};

  if (body.status !== undefined) {
    const checked = validateStatus(body.status);
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 });
    patch.status = checked.value;
  }

  if (body.actual !== undefined && body.actual !== null) {
    if (typeof body.actual !== "object")
      return Response.json({ error: "actual must be an object" }, { status: 400 });
    const checked = validateActual(body.actual);
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 });
    patch.actual = checked.value;
  }

  const updated = await updateSession(owner, date, patch);
  if (!updated) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(updated);
}
