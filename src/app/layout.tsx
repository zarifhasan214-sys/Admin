import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manirampur Blood Network",
  description:
    "মানিরামপুর ব্লাড নেটওয়ার্ক — community blood donation platform for Manirampur, Jashore.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
