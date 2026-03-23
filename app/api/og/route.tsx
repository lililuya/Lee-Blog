import { ImageResponse } from "next/og";

export const runtime = "edge";

const SIZE = {
  width: 1200,
  height: 630,
};

function clampText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = clampText(searchParams.get("title") ?? "Lee Blog", 90);
  const eyebrow = clampText(searchParams.get("eyebrow") ?? "Lee Blog", 36);
  const description = clampText(
    searchParams.get("description") ??
      "Personal academic writing, evergreen notes, research digests, galleries, and moderated discussion.",
    180,
  );

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgb(8, 18, 24) 0%, rgb(16, 36, 44) 52%, rgb(21, 61, 61) 100%)",
          color: "rgb(240, 246, 244)",
          fontFamily:
            '"Segoe UI", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 18%, rgba(99,194,178,0.26), transparent 36%), radial-gradient(circle at 86% 84%, rgba(219,181,111,0.22), transparent 28%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 24,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "52px 60px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "flex-start",
              padding: "12px 20px",
              borderRadius: 999,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgb(182, 239, 228)",
              background: "rgba(99,194,178,0.12)",
            }}
          >
            {eyebrow}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: 980,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: title.length > 54 ? 62 : 72,
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: "-0.05em",
                whiteSpace: "pre-wrap",
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                maxWidth: 930,
                fontSize: 28,
                lineHeight: 1.45,
                color: "rgba(232, 242, 241, 0.82)",
              }}
            >
              {description}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background:
                    "linear-gradient(135deg, rgba(99,194,178,1), rgba(219,181,111,0.95))",
                  boxShadow: "0 0 0 10px rgba(99,194,178,0.14)",
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "rgba(246, 250, 249, 0.96)",
                }}
              >
                Lee Blog
              </div>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 600,
                color: "rgba(226, 239, 238, 0.74)",
              }}
            >
              essays · notes · digest · gallery
            </div>
          </div>
        </div>
      </div>
    ),
    SIZE,
  );
}
