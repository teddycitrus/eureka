import type { Config } from "tailwindcss";

const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: rgb("--ground"),
        surface: rgb("--surface"),
        raised: rgb("--raised"),
        hover: rgb("--hover"),
        line: rgb("--line"),
        rule: rgb("--rule"),
        control: rgb("--control"),
        ink: {
          DEFAULT: rgb("--text"),
          soft: rgb("--soft"),
          muted: rgb("--muted"),
        },
        accent: rgb("--accent"),
        positive: rgb("--positive"),
        negative: rgb("--negative"),
        warning: rgb("--warning"),
        risk: {
          low: rgb("--risk-low"),
          medium: rgb("--risk-medium"),
          high: rgb("--risk-high"),
          critical: rgb("--risk-critical"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["12px", "16px"],
        sm: ["13px", "20px"],
        base: ["14px", "20px"],
        lg: ["16px", "24px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "30px"],
      },
    },
  },
  plugins: [],
} satisfies Config;
