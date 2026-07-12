import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scott Quintana — Places",
  description: "Places I like across cities I've visited.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
