import type { CSSProperties, InputHTMLAttributes } from "react";

export type DobeuInputProps = InputHTMLAttributes<HTMLInputElement>;

const inputStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid var(--dobeu-color-brand-indigo-slate, #5A4FAB)",
  padding: "12px 16px",
  color: "var(--dobeu-color-brand-text-gray, #2D2D3A)",
  fontFamily: "var(--dobeu-font-sans, Nunito, sans-serif)"
};

export function DobeuInput(props: DobeuInputProps) {
  return <input style={inputStyle} {...props} />;
}
