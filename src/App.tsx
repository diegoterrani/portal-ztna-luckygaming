/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ExternalLink,
  ShieldCheck,
  Database,
  Gamepad2,
  Lock,
  Activity,
  Server,
  Fingerprint,
} from "lucide-react";

type RiskAccent = "low" | "info" | "medium";

interface AppItem {
  name: string;
  url: string;
  description: string;
  icon: ReactNode;
  accent: RiskAccent;
}

interface AppCardProps {
  app: AppItem;
  index: number;
}

function AppCard({ app, index }: AppCardProps) {
  const reduceMotion = useReducedMotion();
  const href = app.url.startsWith("http") ? app.url : `https://${app.url}`;

  return (
    <motion.article
      initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 0.28, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }
      }
      data-accent={app.accent}
      className="iron-app-card"
    >
      {/* Technical strip — replaces decorative imagery */}
      <div className="relative h-36 overflow-hidden border-b border-border-muted bg-surface-panel">
        <div
          className="absolute inset-0 bg-grid-intel opacity-80"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-radial-vignette"
          aria-hidden
        />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
          <div className="iron-icon-well">{app.icon}</div>
          <div className="hidden sm:block text-right font-mono text-[11px] text-text-muted">
            TLS 1.3 · ZT
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="mb-1 text-[15px] font-semibold leading-tight text-text-primary">
          {app.name}
        </h2>
        <p className="mb-4 line-clamp-3 text-[12px] leading-snug text-text-muted">
          {app.description}
        </p>
        <div className="mt-auto">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="iron-btn-secondary"
          >
            Autenticar e abrir
            <ExternalLink className="shrink-0" strokeWidth={1.5} size={16} aria-hidden />
          </a>
        </div>
      </div>
    </motion.article>
  );
}

function LuckyLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M50 5L93.3 30V70L50 95L6.7 70V30L50 5Z"
          stroke="var(--iron-brand-green)"
          strokeWidth="8"
        />
        <path
          d="M30 40V70H50V80H20V30H70V40H30Z"
          fill="var(--iron-brand-green)"
        />
        <path d="M50 50H80V70H50V50Z" fill="var(--iron-brand-red)" />
      </svg>
      <div className="flex items-baseline text-[18px] font-bold tracking-tight">
        <span className="text-brand-green">LUCKY</span>
        <span className="text-brand-red ml-0.5">GAMING</span>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-h-[88px] min-w-0 flex-1 flex-col justify-between rounded-[8px] border border-border-default bg-surface-card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium text-text-muted">{label}</span>
        <span className="text-text-secondary [&_svg]:stroke-[1.5]">{icon}</span>
      </div>
      <p className="text-[16px] font-medium tabular-nums text-text-primary">
        {value}
      </p>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--iron-progress-track)]"
        aria-hidden
      >
        <div className="h-full w-3/4 rounded-full bg-tech-cyan/70" />
      </div>
    </div>
  );
}

export default function App() {
  const reduceMotion = useReducedMotion();

  const apps: AppItem[] = [
    {
      name: "PAGOL — Backoffice",
      url: "back.zta.luckygaming.com.br",
      description:
        "Console administrativo. Sessão sujeita a políticas de identidade e registro de acesso.",
      icon: <Database size={20} strokeWidth={1.5} aria-hidden />,
      accent: "low",
    },
    {
      name: "4PLAY.GAME — Backoffice",
      url: "bko.zta.luckygaming.com.br",
      description:
        "Operações de backoffice 4PLAY. Tráfego inspecionado e MFA conforme perfil do usuário.",
      icon: <ShieldCheck size={20} strokeWidth={1.5} aria-hidden />,
      accent: "info",
    },
    {
      name: "4PLAY.GAME",
      url: "play.zta.luckygaming.com.br",
      description:
        "Ambiente de jogo autorizado. Acesso apenas para identidades provisionadas e rotas validadas.",
      icon: <Gamepad2 size={20} strokeWidth={1.5} aria-hidden />,
      accent: "medium",
    },
  ];

  return (
    <div className="relative min-h-dvh bg-surface-app selection:bg-brand-green/30 selection:text-text-primary">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-surface-app bg-grid-intel opacity-40"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-radial-vignette"
        aria-hidden
      />

      <header
        className="fixed top-0 right-0 left-0 z-50 border-b border-[var(--iron-header-divider)] bg-surface-header"
        style={{ height: "var(--iron-header-height)" }}
        role="banner"
      >
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-[var(--iron-content-padding-x)]">
          <div className="flex min-w-0 items-center gap-4">
            <LuckyLogo />
            <span
              className="hidden h-8 w-px shrink-0 bg-border-muted sm:block"
              aria-hidden
            />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-9 items-center rounded-[var(--iron-radius-chip)] border border-border-default bg-[var(--iron-surface-header-control)] px-3.5 text-[13px] font-medium text-text-primary">
                <Activity
                  className="mr-2 text-tech-cyan"
                  strokeWidth={1.5}
                  size={16}
                  aria-hidden
                />
                Canais monitorados
              </span>
              <span className="flex items-center gap-1.5 rounded-[var(--iron-radius-chip)] border border-[var(--iron-pill-ok-border)] bg-[var(--iron-pill-ok-bg)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-green">
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green"
                  aria-hidden
                />
                Operacional
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-text-secondary">
            <Lock
              className="hidden text-tech-cyan sm:block"
              strokeWidth={1.5}
              size={16}
              aria-hidden
            />
            <span className="hidden text-[12px] font-medium sm:inline">
              Zero Trust Access
            </span>
          </div>
        </div>
      </header>

      <main
        className="mx-auto max-w-[1400px] px-[var(--iron-content-padding-x)] pb-10"
        style={{ paddingTop: "var(--iron-header-height)" }}
      >
        <div className="border-b border-border-muted py-8">
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.04em] text-text-muted">
              Iron Security · Acesso
            </p>
            <h1 className="mb-1 text-[20px] font-bold leading-tight text-text-primary">
              Seleção de destino
            </h1>
            <p className="max-w-2xl text-[12px] leading-relaxed text-text-secondary">
              Escolha o sistema autorizado. Todas as sessões são avaliadas por política,
              inspeção de tráfego e registro de auditoria.
            </p>
          </motion.div>
        </div>

        <section
          className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
          aria-label="Indicadores de canal"
        >
          <MiniStat
            label="Destinos publicados"
            value={String(apps.length).padStart(2, "0")}
            icon={<Server size={18} aria-hidden />}
          />
          <MiniStat
            label="Camada de confiança"
            value="ZTNA / mTLS"
            icon={<ShieldCheck size={18} aria-hidden />}
          />
          <MiniStat
            label="Identidade"
            value="SSO + política"
            icon={<Fingerprint size={18} aria-hidden />}
          />
        </section>

        <section className="mt-8" aria-labelledby="apps-heading">
          <h2
            id="apps-heading"
            className="mb-4 text-[14px] font-semibold text-text-primary"
          >
            Aplicações disponíveis
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app, index) => (
              <AppCard key={app.url} app={app} index={index} />
            ))}
          </div>
        </section>

        <footer className="mt-12 flex flex-col gap-4 border-t border-border-muted pt-8 text-[11px] text-text-muted md:flex-row md:items-center md:justify-between">
          <p>© 2026 Lucky Gaming · Iron Security Intelligence</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Rodapé">
            <a
              href="#"
              className="text-text-secondary transition-colors hover:text-text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tech-cyan"
            >
              Termos
            </a>
            <a
              href="#"
              className="text-text-secondary transition-colors hover:text-text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tech-cyan"
            >
              Segurança
            </a>
            <a
              href="#"
              className="text-text-secondary transition-colors hover:text-text-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tech-cyan"
            >
              Contato
            </a>
          </nav>
        </footer>
      </main>
    </div>
  );
}
