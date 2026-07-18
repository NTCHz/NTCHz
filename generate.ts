// Generates the dynamic profile SVGs (stats, activity, graph, status).
// hero.svg is hand-authored and never touched here.
// Run: GITHUB_TOKEN=... bun run generate.ts

import { theme, card, CARD_W } from "./theme.ts";

const LOGIN = process.env.GH_LOGIN ?? "NTCHz";
export const MSG_COLS = 30;
const ACTIVITY_LINES = 6;

// ---------- pure helpers ----------

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function truncate(s: string, width: number): string {
  return s.length > width ? s.slice(0, width - 1) + "…" : s;
}

export function relTime(date: Date, now: Date): string {
  const mins = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ---------- data fetching ----------

export async function gql(
  query: string,
  variables: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<any> {
  const res = await fetchImpl("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `bearer ${process.env.GH_PAT || process.env.GITHUB_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = (await res.json()) as { data?: unknown; errors?: unknown };
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

// Default contributionsCollection range = rolling past year, matching the
// graph on the GitHub profile page. restrictedContributionsCount (private)
// is only visible with a user PAT (GH_PAT), not the Actions GITHUB_TOKEN.
const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      restrictedContributionsCount
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
    repositories(first: 15, ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], privacy: PUBLIC,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        name
        languages(first: 5, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name } }
        }
        defaultBranchRef {
          target { ... on Commit { history(first: 3) {
            nodes { messageHeadline committedDate }
          } } }
        }
      }
    }
  }
}`;

type Commit = { repo: string; message: string; date: Date };
type Week = { contributionDays: { date: string; contributionCount: number }[] };
type Lang = { name: string; size: number };
type StatusCheck = { up: boolean; ms: number | null };

async function checkStatus(url: string): Promise<StatusCheck> {
  const start = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return { up: res.ok, ms: Math.round(performance.now() - start) };
  } catch {
    return { up: false, ms: null }; // unreachable is valid data, not a failure
  }
}

// ---------- renderers ----------

export function renderStats(data: { commits: number; prs: number; langs: Lang[] }): string {
  const total = data.langs.reduce((a, l) => a + l.size, 0) || 1;
  const langRows = data.langs
    .slice(0, 4)
    .map((l, i) => {
      const pct = Math.round((l.size / total) * 100);
      const y = 118 + i * 20;
      const barW = Math.max(2, Math.round((l.size / total) * 120));
      return `<rect x="24" y="${y - 9}" width="${barW}" height="10" rx="2" fill="${theme.accent}" opacity="${1 - i * 0.2}"/>
<text x="152" y="${y}" font-size="12" fill="${theme.text}">${escapeXml(l.name)}</text>
<text x="${CARD_W - 24}" y="${y}" font-size="12" fill="${theme.dim}" text-anchor="end">${pct}%</text>`;
    })
    .join("\n");
  const body = `<text x="24" y="52" font-size="12" fill="${theme.dim}">$ git stats --past-year</text>
<text x="24" y="76" font-size="13" fill="${theme.text}">commits <tspan fill="${theme.accent}" font-weight="bold">${data.commits}</tspan>   pull requests <tspan fill="${theme.accent}" font-weight="bold">${data.prs}</tspan></text>
<text x="24" y="98" font-size="12" fill="${theme.dim}">top languages</text>
${langRows}`;
  return card(`${LOGIN.toLowerCase()}@shipfold: stats`, body);
}

export function renderActivity(commits: Commit[], now: Date): string {
  const rows = commits
    .slice(0, ACTIVITY_LINES)
    .map((c, i) => {
      const y = 74 + i * 21;
      return `<text x="24" y="${y}" font-size="12"><tspan fill="${theme.accent}">${escapeXml(truncate(c.repo, 16))}</tspan> <tspan fill="${theme.text}">${escapeXml(truncate(c.message, MSG_COLS))}</tspan> <tspan fill="${theme.dim}">${relTime(c.date, now)}</tspan></text>`;
    })
    .join("\n");
  const body = `<text x="24" y="48" font-size="12" fill="${theme.dim}">$ git log --oneline --all</text>
${rows || `<text x="24" y="70" font-size="12" fill="${theme.dim}">no recent public commits</text>`}`;
  return card(`${LOGIN.toLowerCase()}@shipfold: activity`, body);
}

const HEAT = ["#1b1b1b", "#4a2210", "#8a3a12", "#cc4406", "#ff4d00"];

export function renderGraph(weeks: Week[], totalContributions: number): string {
  const cell = 6;
  const gap = 1;
  const x0 = 24;
  const y0 = 64;
  const max = Math.max(1, ...weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount)));
  const cells = weeks
    .map((w, wi) =>
      w.contributionDays
        .map((d, di) => {
          const level = d.contributionCount === 0 ? 0 : Math.min(4, 1 + Math.floor((d.contributionCount / max) * 3.99));
          return `<rect class="day" x="${x0 + wi * (cell + gap)}" y="${y0 + di * (cell + gap)}" width="${cell}" height="${cell}" rx="1" fill="${HEAT[level]}"/>`;
        })
        .join(""),
    )
    .join("\n");
  const body = `<text x="24" y="48" font-size="12" fill="${theme.dim}">$ contributions --past-year  <tspan fill="${theme.accent}">${totalContributions} total</tspan></text>
${cells}
<text x="24" y="${y0 + 7 * (cell + gap) + 18}" font-size="10" fill="${theme.dim}">less</text>
${HEAT.map((c, i) => `<rect x="${52 + i * 9}" y="${y0 + 7 * (cell + gap) + 10}" width="7" height="7" rx="1" fill="${c}"/>`).join("")}
<text x="${52 + 5 * 9 + 6}" y="${y0 + 7 * (cell + gap) + 18}" font-size="10" fill="${theme.dim}">more</text>`;
  return card(`${LOGIN.toLowerCase()}@shipfold: contributions`, body);
}

export function renderStatus(check: StatusCheck): string {
  const color = check.up ? theme.green : theme.red;
  const label = check.up ? "all systems operational" : "degraded";
  const ms = check.ms === null ? "—" : `${check.ms} ms`;
  const body = `<text x="24" y="52" font-size="12" fill="${theme.dim}">$ curl -w '%{time_total}' portfolio.shipfold.com</text>
<circle cx="30" cy="86" r="5" fill="${color}">
  <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
</circle>
<text x="44" y="91" font-size="14" fill="${theme.text}">${label}</text>
<text x="24" y="120" font-size="12" fill="${theme.dim}">response time  <tspan fill="${theme.text}">${ms}</tspan></text>
<text x="24" y="142" font-size="12" fill="${theme.dim}">host  <tspan fill="${theme.text}">proxmox · coolify · cloudflare tunnel</tspan></text>
<text x="24" y="170" font-size="11" fill="${theme.dim}">self-hosted · portfolio.shipfold.com</text>`;
  return card(`${LOGIN.toLowerCase()}@shipfold: status`, body);
}

// ---------- main ----------

async function main() {
  const [data, status] = await Promise.all([
    gql(QUERY, { login: LOGIN }),
    checkStatus("https://portfolio.shipfold.com"),
  ]);

  const cc = data.user.contributionsCollection;
  const repos = data.user.repositories.nodes;

  const langTotals = new Map<string, number>();
  for (const r of repos)
    for (const e of r.languages?.edges ?? [])
      langTotals.set(e.node.name, (langTotals.get(e.node.name) ?? 0) + e.size);
  const langs: Lang[] = [...langTotals.entries()]
    .map(([name, size]) => ({ name, size }))
    .sort((a, b) => b.size - a.size);

  const commits: Commit[] = repos
    .flatMap((r: any) =>
      (r.defaultBranchRef?.target?.history?.nodes ?? []).map((c: any) => ({
        repo: r.name,
        message: c.messageHeadline,
        date: new Date(c.committedDate),
      })),
    )
    .sort((a: Commit, b: Commit) => b.date.getTime() - a.date.getTime());

  // Render everything first; only write files if every render succeeded,
  // so a failure never leaves a broken/partial SVG behind.
  const out: Record<string, string> = {
    "assets/stats.svg": renderStats({
      commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
      prs: cc.totalPullRequestContributions,
      langs,
    }),
    "assets/activity.svg": renderActivity(commits, new Date()),
    "assets/graph.svg": renderGraph(cc.contributionCalendar.weeks, cc.contributionCalendar.totalContributions),
    "assets/status.svg": renderStatus(status),
  };
  for (const [path, svg] of Object.entries(out)) await Bun.write(path, svg);
  console.log(`wrote ${Object.keys(out).length} SVGs`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
