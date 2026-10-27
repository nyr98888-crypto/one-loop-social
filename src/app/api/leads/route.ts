import { NextResponse } from "next/server";
import {
  createLead,
  isValidLeadStatus,
  listLeads,
  type LeadStatus,
} from "@/lib/db/leads";

export const runtime = "nodejs";

export async function GET() {
  try {
    const leads = await listLeads();
    return NextResponse.json({ ok: true, leads });
  } catch (err) {
    console.error("[leads GET]", err);
    return NextResponse.json(
      { error: "Failed to load leads" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const sourceHeadline =
      typeof body.sourceHeadline === "string" ? body.sourceHeadline.trim() : "";
    const sourceDate =
      typeof body.sourceDate === "string" ? body.sourceDate.trim() : "";
    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone =
      typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const serviceDetails =
      typeof body.serviceDetails === "string" ? body.serviceDetails.trim() : "";
    const status: LeadStatus | undefined = isValidLeadStatus(body.status)
      ? body.status
      : undefined;

    if (!sourceHeadline || !sourceDate || !customerName || !customerPhone) {
      return NextResponse.json(
        {
          error:
            "Expected sourceHeadline, sourceDate, customerName, customerPhone",
        },
        { status: 400 },
      );
    }

    const lead = await createLead({
      sourceHeadline,
      sourceDate,
      customerName,
      customerPhone,
      serviceDetails,
      status,
    });

    return NextResponse.json({ ok: true, lead }, { status: 201 });
  } catch (err) {
    console.error("[leads POST]", err);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 },
    );
  }
}
