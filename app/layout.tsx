import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ChatWidget } from "@/components/site/chat-widget";
import { VisitTracker } from "@/components/site/visit-tracker";
import { getCurrentUser } from "@/lib/auth";
import { getEnabledChatProviders } from "@/lib/queries";

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
});

const themeInitScript = `
(() => {
  const storageKey = "scholar-theme";
  const storedTheme = window.localStorage.getItem(storageKey);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = storedTheme === "dark" || storedTheme === "light"
    ? storedTheme
    : prefersDark
      ? "dark"
      : "light";

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Lee的博客",
    template: "%s | Lee的博客",
  },
  description:
    "A full-stack personal academic blog with journal, comments, admin dashboard, and configurable multi-LLM chat entry.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentUser, providers] = await Promise.all([getCurrentUser(), getEnabledChatProviders()]);

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${sans.variable} ${serif.variable} bg-[var(--surface)] text-[var(--ink)] antialiased`}>
        <div className="relative min-h-screen overflow-x-hidden">
          <div className="site-background pointer-events-none absolute inset-0 -z-10" />
          <SiteHeader currentUser={currentUser} />
          <main>{children}</main>
          <VisitTracker />
          <SiteFooter />
          <ChatWidget
            currentUser={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
            providers={providers}
          />
        </div>
      </body>
    </html>
  );
}

