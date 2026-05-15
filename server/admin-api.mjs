import express from "express";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import crypto from "node:crypto";

const app = express();
const PORT = Number(process.env.ADMIN_API_PORT || 19191);
const SUPER_ADMIN_EMAIL = "diego.terrani@luckygaming.com.br";
const DATA_DIR = path.resolve(process.cwd(), "data");
const APPS_FILE = path.join(DATA_DIR, "apps.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const BRANDS_FILE = path.join(DATA_DIR, "brands.json");
const MAX_HISTORY = 60;

app.use(express.json({ limit: "8mb" }));

/** @typedef {{id:string,name:string,url:string,routeHost:string,description:string,thumbnailDataUrl:string,createdAt:string,updatedAt:string}} ManagedApp */
/** @typedef {{id:string,name:string,domain:string,ownerEmail:string,complianceEnabled:boolean,status:string,createdAt:string}} Brand */

const defaultApps = [
  {
    id: "pagol",
    name: "PAGOL — Backoffice",
    url: "https://back.zta.luckygaming.com.br",
    routeHost: "back.zta.luckygaming.com.br",
    description: "Console administrativo com políticas de identidade e registro de acesso.",
    thumbnailDataUrl: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4play-bko",
    name: "4PLAY.GAME — Backoffice",
    url: "https://bko.zta.luckygaming.com.br",
    routeHost: "bko.zta.luckygaming.com.br",
    description: "Operações de backoffice com inspeção de tráfego e MFA por perfil.",
    thumbnailDataUrl: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4play-game",
    name: "4PLAY.GAME",
    url: "https://play.zta.luckygaming.com.br",
    routeHost: "play.zta.luckygaming.com.br",
    description: "Ambiente de jogo autorizado com rotas validadas por política Zero Trust.",
    thumbnailDataUrl: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultSettings = {
  holdName: "Lucky Gaming",
  holdLogoDataUrl: "",
  updatedAt: new Date().toISOString(),
};

/** @type {Array<{timestamp:string,cpu:number,memory:number,disk:number}>} */
const metricsHistory = [];
let lastCpuSnapshot = takeCpuSnapshot();

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(APPS_FILE)) {
    fs.writeFileSync(APPS_FILE, JSON.stringify(defaultApps, null, 2));
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
  }
  if (!fs.existsSync(BRANDS_FILE)) {
    fs.writeFileSync(BRANDS_FILE, JSON.stringify([], null, 2));
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function getRequesterEmail(req) {
  const headerCandidates = [
    req.headers["x-pomerium-claim-email"],
    req.headers["x-pomerium-jwt-claim-email"],
    req.headers["x-email"],
  ];
  for (const candidate of headerCandidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.toLowerCase();
    if (Array.isArray(candidate) && candidate[0]) return String(candidate[0]).toLowerCase();
  }
  return "";
}

function requireSuperAdmin(req, res, next) {
  const email = getRequesterEmail(req);
  const bypass = process.env.ADMIN_API_ALLOW_NO_HEADER === "true";
  if (!bypass && email !== SUPER_ADMIN_EMAIL) {
    return res.status(403).json({
      error: "forbidden",
      message: "Acesso restrito ao Super-Admin.",
    });
  }
  res.locals.requesterEmail = email || SUPER_ADMIN_EMAIL;
  return next();
}

function takeCpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total };
}

function getDiskUsagePercent() {
  try {
    const output = execSync("df -k /", { encoding: "utf8" });
    const line = output.trim().split("\n")[1] || "";
    const fields = line.trim().split(/\s+/);
    const usePercent = fields[4] || "0%";
    return Number(usePercent.replace("%", "")) || 0;
  } catch {
    return 0;
  }
}

function collectMetricsPoint() {
  const next = takeCpuSnapshot();
  const idleDelta = next.idle - lastCpuSnapshot.idle;
  const totalDelta = next.total - lastCpuSnapshot.total;
  lastCpuSnapshot = next;
  const cpu = totalDelta > 0 ? (1 - idleDelta / totalDelta) * 100 : 0;
  const memory = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
  const disk = getDiskUsagePercent();
  const point = {
    timestamp: new Date().toISOString(),
    cpu: Number(cpu.toFixed(2)),
    memory: Number(memory.toFixed(2)),
    disk: Number(disk.toFixed(2)),
  };
  metricsHistory.push(point);
  if (metricsHistory.length > MAX_HISTORY) {
    metricsHistory.splice(0, metricsHistory.length - MAX_HISTORY);
  }
  return point;
}

function extractJsonFromLine(line) {
  const idx = line.indexOf("{");
  if (idx === -1) return null;
  try {
    return JSON.parse(line.slice(idx));
  } catch {
    return null;
  }
}

function parsePomeriumAuditLogs(limit = 120) {
  try {
    const raw = execSync("journalctl -u pomerium -n 1200 --no-pager -o cat", {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    const lines = raw.split("\n").filter(Boolean);
    /** @type {Array<{id:string,timestamp:string,actor:string,target:string,action:string,result:"ALLOW"|"DENY",ip:string}>} */
    const items = [];
    for (const line of lines) {
      const payload = extractJsonFromLine(line);
      if (!payload || payload.service !== "authorize" || payload.message !== "authorize check") continue;
      const timestamp = payload.time || new Date().toISOString();
      const allow = Boolean(payload.allow);
      const target = payload.host || "desconhecido";
      const pathValue = payload.path || "/";
      const actor = payload.email || "unknown@identity";
      const ip = payload.ip || "0.0.0.0";
      items.push({
        id: payload["request-id"] || crypto.randomUUID(),
        timestamp,
        actor,
        target,
        action: `${payload.method || "GET"} ${pathValue}`,
        result: allow ? "ALLOW" : "DENY",
        ip,
      });
    }
    items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return items.slice(0, limit);
  } catch {
    return [];
  }
}

function calculateAccessStats(apps, auditLogs) {
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  return apps.map((app) => {
    const host = app.routeHost || "";
    const related = auditLogs.filter((log) => log.target === host);
    const recent = related.filter((log) => Date.parse(log.timestamp) >= fifteenMinutesAgo);
    const uniqueUsers = new Set(recent.map((log) => `${log.actor}-${log.ip}`));
    return {
      appId: app.id,
      activeSessions: uniqueUsers.size,
      requestsPerMinute: Math.round(recent.length / 15),
      allowCount: related.filter((l) => l.result === "ALLOW").length,
      denyCount: related.filter((l) => l.result === "DENY").length,
      status: recent.filter((l) => l.result === "DENY").length > 20 ? "warning" : "healthy",
    };
  });
}

function buildAlerts(currentMetrics, auditLogs) {
  const now = new Date();
  /** @type {Array<{id:string,severity:"critical"|"high"|"medium",title:string,details:string,createdAt:string}>} */
  const alerts = [];
  const denyLast10m = auditLogs.filter((log) => {
    const diff = now.getTime() - Date.parse(log.timestamp);
    return diff <= 10 * 60 * 1000 && log.result === "DENY";
  }).length;

  if (denyLast10m > 25) {
    alerts.push({
      id: "deny-burst",
      severity: "critical",
      title: "Burst de acessos negados",
      details: `Foram detectados ${denyLast10m} bloqueios por política nos últimos 10 minutos.`,
      createdAt: "agora",
    });
  }
  if (currentMetrics.cpu > 80) {
    alerts.push({
      id: "cpu-high",
      severity: "high",
      title: "CPU acima do limite operacional",
      details: `Uso atual de CPU em ${currentMetrics.cpu.toFixed(1)}%.`,
      createdAt: "agora",
    });
  }
  if (currentMetrics.disk > 85) {
    alerts.push({
      id: "disk-high",
      severity: "medium",
      title: "Uso de disco elevado",
      details: `Disco de sistema em ${currentMetrics.disk.toFixed(1)}%.`,
      createdAt: "agora",
    });
  }
  return alerts;
}

ensureDataFiles();
collectMetricsPoint();
setInterval(() => {
  collectMetricsPoint();
}, 5000).unref();

app.get("/api/public/branding", (req, res) => {
  const settings = readJson(SETTINGS_FILE, defaultSettings);
  res.json({
    holdName: settings.holdName || "Lucky Gaming",
    holdLogoDataUrl: settings.holdLogoDataUrl || "",
    updatedAt: settings.updatedAt || new Date().toISOString(),
  });
});

app.use("/api/admin", requireSuperAdmin);

app.get("/api/admin/health", (req, res) => {
  res.json({ ok: true, requester: res.locals.requesterEmail });
});

app.get("/api/admin/metrics", (req, res) => {
  const current = collectMetricsPoint();
  res.json({
    current,
    history: metricsHistory.slice(-30),
  });
});

app.get("/api/admin/apps", (req, res) => {
  const apps = readJson(APPS_FILE, defaultApps);
  res.json(apps);
});

app.post("/api/admin/apps", (req, res) => {
  const apps = readJson(APPS_FILE, defaultApps);
  const payload = req.body || {};
  const now = new Date().toISOString();
  /** @type {ManagedApp} */
  const appData = {
    id: crypto.randomUUID(),
    name: String(payload.name || "").trim(),
    url: String(payload.url || "").trim(),
    routeHost: String(payload.routeHost || "").trim(),
    description: String(payload.description || "").trim(),
    thumbnailDataUrl: String(payload.thumbnailDataUrl || ""),
    createdAt: now,
    updatedAt: now,
  };
  if (!appData.name || !appData.url || !appData.routeHost) {
    return res.status(400).json({ error: "invalid_input", message: "name, url e routeHost são obrigatórios" });
  }
  apps.unshift(appData);
  writeJson(APPS_FILE, apps);
  return res.status(201).json(appData);
});

app.put("/api/admin/apps/:id", (req, res) => {
  const apps = readJson(APPS_FILE, defaultApps);
  const id = String(req.params.id);
  const idx = apps.findIndex((item) => item.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "not_found" });
  }
  const payload = req.body || {};
  const updated = {
    ...apps[idx],
    name: String(payload.name ?? apps[idx].name).trim(),
    url: String(payload.url ?? apps[idx].url).trim(),
    routeHost: String(payload.routeHost ?? apps[idx].routeHost).trim(),
    description: String(payload.description ?? apps[idx].description).trim(),
    thumbnailDataUrl: String(payload.thumbnailDataUrl ?? apps[idx].thumbnailDataUrl),
    updatedAt: new Date().toISOString(),
  };
  apps[idx] = updated;
  writeJson(APPS_FILE, apps);
  return res.json(updated);
});

app.get("/api/admin/access", (req, res) => {
  const apps = readJson(APPS_FILE, defaultApps);
  const logs = parsePomeriumAuditLogs(400);
  const stats = calculateAccessStats(apps, logs);
  res.json(stats);
});

app.get("/api/admin/audit", (req, res) => {
  const limit = Math.min(Number(req.query.limit || 120), 300);
  const logs = parsePomeriumAuditLogs(limit);
  res.json(logs);
});

app.get("/api/admin/alerts", (req, res) => {
  const current = collectMetricsPoint();
  const logs = parsePomeriumAuditLogs(300);
  const alerts = buildAlerts(current, logs);
  res.json(alerts);
});

app.get("/api/admin/brands", (req, res) => {
  const brands = readJson(BRANDS_FILE, []);
  res.json(brands);
});

app.post("/api/admin/brands", (req, res) => {
  const brands = readJson(BRANDS_FILE, []);
  const payload = req.body || {};
  const now = new Date().toISOString();
  /** @type {Brand} */
  const brand = {
    id: crypto.randomUUID(),
    name: String(payload.name || "").trim(),
    domain: String(payload.domain || "").trim(),
    ownerEmail: String(payload.ownerEmail || "").trim().toLowerCase(),
    complianceEnabled: Boolean(payload.complianceEnabled),
    status: "pending_validation",
    createdAt: now,
  };
  if (!brand.name || !brand.domain || !brand.ownerEmail) {
    return res.status(400).json({ error: "invalid_input", message: "name, domain e ownerEmail são obrigatórios" });
  }
  brands.unshift(brand);
  writeJson(BRANDS_FILE, brands);
  return res.status(201).json(brand);
});

app.put("/api/admin/settings/logo", (req, res) => {
  const settings = readJson(SETTINGS_FILE, defaultSettings);
  const payload = req.body || {};
  settings.holdName = String(payload.holdName || settings.holdName || "Lucky Gaming");
  settings.holdLogoDataUrl = String(payload.holdLogoDataUrl || "");
  settings.updatedAt = new Date().toISOString();
  writeJson(SETTINGS_FILE, settings);
  res.json(settings);
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`[admin-api] listening on http://127.0.0.1:${PORT}`);
});
