import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "BuffetFindr — Find Indian Buffets Near You",
  description: "Find every Indian buffet restaurant in DC, Maryland, Virginia, Boston, NYC, Philadelphia, New Jersey, Chicago, and Seattle. Lunch and dinner buffets with hours, ratings, and directions.",
  keywords: ["indian buffet", "indian buffet near me", "indian restaurant buffet", "DMV", "DC", "Maryland", "Virginia", "Boston", "NYC", "lunch buffet", "dinner buffet"],
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "BuffetFindr — Find Indian Buffets Near You",
    description: "Find every Indian buffet restaurant in DC, Maryland, Virginia, Boston, NYC, Philadelphia, New Jersey, Chicago, and Seattle.",
    url: "https://www.buffetfindr.com",
    siteName: "BuffetFindr",
    images: [{ url: "https://www.buffetfindr.com/icon.png", width: 1024, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BuffetFindr — Find Indian Buffets Near You",
    description: "Find every Indian buffet restaurant across DC, MD, VA, Boston, NYC, Philly, NJ, Chicago, and Seattle.",
    images: ["https://www.buffetfindr.com/icon.png"],
  },
  alternates: { canonical: "https://www.buffetfindr.com" },
};

export const viewport: Viewport = {
  themeColor: "#C94A1F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
