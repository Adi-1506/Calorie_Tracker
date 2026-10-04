import { ImageResponse } from "next/og";

// Shared 1200x630 social card for Open Graph and Twitter (spec section 2).
export const OG_SIZE = { width: 1200, height: 630 };

const NIGHT = "#1a1714";
const CREAM = "#f8f7f3";
const MUTED = "#cfcac0";
const TURMERIC = "#e2a00e";

export function ogImage({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: NIGHT, color: CREAM, padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="21" fill="none" stroke="#3a3631" strokeWidth="6" />
            <path d="M32 11a21 21 0 1 1-19.6 13.5" fill="none" stroke={TURMERIC} strokeWidth="6" strokeLinecap="round" />
            <circle cx="25" cy="29" r="4" fill="#3f8f5a" />
            <circle cx="32" cy="25" r="4" fill={TURMERIC} />
            <circle cx="39" cy="29" r="4" fill="#c8452b" />
          </svg>
          <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>Kalo</span>
          <span style={{ marginLeft: "auto", fontSize: 24, color: TURMERIC, textTransform: "uppercase", letterSpacing: 3 }}>{eyebrow}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span style={{ fontSize: title.length > 48 ? 64 : 80, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{title}</span>
          {subtitle && <span style={{ fontSize: 32, color: MUTED, lineHeight: 1.3 }}>{subtitle}</span>}
        </div>
        <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ flex: 5, background: TURMERIC }} />
          <div style={{ flex: 2, background: "#3f8f5a" }} />
          <div style={{ flex: 2, background: "#c98a06" }} />
          <div style={{ flex: 1, background: "#c8452b" }} />
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
