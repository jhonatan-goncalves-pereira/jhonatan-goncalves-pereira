// Generates the static README artwork into ./assets (run: `node scripts/build-assets.mjs`).
// Everything is plain SVG with SMIL animation, so it renders on github.com with no
// external service involved.

import { mkdir, writeFile } from "node:fs/promises";
import { FONT, THEMES, chips, defs, esc, frame, svg } from "./theme.mjs";

const OUT = new URL("../assets/", import.meta.url);

/* ── Content ─────────────────────────────────────────────────── */

const STACK = [
  ["Frontend", ["React", "Next.js", "TypeScript", "JavaScript", "Vite", "Tailwind CSS"]],
  ["Backend", ["Java", "Spring Boot", "Node.js", "Express", "PHP", "REST APIs", "JWT"]],
  ["Dados", ["PostgreSQL", "MySQL", "SQL Server", "Oracle", "Prisma ORM", "Power BI"]],
  ["Infra & DevOps", ["Linux", "Docker", "Proxmox / KVM", "NGINX", "GitHub Actions", "AWS"]],
  ["QA & Testes", ["Cypress", "Selenium", "JUnit", "REST Assured", "Postman", "Pytest"]],
  ["ML & Edge", ["Python", "scikit-learn", "DistilBERT", "ESP32", "MQTT", "Grafana"]],
];

const PROJECTS = [
  {
    id: "pulsopnaat",
    kicker: "Edge AI · IoT",
    title: "PulsoPNAAT",
    lines: [
      "Manutenção preditiva por vibração: ESP32-S3 lê o",
      "acelerômetro a 400 Hz, extrai 18 métricas por segundo",
      "e classifica o estado do equipamento.",
    ],
    stack: ["C", "ESP32-S3", "MQTT", "Grafana", "Python"],
  },
  {
    id: "curriculo",
    kicker: "Frontend · WebGL",
    title: "Portfólio 3D",
    lines: [
      "Site pessoal com 15 mil partículas em WebGL puro, sem",
      "biblioteca 3D, que se transformam conforme o scroll.",
      "Next.js estático, bilíngue e acessível.",
    ],
    stack: ["Next.js", "TypeScript", "WebGL", "GLSL", "Motion"],
  },
  {
    id: "serverest",
    kicker: "QA · Automação",
    title: "ServeRest API Tests",
    lines: [
      "Suíte de testes de API com validação por JSON Schema,",
      "relatórios Allure publicados e execução contínua",
      "em GitHub Actions.",
    ],
    stack: ["Python", "Pytest", "Allure", "GitHub Actions"],
  },
  {
    id: "labs-api",
    kicker: "Backend · API REST",
    title: "API de Laboratórios",
    lines: [
      "API em Node.js e Express com autenticação JWT,",
      "upload de imagens, relatório em PDF e testes",
      "com Jest e Supertest.",
    ],
    stack: ["Node.js", "Express", "MongoDB", "JWT", "Jest"],
  },
];

/* ── Banner ──────────────────────────────────────────────────── */

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Deterministic PRNG: the artwork is identical on every build. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a, b, k) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, "0")).join("");
}

/**
 * A sphere of dots spinning around its vertical axis. SVG has no 3D, so each dot
 * gets its projected x-position and depth-based opacity baked into SMIL keyframes.
 */
function sphere(t, cx, cy, radius, count = 260, seconds = 32) {
  const rand = mulberry32(11);
  const STEPS = 16;
  const tilt = 0.32;
  let out = "";
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const theta0 = i * GOLDEN;
    const size = 1.3 + rand() * rand() * 3.9;
    const spark = rand() > 0.95;
    const xs = [];
    const ys = [];
    const os = [];
    for (let s = 0; s <= STEPS; s++) {
      const a = theta0 + (s / STEPS) * Math.PI * 2;
      const x = Math.cos(a) * ring;
      const z = Math.sin(a) * ring;
      // Tilt toward the viewer so the poles are not dead centre.
      const yt = y * Math.cos(tilt) - z * Math.sin(tilt);
      const zt = y * Math.sin(tilt) + z * Math.cos(tilt);
      const depth = (zt + 1) / 2;
      xs.push(Math.round(cx + x * radius));
      ys.push(Math.round(cy - yt * radius));
      os.push((0.16 + depth * depth * 0.84).toFixed(2));
    }
    const color = spark ? t.spark : mix(t.violet, t.mint, (1 - y) / 2);
    const anim = (attr, values) =>
      `<animate attributeName="${attr}" dur="${seconds}s" repeatCount="indefinite" values="${values.join(";")}"/>`;
    out += `<circle r="${size.toFixed(1)}" fill="${color}" cx="${xs[0]}" cy="${ys[0]}" opacity="${os[0]}">${anim("cx", xs)}${anim("cy", ys)}${anim("opacity", os)}</circle>`;
  }
  return out;
}

function banner(t) {
  const W = 1200;
  const H = 400;
  const id = `b-${t.name}`;
  const pill = "Disponível para novas oportunidades";
  const body = `${defs(t, id)}
  ${frame(t, id, W, H)}
  <radialGradient id="${id}-halo"><stop offset="0" stop-color="${t.mint}" stop-opacity="0.13"/><stop offset="0.6" stop-color="${t.violet}" stop-opacity="0.07"/><stop offset="1" stop-color="${t.violet}" stop-opacity="0"/></radialGradient>
  <circle cx="940" cy="200" r="250" fill="url(#${id}-halo)" clip-path="url(#${id}-clip)"/>
  <g clip-path="url(#${id}-clip)">${sphere(t, 940, 200, 166)}</g>

  <g transform="translate(72 62)">
    <rect width="322" height="36" rx="18" fill="${t.mint}" fill-opacity="0.09" stroke="${t.mint}" stroke-opacity="0.35"/>
    <circle cx="20" cy="18" r="4" fill="${t.mint}"><animate attributeName="opacity" dur="2.2s" repeatCount="indefinite" values="1;0.35;1"/></circle>
    <text x="34" y="23" font-family="${FONT.sans}" font-size="14" font-weight="600" fill="${t.mint}">${esc(pill)}</text>
  </g>

  <text x="68" y="206" font-family="${FONT.sans}" font-size="108" font-weight="700" letter-spacing="-5" fill="${t.fg}">Jhonatan</text>
  <text x="70" y="302" font-family="${FONT.serif}" font-size="108" font-style="italic" letter-spacing="-2" fill="url(#${id}-brand)">Gonçalves</text>

  <text x="72" y="352" font-family="${FONT.sans}" font-size="21" font-weight="600" fill="${t.fg}">Full Stack Developer<tspan fill="${t.dim}" font-weight="400">   ·   Systems &amp; Infra   ·   QA Automation   ·   Edge AI</tspan></text>`;
  return svg(W, H, "Jhonatan Gonçalves — Full Stack Developer · Systems & Infra · QA Automation · Edge AI", body);
}

/* ── Stack card ──────────────────────────────────────────────── */

function stackCard(t) {
  const W = 1200;
  const id = `s-${t.name}`;
  const colW = W / 2;
  const padX = 44;
  let body = "";
  let rules = "";
  let y = 50;
  for (let i = 0; i < STACK.length; i += 2) {
    let bottom = y;
    STACK.slice(i, i + 2).forEach(([label, items], col) => {
      const x = col * colW + padX;
      body += `<text x="${x}" y="${y}" font-family="${FONT.mono}" font-size="12" letter-spacing="2.2" fill="${t.mint}">${esc(String(i + col + 1).padStart(2, "0"))}</text>`;
      body += `<text x="${x + 34}" y="${y + 1}" font-family="${FONT.sans}" font-size="19" font-weight="600" fill="${t.fg}">${esc(label)}</text>`;
      const row = chips(t, items, { x, y: y + 18, maxWidth: colW - padX * 2 + 10, size: 13, height: 28 });
      body += row.markup;
      bottom = Math.max(bottom, row.bottom);
    });
    // Each row is as tall as its tallest cell; a hairline separates it from the next.
    if (i + 2 < STACK.length) rules += `<path d="M24 ${bottom + 22}H${W - 24}" stroke="${t.border}"/>`;
    y = bottom + 58;
  }
  const H = y - 58 + 30;
  rules += `<path d="M${colW} 24V${H - 24}" stroke="${t.border}"/>`;
  const label = "Stack: " + STACK.map(([l, items]) => `${l} — ${items.join(", ")}`).join("; ");
  return svg(W, H, label, `${defs(t, id)}${frame(t, id, W, H, { grid: false })}${rules}${body}`);
}

/* ── Project cards ───────────────────────────────────────────── */

function projectCard(t, p) {
  const W = 590;
  const H = 286;
  const id = `p-${p.id}-${t.name}`;
  const text = p.lines
    .map(
      (line, i) =>
        `<text x="34" y="${134 + i * 25}" font-family="${FONT.sans}" font-size="16" fill="${t.muted}">${esc(line)}</text>`,
    )
    .join("");
  const { markup } = chips(t, p.stack, { x: 34, y: 220, maxWidth: W - 68, size: 12.5, height: 27 });
  const body = `${defs(t, id)}
  ${frame(t, id, W, H, { grid: false })}
  <text x="34" y="50" font-family="${FONT.mono}" font-size="12" letter-spacing="2.4" fill="${t.mint}">${esc(p.kicker.toUpperCase())}</text>
  <text x="33" y="94" font-family="${FONT.sans}" font-size="30" font-weight="700" letter-spacing="-0.9" fill="${t.fg}">${esc(p.title)}</text>
  ${text}
  ${markup}
  <g transform="translate(${W - 66} 30)">
    <circle cx="16" cy="16" r="16" fill="${t.chipBg}" stroke="${t.chipBorder}"/>
    <path d="M11.5 20.5 20.5 11.5M13 11.5h7.5V19" fill="none" stroke="${t.fg}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
  return svg(W, H, `${p.title} — ${p.kicker}. ${p.lines.join(" ")} Stack: ${p.stack.join(", ")}.`, body);
}

/* ── Write ───────────────────────────────────────────────────── */

await mkdir(OUT, { recursive: true });
const files = [];
for (const t of Object.values(THEMES)) {
  files.push([`header-${t.name}.svg`, banner(t)]);
  files.push([`stack-${t.name}.svg`, stackCard(t)]);
  for (const p of PROJECTS) files.push([`project-${p.id}-${t.name}.svg`, projectCard(t, p)]);
}
for (const [name, content] of files) {
  await writeFile(new URL(name, OUT), content);
  console.log(`${name.padEnd(34)} ${(content.length / 1024).toFixed(1)} kB`);
}
