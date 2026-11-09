import { NextResponse } from "next/server";
import { getStorageMode } from "@/lib/db";
import { getTehranToday } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "BioTrack",
    storage: getStorageMode(),
    tehranDate: getTehranToday(),
  });
}
