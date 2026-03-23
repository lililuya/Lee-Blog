import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lee Blog",
    short_name: "Lee Blog",
    description:
      "A personal academic blog for essays, evergreen notes, weekly digests, galleries, and moderated public discussion.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4efe7",
    theme_color: "#f4efe7",
    icons: [
      {
        src: "/globe.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
