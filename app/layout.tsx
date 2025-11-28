import type { Metadata } from "next";
import { Space_Mono, Roboto } from "next/font/google";
import "./globals.css";
import DomainProtection from "@/components/DomainProtection";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "MLRIT Learning Platform",
  description: "Learning platform for MLRIT students and faculty",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.variable} ${roboto.variable} antialiased`}>
        <DomainProtection>
          {children}
        </DomainProtection>
      </body>
    </html>
  );
}
