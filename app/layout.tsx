import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rektreceipt.vercel.app'),
  title: "RektReceipt",
  description: "Find out how much Solana has taken from you.",
  openGraph: {
    title: "RektReceipt",
    description: "Find out how much Solana has taken from you.",
    type: "website",
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RektReceipt",
    description: "Find out how much Solana has taken from you.",
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
