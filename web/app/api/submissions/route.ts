import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const FILE = path.join(process.cwd(), "data", "submissions.json");
const USE_DB = !!process.env.DATABASE_URL;

async function dbInsert(sub: object) {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const s = sub as Record<string, string | null>;
  await sql`
    INSERT INTO restaurant_submissions (id, name, city, state, phone, website, notes)
    VALUES (${s.id}, ${s.name}, ${s.city}, ${s.state}, ${s.phone}, ${s.website}, ${s.notes})
  `;
}

async function dbList() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  return sql`SELECT * FROM restaurant_submissions ORDER BY submitted_at DESC`;
}

function fileLoad(): object[] {
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { return []; }
}

export async function POST(req: NextRequest) {
  const { name, city, state, phone, website, notes } = await req.json();
  if (!name?.trim() || !city?.trim())
    return NextResponse.json({ error: "Name and city are required." }, { status: 400 });

  const submission = {
    id:    randomUUID(),
    name:  name.trim(),
    city:  city.trim(),
    state: state?.trim() || "Unknown",
    phone: phone?.trim() || null,
    website: website?.trim() || null,
    notes:   notes?.trim() || null,
    status:  "pending",
  };

  if (USE_DB) {
    await dbInsert(submission);
  } else {
    const all = fileLoad();
    all.push({ ...submission, submitted_at: new Date().toISOString() });
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
  }

  return NextResponse.json({ success: true, id: submission.id });
}

export async function GET() {
  if (USE_DB) return NextResponse.json(await dbList());
  return NextResponse.json(fileLoad());
}
