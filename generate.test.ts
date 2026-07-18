import { test, expect } from "bun:test";
import {
  escapeXml,
  truncate,
  MSG_COLS,
  relTime,
  gql,
  renderStats,
  renderActivity,
  renderGraph,
  renderStatus,
} from "./generate.ts";

// --- minimal XML well-formedness checker (stack-based) ---
function assertWellFormed(svg: string) {
  const stray = svg.replace(/&(amp|lt|gt|quot|apos|#\d+);/g, "");
  expect(stray).not.toMatch(/&/); // no unescaped ampersands
  const tokens = svg.matchAll(
    /<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|<\/([\w:-]+)>/g,
  );
  const stack: string[] = [];
  let last = 0;
  for (const m of tokens) {
    const between = svg.slice(last, m.index);
    expect(between).not.toMatch(/[<>]/); // no stray angle brackets in text
    last = m.index + m[0].length;
    if (m[4]) {
      expect(stack.pop()).toBe(m[4]); // closing tag matches
    } else if (!m[3]) {
      stack.push(m[1]);
    }
  }
  expect(stack).toEqual([]); // all tags closed
}

// --- spec: "Escape XML entities in commit messages" ---
test("escapeXml escapes all five XML entities", () => {
  expect(escapeXml(`<b>&"'`)).toBe("&lt;b&gt;&amp;&quot;&apos;");
});

test("hostile commit message renders well-formed", () => {
  const svg = renderActivity(
    [{ repo: "x", message: `fix <script>&"' inject`, date: new Date("2026-07-18T00:00:00Z") }],
    new Date("2026-07-18T01:00:00Z"),
  );
  assertWellFormed(svg);
  expect(svg).toContain("&lt;script&gt;");
});

// --- spec: "truncate with … at a fixed column width" (boundary N-1, N, N+1) ---
test("truncate at width-1: unchanged", () => {
  const s = "a".repeat(MSG_COLS - 1);
  expect(truncate(s, MSG_COLS)).toBe(s);
});
test("truncate at exactly width: unchanged", () => {
  const s = "a".repeat(MSG_COLS);
  expect(truncate(s, MSG_COLS)).toBe(s);
});
test("truncate at width+1: ends with … and fits width", () => {
  const out = truncate("a".repeat(MSG_COLS + 1), MSG_COLS);
  expect(out.endsWith("…")).toBe(true);
  expect(out.length).toBe(MSG_COLS);
});

// --- spec: "~6 lines" — fixed at 6 ---
test("activity renders at most 6 commits", () => {
  const now = new Date("2026-07-18T12:00:00Z");
  const commits = Array.from({ length: 8 }, (_, i) => ({
    repo: `repo${i}`,
    message: `commit ${i}`,
    date: new Date(now.getTime() - i * 3600_000),
  }));
  const svg = renderActivity(commits, now);
  expect(svg).toContain("repo5");
  expect(svg).not.toContain("repo6");
});

// --- spec: repo name + message + relative time ---
test("activity line has repo, message, relative time", () => {
  const now = new Date("2026-07-18T12:00:00Z");
  const svg = renderActivity(
    [{ repo: "portfolio", message: "feat: thing", date: new Date("2026-07-18T09:00:00Z") }],
    now,
  );
  expect(svg).toContain("portfolio");
  expect(svg).toContain("feat: thing");
  expect(svg).toContain("3h ago");
});

test("relTime units", () => {
  const now = new Date("2026-07-18T12:00:00Z");
  expect(relTime(new Date("2026-07-18T11:59:30Z"), now)).toBe("just now");
  expect(relTime(new Date("2026-07-18T11:15:00Z"), now)).toBe("45m ago");
  expect(relTime(new Date("2026-07-17T12:00:00Z"), now)).toBe("1d ago");
});

// --- spec: status "● all systems operational" / "● degraded" + response time; unreachable = valid data ---
test("status up renders operational with response time", () => {
  const svg = renderStatus({ up: true, ms: 142 });
  assertWellFormed(svg);
  expect(svg).toContain("all systems operational");
  expect(svg).toContain("142 ms");
});
test("status down renders degraded, no crash", () => {
  const svg = renderStatus({ up: false, ms: null });
  assertWellFormed(svg);
  expect(svg).toContain("degraded");
});

// --- spec: "GraphQL failure → script exits non-zero" — gql throws on errors / non-ok ---
test("gql throws on GraphQL errors field", async () => {
  const stub = async () =>
    new Response(JSON.stringify({ errors: [{ message: "bad" }] }), { status: 200 });
  await expect(gql("query{}", {}, stub as unknown as typeof fetch)).rejects.toThrow();
});
test("gql throws on non-200", async () => {
  const stub = async () => new Response("nope", { status: 502 });
  await expect(gql("query{}", {}, stub as unknown as typeof fetch)).rejects.toThrow();
});

// --- spec: stats card shows commits, PRs, top languages ---
test("stats renders commits, PRs, top languages", () => {
  const svg = renderStats({
    commits: 312,
    prs: 48,
    langs: [
      { name: "TypeScript", size: 620 },
      { name: "Python", size: 180 },
    ],
  });
  assertWellFormed(svg);
  expect(svg).toContain("312");
  expect(svg).toContain("48");
  expect(svg).toContain("TypeScript");
  expect(svg).toContain("Python");
});

// --- spec: heatmap in orange scale, well-formed ---
test("graph renders a cell per day, well-formed", () => {
  const weeks = Array.from({ length: 53 }, (_, w) => ({
    contributionDays: Array.from({ length: 7 }, (_, d) => ({
      date: `2026-01-01`,
      contributionCount: (w + d) % 5,
    })),
  }));
  const svg = renderGraph(weeks, 999);
  assertWellFormed(svg);
  expect((svg.match(/<rect class="day"/g) ?? []).length).toBe(53 * 7);
});

// --- spec: every SVG paints its own dark background ---
test("all cards paint dark background", () => {
  const now = new Date("2026-07-18T12:00:00Z");
  for (const svg of [
    renderStats({ commits: 1, prs: 1, langs: [] }),
    renderActivity([], now),
    renderGraph([], 0),
    renderStatus({ up: true, ms: 1 }),
  ]) {
    expect(svg).toContain('fill="#0c0c0c"');
  }
});
