import { DesignProfile, ProfileRadiusStyle } from "@workspace/api-client-react";
import { CheckCircle2, ChevronDown, Bell, Search, Menu } from "lucide-react";

interface LivePreviewProps {
  profile: DesignProfile;
}

export function LivePreview({ profile }: LivePreviewProps) {
  const { colors, typography, spacing, radius, shadows } = profile;

  // Compute CSS variables based on the profile
  const cssVars = {
    "--lp-primary": colors.primary,
    "--lp-secondary": colors.secondary || "#e2e8f0",
    "--lp-background": colors.background,
    "--lp-surface": colors.surface || "#ffffff",
    "--lp-text": colors.text,
    "--lp-muted": colors.muted || "#64748b",
    "--lp-border": colors.border || "#cbd5e1",
    "--lp-accent": colors.accent || colors.primary,
    "--lp-success": colors.success || "#22c55e",
    "--lp-warning": colors.warning || "#eab308",
    "--lp-danger": colors.danger || "#ef4444",

    "--lp-font-heading": `"${typography.headingFont}", sans-serif`,
    "--lp-font-body": `"${typography.bodyFont}", sans-serif`,
    "--lp-font-mono": typography.monoFont ? `"${typography.monoFont}", monospace` : 'monospace',
    
    "--lp-base-size": `${typography.baseSizePx || 16}px`,
    "--lp-heading-weight": typography.headingWeight || 700,
    "--lp-body-weight": typography.bodyWeight || 400,

    "--lp-spacing-base": `${spacing.basePx}px`,
    
    "--lp-radius-base": `${radius.basePx}px`,
    
    // Simplistic shadow mappings
    "--lp-shadow": shadows.style === 'none' ? 'none' : 
                   shadows.style === 'subtle' ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' :
                   shadows.style === 'elevated' ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' :
                   '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  } as React.CSSProperties;

  // Compute styles
  const getRadius = (multiplier = 1) => {
    if (radius.style === 'sharp') return '0px';
    if (radius.style === 'pill') return '9999px';
    return `calc(var(--lp-radius-base) * ${multiplier})`;
  };

  const getSpacing = (multiplier = 1) => `calc(var(--lp-spacing-base) * ${multiplier})`;

  return (
    <div 
      className="w-full rounded-xl overflow-hidden border border-border bg-muted/20 relative"
      style={cssVars}
    >
      {/* Pattern overlay for the "workbench" feel */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      <div className="p-8 md:p-12 flex items-center justify-center min-h-[500px]">
        {/* The rendered preview UI */}
        <div 
          className="w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col"
          style={{
            backgroundColor: "var(--lp-background)",
            color: "var(--lp-text)",
            fontFamily: "var(--lp-font-body)",
            fontSize: "var(--lp-base-size)",
            fontWeight: "var(--lp-body-weight)",
            borderRadius: getRadius(2),
            boxShadow: "var(--lp-shadow)",
          }}
        >
          {/* Header */}
          <header 
            className="flex items-center justify-between border-b"
            style={{
              padding: getSpacing(2),
              borderColor: "var(--lp-border)",
              backgroundColor: "var(--lp-surface)"
            }}
          >
            <div className="flex items-center space-x-4">
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{
                  backgroundColor: "var(--lp-primary)",
                  color: "#fff",
                  borderRadius: getRadius(0.5)
                }}
              >
                <div className="w-4 h-4 border-2 border-current rounded-sm"></div>
              </div>
              <span 
                style={{
                  fontFamily: "var(--lp-font-heading)",
                  fontWeight: "var(--lp-heading-weight)",
                  fontSize: "calc(var(--lp-base-size) * 1.125)"
                }}
              >
                Acme Corp
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span style={{ color: "var(--lp-muted)" }}>Products</span>
              <span style={{ color: "var(--lp-muted)" }}>Solutions</span>
              <span style={{ color: "var(--lp-muted)" }}>Pricing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div 
                className="flex items-center"
                style={{
                  padding: `${getSpacing(0.75)} ${getSpacing(1.5)}`,
                  border: "1px solid var(--lp-border)",
                  borderRadius: getRadius(1),
                  color: "var(--lp-muted)",
                  fontSize: "calc(var(--lp-base-size) * 0.875)"
                }}
              >
                <Search className="w-4 h-4 mr-2" />
                Search...
              </div>
            </div>
          </header>

          <div className="flex flex-1">
            {/* Sidebar */}
            <aside 
              className="w-48 border-r flex flex-col"
              style={{
                borderColor: "var(--lp-border)",
                backgroundColor: "var(--lp-surface)",
                padding: getSpacing(2)
              }}
            >
              <div className="space-y-1 mb-6">
                {['Overview', 'Analytics', 'Customers', 'Settings'].map((item, i) => (
                  <div 
                    key={item}
                    style={{
                      padding: `${getSpacing(0.75)} ${getSpacing(1)}`,
                      borderRadius: getRadius(0.5),
                      backgroundColor: i === 0 ? "var(--lp-primary)" : "transparent",
                      color: i === 0 ? "#fff" : "var(--lp-text)",
                      fontWeight: i === 0 ? "var(--lp-heading-weight)" : "inherit",
                      opacity: i === 0 ? 1 : 0.8,
                      fontSize: "calc(var(--lp-base-size) * 0.875)",
                      cursor: "pointer"
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div 
                className="mt-auto p-3"
                style={{
                  backgroundColor: "var(--lp-background)",
                  borderRadius: getRadius(0.75),
                  border: "1px solid var(--lp-border)"
                }}
              >
                <div style={{ fontSize: "calc(var(--lp-base-size) * 0.75)", color: "var(--lp-muted)", fontWeight: "bold", marginBottom: getSpacing(0.5) }}>STORAGE</div>
                <div style={{ width: "100%", height: "4px", backgroundColor: "var(--lp-secondary)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: "60%", height: "100%", backgroundColor: "var(--lp-primary)" }}></div>
                </div>
                <div style={{ fontSize: "calc(var(--lp-base-size) * 0.75)", marginTop: getSpacing(0.5) }}>60% used</div>
              </div>
            </aside>

            {/* Main Content */}
            <main 
              className="flex-1"
              style={{ padding: getSpacing(3) }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 
                    style={{
                      fontFamily: "var(--lp-font-heading)",
                      fontWeight: "var(--lp-heading-weight)",
                      fontSize: "calc(var(--lp-base-size) * 1.5)",
                      marginBottom: getSpacing(0.5),
                      color: "var(--lp-text)"
                    }}
                  >
                    Welcome back, Jane
                  </h1>
                  <p style={{ color: "var(--lp-muted)", fontSize: "calc(var(--lp-base-size) * 0.875)" }}>
                    Here's what's happening with your projects today.
                  </p>
                </div>
                <button
                  style={{
                    backgroundColor: "var(--lp-primary)",
                    color: "#fff",
                    padding: `${getSpacing(1)} ${getSpacing(2)}`,
                    borderRadius: getRadius(1),
                    border: "none",
                    fontWeight: "bold",
                    fontSize: "calc(var(--lp-base-size) * 0.875)",
                    cursor: "pointer"
                  }}
                >
                  Create New
                </button>
              </div>

              {/* Cards */}
              <div 
                className="grid grid-cols-2"
                style={{ gap: getSpacing(2), marginBottom: getSpacing(3) }}
              >
                {[
                  { label: "Total Revenue", value: "$45,231.89", trend: "+20.1%", color: "var(--lp-success)" },
                  { label: "Active Users", value: "2,350", trend: "-4.5%", color: "var(--lp-danger)" }
                ].map((stat, i) => (
                  <div 
                    key={i}
                    style={{
                      backgroundColor: "var(--lp-surface)",
                      padding: getSpacing(2),
                      borderRadius: getRadius(1),
                      border: "1px solid var(--lp-border)",
                      boxShadow: "var(--lp-shadow)"
                    }}
                  >
                    <div style={{ color: "var(--lp-muted)", fontSize: "calc(var(--lp-base-size) * 0.875)", marginBottom: getSpacing(0.5) }}>{stat.label}</div>
                    <div 
                      style={{
                        fontFamily: "var(--lp-font-heading)",
                        fontWeight: "var(--lp-heading-weight)",
                        fontSize: "calc(var(--lp-base-size) * 1.25)",
                        marginBottom: getSpacing(0.5)
                      }}
                    >
                      {stat.value}
                    </div>
                    <div style={{ color: stat.color, fontSize: "calc(var(--lp-base-size) * 0.75)", fontWeight: "bold" }}>
                      {stat.trend} from last month
                    </div>
                  </div>
                ))}
              </div>

              {/* Action area */}
              <div 
                style={{
                  backgroundColor: "var(--lp-surface)",
                  padding: getSpacing(2),
                  borderRadius: getRadius(1),
                  border: "1px solid var(--lp-border)",
                }}
              >
                <h3 
                  style={{
                    fontFamily: "var(--lp-font-heading)",
                    fontWeight: "var(--lp-heading-weight)",
                    fontSize: "calc(var(--lp-base-size) * 1.125)",
                    marginBottom: getSpacing(1.5)
                  }}
                >
                  Recent Activity
                </h3>
                
                <div className="space-y-3">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ paddingBottom: i < 2 ? getSpacing(1.5) : 0, borderBottom: i < 2 ? `1px solid var(--lp-border)` : 'none' }}>
                      <div className="flex items-center">
                        <div 
                          className="w-8 h-8 rounded-full mr-3 flex items-center justify-center text-xs"
                          style={{ backgroundColor: "var(--lp-secondary)", color: "var(--lp-text)" }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div>
                          <div style={{ fontSize: "calc(var(--lp-base-size) * 0.875)", fontWeight: "var(--lp-heading-weight)" }}>User registered</div>
                          <div style={{ fontSize: "calc(var(--lp-base-size) * 0.75)", color: "var(--lp-muted)" }}>johndoe@example.com</div>
                        </div>
                      </div>
                      <div 
                        style={{
                          padding: `${getSpacing(0.25)} ${getSpacing(1)}`,
                          borderRadius: getRadius(1),
                          backgroundColor: i === 0 ? "var(--lp-success)" : "var(--lp-secondary)",
                          color: i === 0 ? "#fff" : "var(--lp-text)",
                          fontSize: "calc(var(--lp-base-size) * 0.75)",
                          fontWeight: "bold",
                          opacity: i === 0 ? 1 : 0.8
                        }}
                      >
                        {i === 0 ? 'Success' : 'Pending'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
