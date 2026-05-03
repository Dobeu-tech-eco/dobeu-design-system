import type { ButtonHTMLAttributes, CSSProperties, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary";

export type DobeuButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
  }
>;

const baseStyle: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid transparent",
  padding: "12px 16px",
  fontFamily: "var(--dobeu-font-sans, Nunito, sans-serif)",
  fontWeight: 700,
  cursor: "pointer"
};

const variantStyle: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "var(--dobeu-color-brand-indigo-primary, #6B5CE7)",
    color: "#FFFFFF"
  },
  secondary: {
    background: "transparent",
    color: "var(--dobeu-color-brand-indigo-primary, #6B5CE7)",
    border: "1px solid var(--dobeu-color-brand-indigo-primary, #6B5CE7)"
  }
};

export function DobeuButton({ children, variant = "primary", style, ...rest }: DobeuButtonProps) {
  return (
    <button style={{ ...baseStyle, ...variantStyle[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}
