// Builds the "GitHub in numbers" card from live data (run by .github/workflows/profile.yml).
//
//   GITHUB_TOKEN=... node scripts/build-stats.mjs            → real data via GraphQL
//   node scripts/build-stats.mjs --mock                      → sample data, for layout work
//
// Output: dist/stats-dark.svg and dist/stats-light.svg

import { mkdir, writeFile } from "node:fs/promises";
import { FONT, THEMES, defs, esc, frame, svg } from "./theme.mjs";

const LOGIN = process.env.GITHUB_REPOSITORY_OWNER ?? "jhonatan-goncalves-pereira";
const OUT = new URL("../dist/", import.meta.url);

/** Markup, styling and notebook output inflate byte counts without reflecting what I program in. */
const IGNORED_LANGUAGES = new Set(["HTML", "CSS", "SCSS", "Jupyter Notebook", "Dockerfile", "Makefile", "CMake"]);
const TOP_LANGUAGES = 6;

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    createdAt
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount date } }
      }
    }
  }
}`;

async function fetchData() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required (or pass --mock).");
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": LOGIN },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(`GitHub GraphQL failed: ${response.status} ${JSON.stringify(payload.errors ?? payload)}`);
  }
  const user = payload.data.user;

  const bytes = new Map();
  for (const repo of user.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) {
      if (IGNORED_LANGUAGES.has(node.name)) continue;
      const entry = bytes.get(node.name) ?? { name: node.name, color: node.color ?? "#8b949e", size: 0 };
      entry.size += size;
      bytes.set(node.name, entry);
    }
  }

  const calendar = user.contributionsCollection.contributionCalendar;
  return {
    createdAt: user.createdAt,
    repos: user.repositories.totalCount,
    contributions: calendar.totalContributions,
    weeks: calendar.weeks.map((w) => ({
      date: w.contributionDays[0].date,
      count: w.contributionDays.reduce((sum, d) => sum + d.contributionCount, 0),
    })),
    languages: [...bytes.values()].sort((a, b) => b.size - a.size),
  };
}

function mockData() {
  const weeks = Array.from({ length: 53 }, (_, i) => {
    const date = new Date(Date.UTC(2025, 9, 12 + i * 7)).toISOString().slice(0, 10);
    const count = Math.max(0, Math.round(9 + 8 * Math.sin(i / 3.1) + 6 * Math.sin(i / 1.3 + 1) + (i > 40 ? 9 : 0)));
    return { date, count };
  });
  return {
    createdAt: "2021-11-20T19:43:46Z",
    repos: 62,
    contributions: weeks.reduce((s, w) => s + w.count, 0),
    weeks,
    languages: [
      { name: "JavaScript", color: "#f1e05a", size: 420 },
      { name: "Java", color: "#b07219", size: 310 },
      { name: "TypeScript", color: "#3178c6", size: 260 },
      { name: "Python", color: "#3572A5", size: 220 },
      { name: "C", color: "#555555", size: 180 },
      { name: "R", color: "#198CE7", size: 40 },
      { name: "C#", color: "#178600", size: 20 },
    ],
  };
}

/* ── Rendering ───────────────────────────────────────────────── */

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const number = (n) => new Intl.NumberFormat("pt-BR").format(n);

function kpi(t, id, x, y, value, label) {
  return `
  <text x="${x}" y="${y}" font-family="${FONT.sans}" font-size="58" font-weight="700" letter-spacing="-2.5" fill="url(#${id}-brand)">${esc(value)}</text>
  <text x="${x + 2}" y="${y + 30}" font-family="${FONT.sans}" font-size="15" fill="${t.dim}">${esc(label)}</text>`;
}

function languagesBlock(t, id, languages, x, y, width) {
  const top = languages.slice(0, TOP_LANGUAGES);
  const total = top.reduce((sum, l) => sum + l.size, 0) || 1;
  let out = `<text x="${x}" y="${y}" font-family="${FONT.mono}" font-size="12" letter-spacing="2.2" fill="${t.dim}">LINGUAGENS MAIS USADAS</text>`;

  // One stacked bar, clipped to a pill.
  const barY = y + 22;
  const barH = 12;
  out += `<clipPath id="${id}-bar"><rect x="${x}" y="${barY}" width="${width}" height="${barH}" rx="${barH / 2}"/></clipPath><g clip-path="url(#${id}-bar)">`;
  let cursor = x;
  for (const lang of top) {
    const w = (lang.size / total) * width;
    out += `<rect x="${cursor.toFixed(1)}" y="${barY}" width="${Math.max(w - 2, 1).toFixed(1)}" height="${barH}" fill="${lang.color}"/>`;
    cursor += w;
  }
  out += `</g>`;

  const colW = width / 2;
  top.forEach((lang, i) => {
    const lx = x + (i % 2) * colW;
    const ly = barY + 44 + Math.floor(i / 2) * 30;
    const pct = ((lang.size / total) * 100).toFixed(1).replace(".", ",");
    out += `<circle cx="${lx + 6}" cy="${ly - 5}" r="6" fill="${lang.color}" stroke="${t.border}"/>`;
    out += `<text x="${lx + 22}" y="${ly}" font-family="${FONT.sans}" font-size="16" font-weight="600" fill="${t.fg}">${esc(lang.name)}</text>`;
    out += `<text x="${lx + colW - 18}" y="${ly}" text-anchor="end" font-family="${FONT.mono}" font-size="13" fill="${t.dim}">${pct}%</text>`;
  });
  return out;
}

function activityChart(t, id, weeks, x, y, width, height) {
  const max = Math.max(...weeks.map((w) => w.count), 1);
  const step = width / (weeks.length - 1);
  const points = weeks.map((w, i) => [x + i * step, y + height - (w.count / max) * (height - 6)]);

  // Smooth the line with midpoint quadratic segments.
  let line = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    line += ` Q${px.toFixed(1)} ${py.toFixed(1)} ${((px + cx) / 2).toFixed(1)} ${((py + cy) / 2).toFixed(1)}`;
  }
  const last = points[points.length - 1];
  line += ` L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  const area = `${line} L${last[0].toFixed(1)} ${y + height} L${x} ${y + height} Z`;

  let ticks = "";
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const month = Number(w.date.slice(5, 7)) - 1;
    if (month === lastMonth) return;
    lastMonth = month;
    if (i === 0 || i > weeks.length - 3) return; // avoid labels clipped at the edges
    ticks += `<text x="${(x + i * step).toFixed(1)}" y="${y + height + 22}" font-family="${FONT.mono}" font-size="11" fill="${t.dim}">${MONTHS[month]}</text>`;
  });

  return `
  <text x="${x}" y="${y - 16}" font-family="${FONT.mono}" font-size="12" letter-spacing="2.2" fill="${t.dim}">ATIVIDADE SEMANAL · ÚLTIMOS 12 MESES</text>
  <text x="${x + width}" y="${y - 16}" text-anchor="end" font-family="${FONT.mono}" font-size="12" fill="${t.dim}">pico: ${max} / semana</text>
  <linearGradient id="${id}-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.mint}" stop-opacity="0.32"/><stop offset="1" stop-color="${t.mint}" stop-opacity="0"/></linearGradient>
  <path d="M${x} ${y + height}H${x + width}" stroke="${t.border}"/>
  <path d="${area}" fill="url(#${id}-area)"/>
  <path d="${line}" fill="none" stroke="url(#${id}-brand)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4.5" fill="${t.mint}"><animate attributeName="r" dur="2.2s" repeatCount="indefinite" values="4.5;7;4.5"/><animate attributeName="opacity" dur="2.2s" repeatCount="indefinite" values="1;0.45;1"/></circle>
  ${ticks}`;
}

function statsCard(t, data) {
  const W = 1200;
  const H = 468;
  const id = `g-${t.name}`;
  const years = Math.floor((Date.now() - new Date(data.createdAt).getTime()) / (365.25 * 24 * 3600 * 1000));
  const since = new Date(data.createdAt).getUTCFullYear();

  const body = `${defs(t, id)}
  ${frame(t, id, W, H, { grid: false })}
  ${kpi(t, id, 44, 96, number(data.contributions), "contribuições nos últimos 12 meses")}
  ${kpi(t, id, 44, 204, number(data.repos), "repositórios públicos")}
  ${kpi(t, id, 330, 204, `${years}+`, `anos no GitHub (desde ${since})`)}
  <path d="M640 40V236" stroke="${t.border}"/>
  ${languagesBlock(t, id, data.languages, 684, 62, 472)}
  <path d="M24 262H${W - 24}" stroke="${t.border}"/>
  ${activityChart(t, id, data.weeks, 44, 316, W - 88, 96)}`;

  const label = `GitHub em números: ${data.contributions} contribuições nos últimos 12 meses, ${data.repos} repositórios públicos, ${years}+ anos no GitHub. Linguagens: ${data.languages
    .slice(0, TOP_LANGUAGES)
    .map((l) => l.name)
    .join(", ")}.`;
  return svg(W, H, label, body);
}

/* ── Main ────────────────────────────────────────────────────── */

const data = process.argv.includes("--mock") ? mockData() : await fetchData();
await mkdir(OUT, { recursive: true });
for (const t of Object.values(THEMES)) {
  await writeFile(new URL(`stats-${t.name}.svg`, OUT), statsCard(t, data));
}
console.log(
  `stats: ${data.contributions} contributions · ${data.repos} repos · ${data.languages
    .slice(0, TOP_LANGUAGES)
    .map((l) => l.name)
    .join(", ")}`,
);
