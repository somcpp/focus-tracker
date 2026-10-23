import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrindLog",
  description: "Track focused work, time per task, and daily progress.",
};

// All data lives in localStorage and pages render client-side only,
// so there is no server-rendered content to validate for instant navigation.
export const instant = false;

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

// Apply the saved theme before first paint to avoid a light/dark flash.
const themeScript = `try{var s=JSON.parse(localStorage.getItem('grindlog-v1')||'{}');if(s.state&&s.state.settings&&s.state.settings.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
