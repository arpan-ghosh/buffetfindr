import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Buffet Findr — Indian Buffets Near You",
  description: "Find every Indian buffet in DC, Maryland, Virginia, Boston, and NYC. Lunch and dinner buffets near you.",
  keywords: ["indian buffet", "DMV", "DC", "Maryland", "Virginia", "Boston", "NYC", "lunch buffet"],
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
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
