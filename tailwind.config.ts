import type { Config } from "tailwindcss";

const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ─────────────────────────────────────────────
        bg: {
          DEFAULT: rgb("--ink-base"),
          raised: rgb("--panel"),
          card: rgb("--panel-raised"),
          hover: rgb("--panel-hover"),
          deep: rgb("--ink-deep"),
        },
        // ── Text ─────────────────────────────────────────────────
        ink: {
          DEFAULT: rgb("--fg-bright"),
          muted: rgb("--fg-muted"),
          dim: rgb("--fg-dim"),
          warm: rgb("--fg"),
        },
        // ── Brand & accents ──────────────────────────────────────
        // "eureka-*" token names map onto warm amber values (instrument-panel feel).
        eureka: {
          50: rgb("--amber-50"),
          100: rgb("--amber-100"),
          200: rgb("--amber-200"),
          300: rgb("--amber-300"),
          400: rgb("--amber-400"),
          500: rgb("--amber-500"),
          600: rgb("--amber-600"),
          700: rgb("--amber-700"),
          800: rgb("--amber-800"),
          900: rgb("--amber-900"),
        },
        amber: {
          DEFAULT: rgb("--amber"),
          deep: rgb("--amber-deep"),
        },
        accent: {
          cyan: rgb("--teal"), // keep token; value now teal
          rose: rgb("--rose"),
          amber: rgb("--amber"),
        },
        // ── Severity ─────────────────────────────────────────────
        risk: {
          low: rgb("--risk-low"),
          medium: rgb("--risk-medium"),
          high: rgb("--risk-high"),
          critical: rgb("--risk-critical"),
        },
        line: rgb("--rule"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        chart: "0.22em",
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--amber) / 0.4), 0 8px 40px -8px rgb(var(--amber) / 0.45)",
        card: "0 1px 0 rgba(255,255,255,0.025) inset, 0 8px 32px -16px rgba(0,0,0,0.65)",
        instrument:
          "0 0 0 1px rgb(var(--rule) / 1), inset 0 1px 0 rgba(255,255,255,0.03), 0 14px 50px -28px rgba(0,0,0,0.85)",
      },
      animation: {
        "pulse-soft": "pulse 2.4s cubic-bezier(.4,0,.6,1) infinite",
        "ping-slow": "ping 2.6s cubic-bezier(0,0,0.2,1) infinite",
        reveal: "reveal 800ms cubic-bezier(.16,1,.3,1) both",
      },
      keyframes: {
        reveal: {
          from: { opacity: "0", transform: "translateY(10px)", filter: "blur(6px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
