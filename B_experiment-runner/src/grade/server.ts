import type { Server, Subprocess } from "bun";
import { SQL } from "bun";
import path from "node:path";

import { toUtcIso, isRecord } from "../utils.ts";
import { saveGrade, loadGrades } from "./store.ts";
import type { GradableRunsResult, GradeEntry, IssueTag } from "./types.ts";
import { ALL_ISSUE_TAGS } from "./types.ts";

export interface GradeServerParams {
  data: GradableRunsResult;
  port: number;
  databaseUrl?: string;
  dev?: boolean;
  verbose?: boolean;
}

const VITE_PORT = 5199;
const VITE_ORIGIN = `http://localhost:${VITE_PORT}`;

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      await res.arrayBuffer(); // drain body
      return;
    } catch {
      await Bun.sleep(200);
    }
  }
  throw new Error(`Vite dev server did not start on port ${port} within ${timeoutMs}ms`);
}

async function proxyToVite(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const target = `${VITE_ORIGIN}${url.pathname}${url.search}`;
  const proxyReq = new Request(target, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  return fetch(proxyReq);
}

function serveStaticFile(distDir: string, pathname: string): Response | null {
  // Map "/" to "/index.html"
  const filePath = pathname === "/" ? path.join(distDir, "index.html") : path.join(distDir, pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(distDir)) {
    return new Response("Forbidden", { status: 403 });
  }

  const file = Bun.file(filePath);
  // Bun.file doesn't throw for missing files — we check size/type in the caller
  return new Response(file);
}

export async function startGradeServer(params: GradeServerParams): Promise<Server> {
  const { data, port, databaseUrl, dev, verbose } = params;
  const validIssueTags = new Set<string>(ALL_ISSUE_TAGS);

  let viteProc: Subprocess | null = null;
  let distDir = "";

  if (dev) {
    // Start Vite dev server
    const configPath = path.resolve(import.meta.dir, "../../vite.config.ts");
    viteProc = Bun.spawn(["bunx", "vite", "--config", configPath], {
      stdout: verbose ? "inherit" : "ignore",
      stderr: "inherit",
    });

    if (verbose) console.log("Waiting for Vite dev server...");
    await waitForPort(VITE_PORT, 15_000);
    if (verbose) console.log(`Vite dev server ready on port ${VITE_PORT}`);
  } else {
    // Prod: resolve dist directory
    distDir = path.resolve(import.meta.dir, "../../dist/grade-ui");
    const indexFile = Bun.file(path.join(distDir, "index.html"));
    if (!(await indexFile.exists())) {
      throw new Error(
        `Production build not found at ${distDir}. Run 'bunx vite build' first, or use --dev for development mode.`,
      );
    }
  }

  const server = Bun.serve({
    port,
    fetch: async (req) => {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // --- API routes ---

      // API: experiment info
      if (pathname === "/api/info" && req.method === "GET") {
        return Response.json({
          experimentName: data.experimentName,
          hasDatabaseUrl: !!databaseUrl,
          hasGoldenSql: data.goldenSqlByCaseId.size > 0,
        });
      }

      // API: list runs
      if (pathname === "/api/runs" && req.method === "GET") {
        return Response.json(data.runs);
      }

      // API: current grades
      if (pathname === "/api/grades" && req.method === "GET") {
        const grades = await loadGrades(data.invocationPathAbs);
        return Response.json(grades ?? { entries: [] });
      }

      // API: serve image
      const imageMatch = pathname.match(/^\/api\/image\/([^/]+)\/(\d+)$/);
      if (imageMatch && req.method === "GET") {
        const caseId = decodeURIComponent(imageMatch[1]!);
        const repeatIndex = parseInt(imageMatch[2]!, 10);
        const run = data.runs.find((r) => r.caseId === caseId && r.repeatIndex === repeatIndex);

        if (!run?.imagePath) {
          return new Response("Not found", { status: 404 });
        }

        const file = Bun.file(run.imagePath);
        if (!(await file.exists())) {
          return new Response("Image file not found", { status: 404 });
        }

        return new Response(file, { headers: { "Content-Type": "image/png" } });
      }

      // API: serve SQL
      const sqlMatch = pathname.match(/^\/api\/sql\/([^/]+)\/(\d+)$/);
      if (sqlMatch && req.method === "GET") {
        const caseId = decodeURIComponent(sqlMatch[1]!);
        const repeatIndex = parseInt(sqlMatch[2]!, 10);
        const run = data.runs.find((r) => r.caseId === caseId && r.repeatIndex === repeatIndex);

        if (!run?.sqlPath) {
          return new Response("Not found", { status: 404 });
        }

        const file = Bun.file(run.sqlPath);
        if (!(await file.exists())) {
          return new Response("SQL file not found", { status: 404 });
        }

        return new Response(file, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }

      // API: precomputed data from run.json
      const dataMatch = pathname.match(/^\/api\/data\/([^/]+)\/(\d+)$/);
      if (dataMatch && req.method === "GET") {
        const caseId = decodeURIComponent(dataMatch[1]!);
        const repeatIndex = parseInt(dataMatch[2]!, 10);
        const run = data.runs.find((r) => r.caseId === caseId && r.repeatIndex === repeatIndex);

        if (!run?.runJsonPath) {
          return Response.json({ error: "No run.json available" }, { status: 404 });
        }

        try {
          const file = Bun.file(run.runJsonPath);
          if (!(await file.exists())) {
            return Response.json({ error: "run.json not found" }, { status: 404 });
          }

          const runJson = await file.json();
          const result = isRecord(runJson) ? (runJson as Record<string, unknown>).result : null;
          if (!isRecord(result)) {
            return Response.json({ error: "No result data in run.json" }, { status: 404 });
          }

          const resultObj = result as Record<string, unknown>;
          const metadata = isRecord(resultObj.metadata) ? resultObj.metadata as Record<string, unknown> : null;
          const rawData = Array.isArray(resultObj.data) ? resultObj.data as Record<string, unknown>[] : [];

          const columns = Array.isArray(metadata?.columns) ? metadata.columns as string[] : (rawData.length > 0 ? Object.keys(rawData[0]!) : []);
          const maxRows = 200;
          const truncated = rawData.length > maxRows;
          const rows = truncated ? rawData.slice(0, maxRows) : rawData;

          return Response.json({ columns, rows, rowCount: rawData.length, truncated });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Failed to read run.json" },
            { status: 500 },
          );
        }
      }

      // API: live SQL execution
      const sqlExecMatch = pathname.match(/^\/api\/sql-execute\/([^/]+)\/(\d+)$/);
      if (sqlExecMatch && req.method === "POST") {
        if (!databaseUrl) {
          return Response.json({ error: "No database configured" }, { status: 400 });
        }

        const caseId = decodeURIComponent(sqlExecMatch[1]!);
        const repeatIndex = parseInt(sqlExecMatch[2]!, 10);
        const run = data.runs.find((r) => r.caseId === caseId && r.repeatIndex === repeatIndex);

        if (!run?.sqlPath) {
          return Response.json({ error: "No SQL file available" }, { status: 404 });
        }

        const sqlFile = Bun.file(run.sqlPath);
        if (!(await sqlFile.exists())) {
          return Response.json({ error: "SQL file not found" }, { status: 404 });
        }

        const sql = await sqlFile.text();
        const wrappedSql = `SELECT * FROM (${sql}) AS _q LIMIT 201`;
        const db = new SQL(databaseUrl);

        try {
          const rawRows = await db.unsafe(wrappedSql);
          const rows = Array.from(rawRows) as Record<string, unknown>[];
          const truncated = rows.length > 200;
          if (truncated) rows.pop();

          const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];

          return Response.json({ columns, rows, rowCount: rows.length, truncated });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "SQL execution failed" },
            { status: 500 },
          );
        } finally {
          await db.close();
        }
      }

      // API: save grade
      if (pathname === "/api/grade" && req.method === "POST") {
        try {
          const body = (await req.json()) as {
            caseId: string;
            repeatIndex: number;
            score: number;
            note?: string;
            issues?: string[];
          };

          if (!body.caseId || typeof body.repeatIndex !== "number" || !body.score) {
            return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });
          }

          if (body.score < 1 || body.score > 5 || !Number.isInteger(body.score)) {
            return Response.json({ ok: false, error: "Score must be 1-5" }, { status: 400 });
          }

          // Validate issues
          const issues: IssueTag[] = [];
          if (Array.isArray(body.issues)) {
            for (const tag of body.issues) {
              if (typeof tag !== "string" || !validIssueTags.has(tag)) {
                return Response.json(
                  { ok: false, error: `Invalid issue tag: ${tag}` },
                  { status: 400 },
                );
              }
              issues.push(tag as IssueTag);
            }
          }

          const entry: GradeEntry = {
            caseId: body.caseId,
            repeatIndex: body.repeatIndex,
            score: body.score as 1 | 2 | 3 | 4 | 5,
            note: body.note ?? "",
            issues,
            gradedAtUtc: toUtcIso(),
            grader: "default",
          };

          const grades = await saveGrade(
            data.invocationPathAbs,
            data.experimentName,
            data.invocationDir,
            entry,
          );

          // Update in-memory run data
          const run = data.runs.find(
            (r) => r.caseId === body.caseId && r.repeatIndex === body.repeatIndex,
          );
          if (run) {
            run.existingGrade = entry;
          }

          if (verbose) {
            console.log(`Graded ${body.caseId}/run-${body.repeatIndex}: ${body.score}/5` +
              (issues.length > 0 ? ` [${issues.join(", ")}]` : ""));
          }

          return Response.json({ ok: true, totalGraded: grades.entries.length });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 },
          );
        }
      }

      // --- UI serving ---

      if (dev) {
        // Proxy all non-API requests to Vite dev server
        return proxyToVite(req);
      }

      // Prod: serve static files with SPA fallback
      const staticRes = serveStaticFile(distDir, pathname);
      if (staticRes) {
        // Check if the file actually exists by trying to get its size
        const file = Bun.file(path.join(distDir, pathname === "/" ? "index.html" : pathname));
        if (await file.exists()) {
          return staticRes;
        }
      }

      // SPA fallback: serve index.html for non-API, non-file routes
      return new Response(Bun.file(path.join(distDir, "index.html")), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });

  // Cleanup Vite subprocess on server stop and process signals
  if (viteProc) {
    const cleanup = () => {
      if (viteProc && !viteProc.killed) {
        viteProc.kill();
      }
    };

    const originalStop = server.stop.bind(server);
    server.stop = (closeActiveConnections?: boolean) => {
      cleanup();
      return originalStop(closeActiveConnections);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  return server;
}
