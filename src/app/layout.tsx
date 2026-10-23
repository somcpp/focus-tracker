import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrindLog",
  description: "Track what you work on, how long, and keep the streak alive.",
};

// All data lives in localStorage and pages render client-side only,
// so there is no server-rendered content to validate for instant navigation.
export const instant = false;

export const viewport: Viewport = {
  themeColor: "#fff8ef",
};

// Apply the saved theme before first paint to avoid a light/dark flash.
const themeScript = `try{var s=JSON.parse(localStorage.getItem('grindlog-v1')||'{}');if(s.state&&s.state.settings&&s.state.settings.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
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
