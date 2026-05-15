import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  AppWindow,
  BarChart3,
  Bell,
  Building2,
  Cpu,
  Edit3,
  HardDrive,
  ImagePlus,
  MemoryStick,
  Plus,
  ShieldCheck,
  Upload,
  UserCog,
  X,
} from "lucide-react";

interface CapacityPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
}

interface ManagedApp {
  id: string;
  name: string;
  url: string;
  routeHost: string;
  description: string;
  thumbnailDataUrl: string;
}

interface AccessStats {
  appId: string;
  activeSessions: number;
  requestsPerMinute: number;
  allowCount: number;
  denyCount: number;
  status: "healthy" | "warning";
}

interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  target: string;
  action: string;
  result: "ALLOW" | "DENY";
  ip: string;
}

interface AlertItem {
  id: string;
  severity: "critical" | "high" | "medium";
  title: string;
  details: string;
  createdAt: string;
}

interface Branding {
  holdName: string;
  holdLogoDataUrl: string;
}

const SUPER_ADMIN_EMAIL = "diego.terrani@luckygaming.com.br";

const emptyAppForm = {
  name: "",
  url: "",
  routeHost: "",
  description: "",
  thumbnailDataUrl: "",
  thumbnailName: "",
};

function extractEmail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const direct = data.email;
  if (typeof direct === "string") return direct.toLowerCase();
  for (const key of ["user", "claims", "session"]) {
    const nested = data[key];
    if (nested && typeof nested === "object") {
      const nestedEmail = extractEmail(nested);
      if (nestedEmail) return nestedEmail;
    }
  }
  return null;
}

async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

async function apiWrite<T>(url: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

function MetricSparkline({
  data,
  keyName,
  stroke,
}: {
  data: CapacityPoint[];
  keyName: "cpu" | "memory" | "disk";
  stroke: string;
}) {
  const points = useMemo(() => {
    if (!data.length) return "";
    const width = 320;
    const height = 84;
    const max = 100;
    return data
      .map((p, idx) => {
        const x = (idx / (data.length - 1 || 1)) * width;
        const y = height - (p[keyName] / max) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data, keyName]);

  return (
    <svg viewBox="0 0 320 84" className="h-24 w-full rounded-md bg-surface-panel/70">
      <polyline fill="none" stroke={stroke} strokeWidth="2.5" points={points} />
    </svg>
  );
}

function Modal({
  title,
  subtitle,
  open,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-xl rounded-xl border border-border-default bg-surface-card shadow-iron-elevated">
        <div className="flex items-start justify-between border-b border-border-muted p-5">
          <div>
            <h2 className="text-[16px] font-semibold text-text-primary">{title}</h2>
            <p className="mt-1 text-[12px] text-text-secondary">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border-default bg-surface-panel text-text-secondary hover:bg-surface-input"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "alerts">("overview");

  const [metrics, setMetrics] = useState<{ current: CapacityPoint; history: CapacityPoint[] }>({
    current: { timestamp: new Date().toISOString(), cpu: 0, memory: 0, disk: 0 },
    history: [],
  });
  const [apps, setApps] = useState<ManagedApp[]>([]);
  const [accessStats, setAccessStats] = useState<AccessStats[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [branding, setBranding] = useState<Branding>({ holdName: "Lucky Gaming", holdLogoDataUrl: "" });

  const [brandForm, setBrandForm] = useState({
    name: "",
    domain: "",
    ownerEmail: "",
    complianceEnabled: true,
  });

  const [appModalOpen, setAppModalOpen] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [appForm, setAppForm] = useState(emptyAppForm);

  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [logoName, setLogoName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const response = await fetch("/.pomerium/user", { credentials: "include" });
        if (!response.ok) {
          if (mounted) setUserEmail(null);
          return;
        }
        const data: unknown = await response.json();
        if (mounted) setUserEmail(extractEmail(data));
      } catch {
        if (mounted) setUserEmail(null);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }
    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const isAuthorized = userEmail === SUPER_ADMIN_EMAIL;

  async function loadApps() {
    const [appsData, accessData] = await Promise.all([
      apiGet<ManagedApp[]>("/api/admin/apps"),
      apiGet<AccessStats[]>("/api/admin/access"),
    ]);
    setApps(appsData);
    setAccessStats(accessData);
  }

  async function loadDashboardData() {
    const [metricsData, auditData, alertsData, brandingData] = await Promise.all([
      apiGet<{ current: CapacityPoint; history: CapacityPoint[] }>("/api/admin/metrics"),
      apiGet<AuditLogItem[]>("/api/admin/audit?limit=120"),
      apiGet<AlertItem[]>("/api/admin/alerts"),
      apiGet<Branding>("/api/public/branding"),
    ]);
    setMetrics(metricsData);
    setAuditLogs(auditData);
    setAlerts(alertsData);
    setBranding(brandingData);
    setLogoDataUrl(brandingData.holdLogoDataUrl || "");
  }

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    async function bootstrap() {
      try {
        await Promise.all([loadApps(), loadDashboardData()]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Falha ao carregar painel.");
      }
    }
    bootstrap();
    const timer = setInterval(() => {
      loadDashboardData().catch(() => undefined);
      loadApps().catch(() => undefined);
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isAuthorized]);

  const totalSessions = accessStats.reduce((sum, item) => sum + item.activeSessions, 0);
  const statByAppId = useMemo(() => new Map(accessStats.map((s) => [s.appId, s])), [accessStats]);

  function openCreateAppModal() {
    setEditingAppId(null);
    setAppForm(emptyAppForm);
    setAppModalOpen(true);
  }

  function openEditAppModal(app: ManagedApp) {
    setEditingAppId(app.id);
    setAppForm({
      name: app.name,
      url: app.url,
      routeHost: app.routeHost,
      description: app.description,
      thumbnailDataUrl: app.thumbnailDataUrl || "",
      thumbnailName: app.thumbnailDataUrl ? "imagem-atual" : "",
    });
    setAppModalOpen(true);
  }

  async function handleAppThumbnail(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    setAppForm((prev) => ({ ...prev, thumbnailDataUrl: dataUrl, thumbnailName: file.name }));
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    setLogoDataUrl(dataUrl);
    setLogoName(file.name);
  }

  async function submitAppForm() {
    try {
      if (editingAppId) {
        await apiWrite(`/api/admin/apps/${editingAppId}`, "PUT", appForm);
      } else {
        await apiWrite("/api/admin/apps", "POST", appForm);
      }
      await loadApps();
      setAppModalOpen(false);
      setAppForm(emptyAppForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar aplicação.");
    }
  }

  async function submitBrandFlow() {
    try {
      await apiWrite("/api/admin/brands", "POST", brandForm);
      setBrandForm({ name: "", domain: "", ownerEmail: "", complianceEnabled: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar marca.");
    }
  }

  async function saveLogo() {
    try {
      await apiWrite("/api/admin/settings/logo", "PUT", {
        holdName: branding.holdName,
        holdLogoDataUrl: logoDataUrl,
      });
      setBranding((prev) => ({ ...prev, holdLogoDataUrl: logoDataUrl }));
      setLogoModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar logo.");
    }
  }

  return (
    <div className="min-h-dvh bg-surface-app text-text-secondary">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid-intel opacity-30" aria-hidden />
      <header className="sticky top-0 z-50 border-b border-border-muted bg-surface-header/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Super-Admin Area</p>
            <h1 className="text-[18px] font-semibold text-text-primary">Painel de Gestão Zero Trust</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogoModalOpen(true)}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border-default bg-surface-panel px-3 text-[12px] font-medium text-text-primary hover:bg-surface-input"
            >
              <ImagePlus size={14} />
              Alterar logo da Hold
            </button>
            <span className="rounded-md border border-border-default bg-surface-panel px-3 py-2 text-[12px] text-text-secondary">
              {userEmail ?? "carregando identidade..."}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        {loadingUser ? (
          <div className="rounded-xl border border-border-default bg-surface-card p-10 text-center">
            <p className="text-[13px] text-text-secondary">Validando identidade no Pomerium...</p>
          </div>
        ) : !isAuthorized ? (
          <div className="rounded-xl border border-risk-critical/40 bg-surface-card p-10 text-center">
            <ShieldCheck className="mx-auto mb-3 text-risk-critical" size={28} />
            <h2 className="text-[18px] font-semibold text-text-primary">Acesso negado</h2>
            <p className="mx-auto mt-2 max-w-xl text-[13px] text-text-secondary">
              Esta rota administrativa é restrita ao Super-Admin {SUPER_ADMIN_EMAIL}.
            </p>
          </div>
        ) : (
          <>
            {error ? (
              <div className="mb-4 rounded-lg border border-risk-critical/30 bg-risk-critical/10 px-4 py-2 text-[12px] text-risk-critical">
                {error}
              </div>
            ) : null}

            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="inline-flex rounded-md border border-border-default bg-surface-card p-1">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`h-9 cursor-pointer rounded px-3 text-[12px] font-medium ${
                    activeTab === "overview"
                      ? "bg-tech-cyan/20 text-text-primary"
                      : "text-text-secondary hover:bg-surface-panel"
                  }`}
                >
                  Visão Geral
                </button>
                <button
                  onClick={() => setActiveTab("alerts")}
                  className={`h-9 cursor-pointer rounded px-3 text-[12px] font-medium ${
                    activeTab === "alerts"
                      ? "bg-tech-cyan/20 text-text-primary"
                      : "text-text-secondary hover:bg-surface-panel"
                  }`}
                >
                  Página de Alertas
                </button>
              </div>

              <button
                onClick={openCreateAppModal}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-tech-cyan/50 bg-tech-cyan/15 px-3 text-[12px] font-semibold text-text-primary hover:bg-tech-cyan/25"
              >
                <Plus size={14} />
                Nova aplicação de destino
              </button>
            </div>

            {activeTab === "overview" ? (
              <section className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <article className="rounded-xl border border-border-default bg-surface-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[12px] font-medium text-text-muted">CPU</span>
                      <Cpu size={16} className="text-tech-cyan" />
                    </div>
                    <p className="text-[28px] font-semibold text-text-primary">{Math.round(metrics.current.cpu)}%</p>
                    <MetricSparkline data={metrics.history} keyName="cpu" stroke="#35d5ff" />
                  </article>

                  <article className="rounded-xl border border-border-default bg-surface-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[12px] font-medium text-text-muted">Memória</span>
                      <MemoryStick size={16} className="text-brand-green" />
                    </div>
                    <p className="text-[28px] font-semibold text-text-primary">{Math.round(metrics.current.memory)}%</p>
                    <MetricSparkline data={metrics.history} keyName="memory" stroke="#2ceaa2" />
                  </article>

                  <article className="rounded-xl border border-border-default bg-surface-card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[12px] font-medium text-text-muted">Disco</span>
                      <HardDrive size={16} className="text-risk-medium" />
                    </div>
                    <p className="text-[28px] font-semibold text-text-primary">{Math.round(metrics.current.disk)}%</p>
                    <MetricSparkline data={metrics.history} keyName="disk" stroke="#f9ca54" />
                  </article>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <section className="rounded-xl border border-border-default bg-surface-card p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Building2 size={16} className="text-tech-cyan" />
                      <h2 className="text-[14px] font-semibold text-text-primary">Fluxo de criação de nova marca</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="text-[12px] text-text-secondary">
                        Nome da marca
                        <input
                          value={brandForm.name}
                          onChange={(e) => setBrandForm((p) => ({ ...p, name: e.target.value }))}
                          className="mt-1 h-10 w-full rounded-md border border-border-default bg-surface-input px-3 text-text-primary outline-none focus:border-tech-cyan"
                        />
                      </label>
                      <label className="text-[12px] text-text-secondary">
                        Domínio principal
                        <input
                          value={brandForm.domain}
                          onChange={(e) => setBrandForm((p) => ({ ...p, domain: e.target.value }))}
                          className="mt-1 h-10 w-full rounded-md border border-border-default bg-surface-input px-3 text-text-primary outline-none focus:border-tech-cyan"
                        />
                      </label>
                      <label className="text-[12px] text-text-secondary md:col-span-2">
                        Owner responsável
                        <input
                          value={brandForm.ownerEmail}
                          onChange={(e) => setBrandForm((p) => ({ ...p, ownerEmail: e.target.value }))}
                          className="mt-1 h-10 w-full rounded-md border border-border-default bg-surface-input px-3 text-text-primary outline-none focus:border-tech-cyan"
                        />
                      </label>
                    </div>
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-text-secondary">
                      <input
                        type="checkbox"
                        checked={brandForm.complianceEnabled}
                        onChange={(e) => setBrandForm((p) => ({ ...p, complianceEnabled: e.target.checked }))}
                      />
                      Habilitar validação obrigatória de compliance
                    </label>
                    <button
                      onClick={submitBrandFlow}
                      className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border-default bg-surface-panel px-4 text-[12px] font-medium text-text-primary hover:bg-surface-input"
                    >
                      <UserCog size={14} />
                      Iniciar fluxo de criação
                    </button>
                  </section>

                  <section className="rounded-xl border border-border-default bg-surface-card p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <BarChart3 size={16} className="text-tech-cyan" />
                      <h2 className="text-[14px] font-semibold text-text-primary">Gestão de acessos por aplicação</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[740px] text-left">
                        <thead>
                          <tr className="border-b border-border-muted text-[11px] uppercase tracking-wide text-text-muted">
                            <th className="py-2 pr-3">Aplicação</th>
                            <th className="py-2 pr-3">Sessões</th>
                            <th className="py-2 pr-3">Req/min</th>
                            <th className="py-2 pr-3">Allow/Deny</th>
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apps.map((app) => {
                            const stats = statByAppId.get(app.id);
                            return (
                              <tr key={app.id} className="border-b border-border-muted/60 text-[12px]">
                                <td className="py-3 pr-3 text-text-primary">
                                  <div className="flex items-center gap-2">
                                    {app.thumbnailDataUrl ? (
                                      <img src={app.thumbnailDataUrl} className="h-8 w-8 rounded object-cover" alt={app.name} />
                                    ) : (
                                      <span className="h-8 w-8 rounded bg-surface-panel" />
                                    )}
                                    <div>
                                      <div className="font-medium">{app.name}</div>
                                      <div className="text-text-muted">{app.routeHost}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 pr-3 tabular-nums">{stats?.activeSessions ?? 0}</td>
                                <td className="py-3 pr-3 tabular-nums">{stats?.requestsPerMinute ?? 0}</td>
                                <td className="py-3 pr-3 tabular-nums">
                                  {(stats?.allowCount ?? 0)}/{stats?.denyCount ?? 0}
                                </td>
                                <td className="py-3 pr-3">
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                                    stats?.status === "warning"
                                      ? "bg-risk-medium/20 text-risk-medium"
                                      : "bg-brand-green/15 text-brand-green"
                                  }`}>
                                    {stats?.status ?? "healthy"}
                                  </span>
                                </td>
                                <td className="py-3">
                                  <button
                                    onClick={() => openEditAppModal(app)}
                                    className="inline-flex h-8 cursor-pointer items-center gap-1 rounded border border-border-default bg-surface-panel px-2.5 text-text-secondary hover:bg-surface-input"
                                  >
                                    <Edit3 size={13} />
                                    Editar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-[11px] text-text-muted">
                      Sessões totais: <span className="font-semibold text-text-primary tabular-nums">{totalSessions}</span>
                    </p>
                  </section>
                </div>

                <section className="rounded-xl border border-border-default bg-surface-card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <AppWindow size={16} className="text-tech-cyan" />
                    <h2 className="text-[14px] font-semibold text-text-primary">Log de auditoria transacional (real time)</h2>
                  </div>
                  <div className="max-h-[340px] overflow-auto rounded-md border border-border-muted bg-surface-panel">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="grid grid-cols-1 gap-2 border-b border-border-muted/70 px-3 py-2 text-[12px] md:grid-cols-5">
                        <div className="text-text-muted">{new Date(log.timestamp).toLocaleTimeString("pt-BR")}</div>
                        <div className="text-text-secondary">{log.actor}</div>
                        <div className="text-text-primary">{log.target}</div>
                        <div className="text-text-secondary">{log.action}</div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            log.result === "ALLOW" ? "bg-brand-green/15 text-brand-green" : "bg-risk-critical/15 text-risk-critical"
                          }`}>
                            {log.result}
                          </span>
                          <span className="text-[11px] text-text-muted">{log.ip}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </section>
            ) : (
              <section className="space-y-4">
                <h2 className="text-[15px] font-semibold text-text-primary">Página de alertas</h2>
                {alerts.map((alert) => (
                  <article key={alert.id} className="rounded-xl border border-border-default bg-surface-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={15} className="text-tech-cyan" />
                        <h3 className="text-[14px] font-semibold text-text-primary">{alert.title}</h3>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                        alert.severity === "critical"
                          ? "bg-risk-critical/15 text-risk-critical"
                          : alert.severity === "high"
                            ? "bg-risk-high/15 text-risk-high"
                            : "bg-risk-medium/15 text-risk-medium"
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-[12px] text-text-secondary">{alert.details}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted">
                      <span>{alert.createdAt}</span>
                      <button className="inline-flex h-8 cursor-pointer items-center gap-1 rounded border border-border-default bg-surface-panel px-2.5 text-text-secondary hover:bg-surface-input">
                        <AlertTriangle size={13} />
                        Reconhecer alerta
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </main>

      <Modal
        title={editingAppId ? "Editar aplicação de destino" : "Cadastro de nova aplicação de destino"}
        subtitle="Gerencie nome, URL, host de rota, descrição e thumbnail."
        open={appModalOpen}
        onClose={() => setAppModalOpen(false)}
      >
        <div className="grid grid-cols-1 gap-3">
          <label className="text-[12px] text-text-secondary">
            Nome da aplicação
            <input
              value={appForm.name}
              onChange={(e) => setAppForm((p) => ({ ...p, name: e.target.value }))}
              className="mt-1 h-10 w-full rounded-md border border-border-default bg-surface-input px-3 text-text-primary outline-none focus:border-tech-cyan"
            />
          </label>
          <label className="text-[12px] text-text-secondary">
            URL da aplicação
            <input
              value={appForm.url}
              onChange={(e) => setAppForm((p) => ({ ...p, url: e.target.value }))}
              className="mt-1 h-10 w-full rounded-md border border-border-default bg-surface-input px-3 text-text-primary outline-none focus:border-tech-cyan"
            />
          </label>
          <label className="text-[12px] text-text-secondary">
            Host público ZTA (routeHost)
            <input
              value={appForm.routeHost}
              onChange={(e) => setAppForm((p) => ({ ...p, routeHost: e.target.value }))}
              className="mt-1 h-10 w-full rounded-md border border-border-default bg-surface-input px-3 text-text-primary outline-none focus:border-tech-cyan"
            />
          </label>
          <label className="text-[12px] text-text-secondary">
            Descrição
            <textarea
              value={appForm.description}
              onChange={(e) => setAppForm((p) => ({ ...p, description: e.target.value }))}
              className="mt-1 min-h-20 w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-text-primary outline-none focus:border-tech-cyan"
            />
          </label>
          <label className="text-[12px] text-text-secondary">
            Thumbnail da aplicação
            <div className="mt-1 flex items-center gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border-default bg-surface-panel px-3 text-[12px] hover:bg-surface-input">
                <Upload size={14} />
                Enviar imagem
                <input type="file" className="hidden" accept="image/*" onChange={handleAppThumbnail} />
              </label>
              <span className="text-[11px] text-text-muted">{appForm.thumbnailName || "Nenhum arquivo selecionado"}</span>
            </div>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-10 cursor-pointer rounded-md border border-border-default bg-surface-panel px-3 text-[12px] text-text-secondary hover:bg-surface-input"
            onClick={() => setAppModalOpen(false)}
          >
            Cancelar
          </button>
          <button
            className="h-10 cursor-pointer rounded-md border border-tech-cyan/50 bg-tech-cyan/15 px-3 text-[12px] font-semibold text-text-primary hover:bg-tech-cyan/25"
            onClick={submitAppForm}
          >
            {editingAppId ? "Salvar edição" : "Salvar aplicação"}
          </button>
        </div>
      </Modal>

      <Modal
        title="Alteração do logo da Hold"
        subtitle="Atualize o logotipo exibido no header principal."
        open={logoModalOpen}
        onClose={() => setLogoModalOpen(false)}
      >
        <label className="text-[12px] text-text-secondary">
          Nome da Hold
          <input
            value={branding.holdName}
            onChange={(e) => setBranding((p) => ({ ...p, holdName: e.target.value }))}
            className="mt-1 h-10 w-full rounded-md border border-border-default bg-surface-input px-3 text-text-primary outline-none focus:border-tech-cyan"
          />
        </label>
        <label className="mt-3 block text-[12px] text-text-secondary">
          Arquivo de logo
          <div className="mt-1 flex items-center gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border-default bg-surface-panel px-3 text-[12px] hover:bg-surface-input">
              <Upload size={14} />
              Enviar logo
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </label>
            <span className="text-[11px] text-text-muted">{logoName || "Sem arquivo"}</span>
          </div>
        </label>
        {logoDataUrl ? <img src={logoDataUrl} alt="Prévia do logo" className="mt-3 h-14 rounded bg-surface-panel p-1" /> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-10 cursor-pointer rounded-md border border-border-default bg-surface-panel px-3 text-[12px] text-text-secondary hover:bg-surface-input"
            onClick={() => setLogoModalOpen(false)}
          >
            Cancelar
          </button>
          <button
            className="h-10 cursor-pointer rounded-md border border-tech-cyan/50 bg-tech-cyan/15 px-3 text-[12px] font-semibold text-text-primary hover:bg-tech-cyan/25"
            onClick={saveLogo}
          >
            Aplicar logo
          </button>
        </div>
      </Modal>
    </div>
  );
}
