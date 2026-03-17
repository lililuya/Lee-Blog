import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/site/chat-widget";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
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

function normalizeSiteMediaUrl(mediaUrl: string | null | undefined) {
  const normalizedUrl = mediaUrl?.trim();
  return normalizedUrl ? normalizedUrl : null;
}

function getSiteBackgroundImageStyle(backgroundImageUrl: string | null | undefined) {
  const normalizedUrl = normalizeSiteMediaUrl(backgroundImageUrl);

  if (!normalizedUrl) {
    return undefined;
  }

  const safeUrl = normalizedUrl.replace(/"/g, '\\"');

  return {
    backgroundImage: `url("${safeUrl}")`,
  } as const;
}

function getSiteBackgroundOverlayStyle(opacity: number | null | undefined) {
  const normalizedOpacity =
    typeof opacity === "number" && Number.isFinite(opacity) ? opacity : 22;
  const clampedOpacity = Math.min(1, Math.max(0, normalizedOpacity / 100));

  return {
    "--site-background-overlay-opacity": String(clampedOpacity),
  } as CSSProperties;
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Lee Blog",
    template: "%s | Lee Blog",
  },
  description:
    "A full-stack personal academic blog with journal, comments, admin dashboard, and configurable multi-LLM chat entry.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [currentUser, siteProfile] = await Promise.all([getCurrentUser(), getSiteProfile()]);
  const adminMode = isAdminUser(currentUser?.role);
  const [providers, transcriptionProviders, unreadNotificationCount] = await Promise.all([
    adminMode ? getEnabledChatProviders() : Promise.resolve([]),
    adminMode
      ? Promise.resolve(getAvailableChatTranscriptionProviders())
      : Promise.resolve([]),
    currentUser ? getUnreadNotificationCount(currentUser.id) : Promise.resolve(0),
  ]);
  const backgroundMode = siteProfile.backgroundMediaMode === "VIDEO" ? "VIDEO" : "IMAGE";
  const backgroundImageUrl =
    backgroundMode === "IMAGE" ? normalizeSiteMediaUrl(siteProfile.backgroundImageUrl) : null;
  const backgroundVideoUrl =
    backgroundMode === "VIDEO" ? normalizeSiteMediaUrl(siteProfile.backgroundVideoUrl) : null;
  const siteBackgroundImageStyle = getSiteBackgroundImageStyle(backgroundImageUrl);
  const siteBackgroundOverlayStyle =
    backgroundImageUrl || backgroundVideoUrl
      ? getSiteBackgroundOverlayStyle(siteProfile.backgroundOverlayOpacity)
      : undefined;

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${sans.variable} ${serif.variable} bg-[var(--surface)] text-[var(--ink)] antialiased`}
      >
        <div className="relative isolate min-h-screen overflow-x-hidden">
          <div className="site-background pointer-events-none absolute inset-0 -z-10">
            {siteBackgroundImageStyle ? (
              <div className="site-background__image" style={siteBackgroundImageStyle} />
            ) : null}
            {backgroundVideoUrl ? (
              <video
                className="site-background__video"
                src={backgroundVideoUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                disablePictureInPicture
                aria-hidden
                tabIndex={-1}
              />
            ) : null}
            {siteBackgroundOverlayStyle ? (
              <div className="site-background__overlay" style={siteBackgroundOverlayStyle} />
            ) : null}
          </div>
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
