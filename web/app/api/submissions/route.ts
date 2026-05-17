import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Resend } from "resend";

const FILE = path.join(process.cwd(), "data", "submissions.json");
const USE_DB = !!process.env.DATABASE_URL;
const NOTIFY_EMAIL = "arpanghosh95@gmail.com";

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

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const lines = [
      `<b>Name:</b> ${submission.name}`,
      `<b>City:</b> ${submission.city}`,
      `<b>State:</b> ${submission.state}`,
      submission.phone   ? `<b>Phone:</b> ${submission.phone}`   : null,
      submission.website ? `<b>Website:</b> ${submission.website}` : null,
      submission.notes   ? `<b>Notes:</b> ${submission.notes}`   : null,
    ].filter(Boolean).join("<br/>");
    await resend.emails.send({
      from: "BuffetFindr <onboarding@resend.dev>",
      to: NOTIFY_EMAIL,
      subject: `New buffet submission: ${submission.name} (${submission.city}, ${submission.state})`,
      html: `<p>A new restaurant was submitted to BuffetFindr and needs review.</p><p>${lines}</p><p><b>ID:</b> ${submission.id}</p>`,
    }).catch(() => {}); // don't fail the request if email fails
  }

  return NextResponse.json({ success: true, id: submission.id });
}

export async function GET() {
  if (USE_DB) return NextResponse.json(await dbList());
  return NextResponse.json(fileLoad());
}
