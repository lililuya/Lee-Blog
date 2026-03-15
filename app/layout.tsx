import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ChatWidget } from "@/components/site/chat-widget";
import { VisitTracker } from "@/components/site/visit-tracker";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableChatTranscriptionProviders } from "@/lib/chat/transcription";
import { getEnabledChatProviders, getSiteProfile, isAdminUser } from "@/lib/queries";
import { getUnreadNotificationCount } from "@/lib/user-notifications";

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

function getSiteBackgroundStyle(backgroundImageUrl: string | null | undefined) {
  const normalizedUrl = backgroundImageUrl?.trim();

  if (!normalizedUrl) {
    return undefined;
  }

  const safeUrl = normalizedUrl.replace(/"/g, '\\"');

  return {
    backgroundImage: `linear-gradient(180deg, rgba(248,244,235,0.78), rgba(246,247,241,0.88) 52%, rgba(238,243,242,0.92)), url("${safeUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
  } as const;
}

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
  const [currentUser, siteProfile] = await Promise.all([
    getCurrentUser(),
    getSiteProfile(),
  ]);
  const adminMode = isAdminUser(currentUser?.role);
  const [providers, transcriptionProviders, unreadNotificationCount] = await Promise.all([
    adminMode ? getEnabledChatProviders() : Promise.resolve([]),
    adminMode
      ? Promise.resolve(getAvailableChatTranscriptionProviders())
      : Promise.resolve([]),
    currentUser ? getUnreadNotificationCount(currentUser.id) : Promise.resolve(0),
  ]);
  const siteBackgroundStyle = getSiteBackgroundStyle(siteProfile.backgroundImageUrl);

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${sans.variable} ${serif.variable} bg-[var(--surface)] text-[var(--ink)] antialiased`}>
        <div className="relative min-h-screen overflow-x-hidden">
          <div
            className="site-background pointer-events-none absolute inset-0 -z-10"
            style={siteBackgroundStyle}
          />
          <SiteHeader currentUser={currentUser} unreadNotificationCount={unreadNotificationCount} />
          <main>{children}</main>
          <VisitTracker />
          <SiteFooter />
          <ChatWidget
            currentUser={
              currentUser
                ? {
                    name: currentUser.name,
                    role: currentUser.role,
                    avatarUrl: currentUser.avatarUrl,
                  }
                : null
            }
            assistantAvatarUrl={siteProfile.assistantAvatarUrl}
            providers={providers}
            transcriptionProviders={transcriptionProviders}
          />
        </div>
      </body>
    </html>
  );
}
