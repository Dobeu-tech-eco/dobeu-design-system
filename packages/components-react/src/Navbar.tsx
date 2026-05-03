import type { CSSProperties, PropsWithChildren } from "react";

export type DobeuNavbarProps = PropsWithChildren<{
  brand: string;
}>;

const navStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  borderBottom: "1px solid var(--dobeu-color-brand-indigo-slate, #5A4FAB)"
};

const brandStyle: CSSProperties = {
  margin: 0,
  color: "var(--dobeu-color-brand-indigo-slate, #5A4FAB)",
  fontWeight: 800,
  fontFamily: "var(--dobeu-font-sans, Nunito, sans-serif)"
};

export function DobeuNavbar({ brand, children }: DobeuNavbarProps) {
  return (
    <nav style={navStyle} aria-label="Dobeu primary navigation">
      <p style={brandStyle}>{brand}</p>
      <div>{children}</div>
    </nav>
  );
}
