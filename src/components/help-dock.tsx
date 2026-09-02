"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/modules/i18n";

type HelpLink = {
  href: string;
  label: string;
  description: string;
};

function linksForPath(pathname: string, locale: Locale): HelpLink[] {
  const pt = locale === "pt-BR";

  if (pathname.startsWith("/planning")) {
    return [
      {
        href: "/help#planning",
        label: pt ? "Como funciona o Planejamento?" : "How does Planning work?",
        description: pt ? "Sprint, Board, Backlog e GitHub Projects." : "Sprint, Board, Backlog and GitHub Projects.",
      },
      {
        href: "/help#planning",
        label: pt ? "Sprint x Backlog" : "Sprint vs Backlog",
        description: pt ? "Entenda por que cada item aparece em uma área." : "Understand why each item appears in each area.",
      },
      {
        href: "/help#troubleshooting",
        label: pt ? "Project não apareceu?" : "Project not showing?",
        description: pt ? "Veja como reconectar o GitHub Projects." : "See how to reconnect GitHub Projects.",
      },
    ];
  }

  if (pathname.startsWith("/dashboard")) {
    return [
      {
        href: "/help#health",
        label: pt ? "Como funciona o Health?" : "How does Health work?",
        description: pt ? "Score, dimensões, penalidades e tendência." : "Score, dimensions, penalties and trend.",
      },
      {
        href: "/help#attention",
        label: pt ? "O que é Attention?" : "What is Attention?",
        description: pt ? "Entenda alertas, regras e severidades." : "Understand alerts, rules and severities.",
      },
      {
        href: "/help#getting-started",
        label: pt ? "Conectar e sincronizar" : "Connect and sync",
        description: pt ? "GitHub App, repositórios e atualização dos dados." : "GitHub App, repositories and data refresh.",
      },
    ];
  }

  if (pathname.startsWith("/help")) return [];

  return [
    {
      href: "/help#getting-started",
      label: pt ? "Primeiros passos" : "Getting started",
      description: pt ? "Aprenda o fluxo básico do DevBoard." : "Learn the basic DevBoard flow.",
    },
  ];
}

export function HelpDock({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/api/") || pathname.startsWith("/help")) return null;

  const pt = locale === "pt-BR";
  const contextualLinks = linksForPath(pathname, locale);

  return (
    <details
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        zIndex: 100,
      }}
    >
      <summary
        aria-label={pt ? "Abrir ajuda" : "Open help"}
        style={{
          listStyle: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 14px",
          border: "1px solid var(--border)",
          borderRadius: 999,
          background: "var(--accent)",
          color: "#11140a",
          boxShadow: "0 10px 32px rgba(0,0,0,.35)",
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span aria-hidden="true">?</span>
        {pt ? "Ajuda" : "Help"}
      </summary>

      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 52,
          width: "min(330px, calc(100vw - 44px))",
          padding: 14,
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "#101216",
          boxShadow: "0 18px 60px rgba(0,0,0,.5)",
        }}
      >
        <div style={{ padding: "4px 5px 12px" }}>
          <strong style={{ display: "block", marginBottom: 5, fontSize: 15 }}>
            {pt ? "Ajuda nesta tela" : "Help on this page"}
          </strong>
          <span style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
            {pt ? "Escolha o que você quer entender." : "Choose what you want to understand."}
          </span>
        </div>

        <div style={{ display: "grid", gap: 7 }}>
          {contextualLinks.map((link) => (
            <a
              href={link.href}
              key={`${link.href}:${link.label}`}
              style={{
                display: "block",
                padding: "10px 11px",
                border: "1px solid var(--border)",
                borderRadius: 9,
                color: "var(--text)",
                textDecoration: "none",
                background: "#0c0e11",
              }}
            >
              <strong style={{ display: "block", marginBottom: 3, fontSize: 12 }}>{link.label}</strong>
              <span style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.4 }}>
                {link.description}
              </span>
            </a>
          ))}

          <a
            href="/help"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "11px",
              borderRadius: 9,
              background: "var(--accent)",
              color: "#11140a",
              fontSize: 12,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            {pt ? "Abrir Central de Ajuda" : "Open Help Center"}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </details>
  );
}
