import { NextResponse } from "next/server";
import { check_availability } from "@/lib/tool-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await check_availability(
    {
      check_in_date: body.check_in_date,
      check_out_date: body.check_out_date,
      party_size: Number(body.party_size ?? 2)
    },
    {}
  );
  return NextResponse.json(result);
}
