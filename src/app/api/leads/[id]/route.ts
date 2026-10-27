import { NextResponse } from "next/server";
import {
  getLeadById,
  isValidLeadStatus,
  updateLead,
} from "@/lib/db/leads";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const lead = await getLeadById(id);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    console.error("[leads/:id GET]", err);
    return NextResponse.json(
      { error: "Failed to load lead" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const status = isValidLeadStatus(body.status) ? body.status : undefined;
    const serviceDetails =
      typeof body.serviceDetails === "string" ? body.serviceDetails : undefined;
    const incrementWhatsappClicks = body.incrementWhatsappClicks === true;

    if (!status && serviceDetails === undefined && !incrementWhatsappClicks) {
      return NextResponse.json(
        {
          error:
            "Provide status, serviceDetails, and/or incrementWhatsappClicks",
        },
        { status: 400 },
      );
    }

    const lead = await updateLead(id, {
      status,
      serviceDetails,
      incrementWhatsappClicks,
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    console.error("[leads/:id PATCH]", err);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}
