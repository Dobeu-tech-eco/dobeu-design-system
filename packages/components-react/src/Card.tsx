import type { CSSProperties, PropsWithChildren } from "react";

export type DobeuCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

const cardStyle: CSSProperties = {
  borderRadius: "20px",
  border: "1px solid var(--dobeu-color-brand-indigo-slate, #5A4FAB)",
  background: "var(--dobeu-color-brand-cream-soft, #FFF8F0)",
  padding: "20px"
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "var(--dobeu-color-brand-indigo-slate, #5A4FAB)"
};

const subtitleStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: "0",
  color: "var(--dobeu-color-brand-text-gray, #2D2D3A)"
};

export function DobeuCard({ title, subtitle, children }: DobeuCardProps) {
  return (
    <article style={cardStyle}>
      <h3 style={titleStyle}>{title}</h3>
      {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}
      {children}
    </article>
  );
}
