import { NextRequest, NextResponse } from "next/server";
import { getRecords } from "@/lib/wallet";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const records = await getRecords({
      limit: sp.get("limit") ? Number(sp.get("limit")) : 50,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });
    return NextResponse.json(records);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
