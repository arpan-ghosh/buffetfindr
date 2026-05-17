/**
 * Indian Buffet Finder — MCP Plugin
 * Exposes scraper tools that Claude can call directly.
 * Add more tools here as the project grows (verifier, exporter, etc.)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import { existsSync, readFileSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const SCRAPER_DIR = path.join(PROJECT_ROOT, "scraper");
const DATA_DIR = path.join(SCRAPER_DIR, "data");

// ─── Server setup ────────────────────────────────────────────────────────────

const server = new Server(
  { name: "buffet-scraper", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "scrape_buffets",
      description:
        "Scrape Google Places API (New) for Indian buffet restaurants in a given state. " +
        "Searches every major city, checks reviews and restaurant websites for buffet signals. " +
        "Takes 10–20 minutes per state. Writes results to scraper/data/.",
      inputSchema: {
        type: "object",
        properties: {
          state: {
            type: "string",
            enum: ["maryland", "virginia", "dc", "all"],
            description: "State to scrape. Start with maryland.",
          },
        },
        required: ["state"],
      },
    },
    {
      name: "get_buffet_results",
      description:
        "Read previously scraped buffet results for a state. " +
        "Returns a ranked list of Indian buffet restaurants with address, rating, and confidence score.",
      inputSchema: {
        type: "object",
        properties: {
          state: {
            type: "string",
            enum: ["maryland", "virginia", "dc"],
          },
          min_score: {
            type: "number",
            description: "Minimum buffet confidence score 0–100. Default: 30.",
          },
        },
        required: ["state"],
      },
    },
    {
      name: "check_scrape_status",
      description:
        "Check which states have been scraped, when, and how many buffets were found.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ],
}));

// ─── Tool handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "scrape_buffets") return runScraper(args.state);
  if (name === "get_buffet_results") return getResults(args.state, args.min_score ?? 30);
  if (name === "check_scrape_status") return checkStatus();

  throw new Error(`Unknown tool: ${name}`);
});

// ─── Implementations ──────────────────────────────────────────────────────────

function runScraper(state) {
  return new Promise((resolve) => {
    const lines = [];

    const proc = spawn("python3", ["main.py", "--state", state], {
      cwd: SCRAPER_DIR,
    });

    proc.stdout.on("data", (d) => lines.push(d.toString()));
    proc.stderr.on("data", (d) => lines.push(d.toString()));

    proc.on("close", () => {
      const all = lines.join("");
      const buffetLines = all
        .split("\n")
        .filter((l) => l.includes("✓ BUFFET") || l.includes("DONE:"))
        .join("\n");

      resolve({
        content: [
          {
            type: "text",
            text: `Scrape complete for ${state}.\n\n${buffetLines}\n\nFull log:\n${all}`,
          },
        ],
      });
    });
  });
}

function getResults(state, minScore) {
  const p = path.join(DATA_DIR, `${state}_buffets.json`);
  if (!existsSync(p)) {
    return {
      content: [
        {
          type: "text",
          text: `No results for ${state}. Run scrape_buffets("${state}") first.`,
        },
      ],
    };
  }

  const buffets = JSON.parse(readFileSync(p, "utf8")).filter(
    (b) => (b.buffet_score ?? 0) >= minScore
  );

  const rows = buffets
    .sort((a, b) => (b.buffet_score ?? 0) - (a.buffet_score ?? 0))
    .map(
      (b) =>
        `[${String(b.buffet_score).padStart(3)}] ${b.name}\n` +
        `       ${b.address}\n` +
        `       Rating: ${b.rating ?? "N/A"} (${b.review_count ?? 0} reviews) | ${b.buffet_confidence} confidence\n` +
        `       Evidence: ${(b.buffet_evidence ?? []).join("; ")}`
    )
    .join("\n\n");

  return {
    content: [
      {
        type: "text",
        text: `${buffets.length} Indian buffets in ${state.toUpperCase()} (score ≥ ${minScore}):\n\n${rows}`,
      },
    ],
  };
}

function checkStatus() {
  const states = ["maryland", "virginia", "dc"];
  const lines = states.map((state) => {
    const raw = path.join(DATA_DIR, `${state}_raw.json`);
    const buffetsFile = path.join(DATA_DIR, `${state}_buffets.json`);

    if (!existsSync(raw)) return `✗  ${state.padEnd(10)} — not scraped yet`;

    const mtime = new Date(statSync(raw).mtimeMs).toISOString().slice(0, 16).replace("T", " ");
    const total = JSON.parse(readFileSync(raw, "utf8")).length;
    const buffetCount = existsSync(buffetsFile)
      ? JSON.parse(readFileSync(buffetsFile, "utf8")).length
      : 0;

    return `✓  ${state.padEnd(10)} — ${total} restaurants, ${buffetCount} buffets  (last scraped ${mtime})`;
  });

  return {
    content: [{ type: "text", text: `Scrape status:\n\n${lines.join("\n")}` }],
  };
}

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
