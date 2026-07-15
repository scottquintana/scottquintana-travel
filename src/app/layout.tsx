import type { Metadata } from "next";
import { Playfair_Display, Figtree } from "next/font/google";
import { NavigationOverlay } from "@/components/NavigationOverlay";
import siteConfig from "@/lib/siteConfig";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: siteConfig.metaTitle,
  description: siteConfig.metaDescription,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${figtree.variable}`}>
        {children}
        <NavigationOverlay />
      </body>
    </html>
  );
}
