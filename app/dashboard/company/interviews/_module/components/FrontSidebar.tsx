const MAIN_APP_URL =
  process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "http://localhost:3000";

const items = [
  { href: `${MAIN_APP_URL}/dashboard/company`, label: "Mon espace", icon: "home" },
  { href: `${MAIN_APP_URL}/dashboard/company/jobs`, label: "Mes offres", icon: "clipboard" },
  { href: `${MAIN_APP_URL}/dashboard/jobs/new`, label: "Publier une offre", icon: "plus" },
  { href: "/", label: "Entretiens", icon: "calendar", active: true },
  { href: `${MAIN_APP_URL}/dashboard/company/edit`, label: "Profil Entreprise", icon: "settings" },
];

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: 16,
  height: 16,
};

function Icon({ name }: { name: string }) {
  switch (name) {
    case "home":
      return (
        <svg {...svgProps}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...svgProps}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
        </svg>
      );
    case "plus":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...svgProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
        </svg>
      );
  }
}

export default function FrontSidebar() {
  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 256,
        zIndex: 50,
        background: "#ffffff",
        borderRight: "1px solid #f1f5f9",
        display: "flex",
        flexDirection: "column",
        fontFamily: "inherit",
      }}
      aria-label="Navigation principale"
    >
      {/* Logo */}
      <a
        href={`${MAIN_APP_URL}/`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 64,
          padding: "0 20px",
          borderBottom: "1px solid #f1f5f9",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg,#2563eb,#4f46e5)",
            color: "#fff",
            fontWeight: 900,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          S
        </div>
        <div>
          <span style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>SmartApply</span>{" "}
          <span style={{ color: "#2563eb", fontWeight: 600, fontSize: 12 }}>Tunisia</span>
        </div>
      </a>

      {/* Badge rôle */}
      <div style={{ padding: "14px 20px 8px" }}>
        <span
          style={{
            background: "#eef2ff",
            color: "#4338ca",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          Entreprise
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "4px 12px" }}>
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              marginBottom: 4,
              borderRadius: 12,
              fontSize: 14,
              textDecoration: "none",
              background: item.active ? "#eff6ff" : "transparent",
              color: item.active ? "#1d4ed8" : "#64748b",
              fontWeight: item.active ? 500 : 400,
            }}
          >
            <span style={{ display: "flex", color: item.active ? "#2563eb" : "#94a3b8" }}>
              <Icon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}