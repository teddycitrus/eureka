import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const sans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eureka, supply-chain risk",
  description: "Live supply-chain risk awareness with interactive voice agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen font-sans antialiased">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
