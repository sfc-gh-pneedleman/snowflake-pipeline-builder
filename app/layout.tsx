import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Pipeline Builder",
  description: "Visual drag-and-drop data pipeline builder for Snowflake",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
