import { createHash } from "node:crypto";

export type VisitorRegionKey =
  | "north-america"
  | "south-america"
  | "europe"
  | "africa"
  | "middle-east"
  | "south-asia"
  | "southeast-asia"
  | "east-asia"
  | "oceania"
  | "unknown";

type RegionMeta = {
  key: VisitorRegionKey;
  label: string;
  x: number;
  y: number;
};

type VisitorSnapshot = {
  firstSeenAt: Date;
  lastSeenAt: Date;
  visitCount: number;
  regionKey?: string | null;
  regionLabel?: string | null;
};

export type FooterAnalyticsNode = RegionMeta & {
  uniqueVisitors: number;
  totalVisits: number;
  lastSeenAt: Date;
};

export type FooterAnalytics = {
  launchedAt: Date;
  daysOnline: number;
  uniqueVisitors: number;
  totalVisits: number;
  activeRegions: number;
  nodes: FooterAnalyticsNode[];
};

const REGION_META: Record<VisitorRegionKey, RegionMeta> = {
  "north-america": { key: "north-america", label: "North America", x: 18, y: 30 },
  "south-america": { key: "south-america", label: "South America", x: 31, y: 66 },
  europe: { key: "europe", label: "Europe", x: 49, y: 27 },
  africa: { key: "africa", label: "Africa", x: 50, y: 58 },
  "middle-east": { key: "middle-east", label: "Middle East", x: 58, y: 39 },
  "south-asia": { key: "south-asia", label: "South Asia", x: 66, y: 47 },
  "southeast-asia": { key: "southeast-asia", label: "Southeast Asia", x: 74, y: 54 },
  "east-asia": { key: "east-asia", label: "East Asia", x: 77, y: 35 },
  oceania: { key: "oceania", label: "Oceania", x: 84, y: 75 },
  unknown: { key: "unknown", label: "Other networks", x: 57, y: 17 },
};

const REGION_COUNTRY_GROUPS: Array<{ key: VisitorRegionKey; countries: string[] }> = [
  {
    key: "north-america",
    countries: ["US", "CA", "MX", "GL"],
  },
  {
    key: "south-america",
    countries: ["AR", "BO", "BR", "CL", "CO", "EC", "GY", "PE", "PY", "SR", "UY", "VE"],
  },
  {
    key: "europe",
    countries: [
      "AD",
      "AL",
      "AT",
      "BA",
      "BE",
      "BG",
      "BY",
      "CH",
      "CY",
      "CZ",
      "DE",
      "DK",
      "EE",
      "ES",
      "FI",
      "FR",
      "GB",
      "GR",
      "HR",
      "HU",
      "IE",
      "IS",
      "IT",
      "LT",
      "LU",
      "LV",
      "MC",
      "MD",
      "ME",
      "MK",
      "MT",
      "NL",
      "NO",
      "PL",
      "PT",
      "RO",
      "RS",
      "SE",
      "SI",
      "SK",
      "SM",
      "UA",
      "VA",
    ],
  },
  {
    key: "africa",
    countries: ["DZ", "EG", "ET", "GH", "KE", "MA", "NG", "RW", "TN", "TZ", "UG", "ZA"],
  },
  {
    key: "middle-east",
    countries: ["AE", "BH", "IL", "IQ", "IR", "JO", "KW", "LB", "OM", "PS", "QA", "SA", "SY", "TR", "YE"],
  },
  {
    key: "south-asia",
    countries: ["BD", "IN", "LK", "MV", "NP", "PK"],
  },
  {
    key: "southeast-asia",
    countries: ["BN", "ID", "KH", "LA", "MM", "MY", "PH", "SG", "TH", "TL", "VN"],
  },
  {
    key: "east-asia",
    countries: ["CN", "HK", "JP", "KR", "MN", "MO", "TW"],
  },
  {
    key: "oceania",
    countries: ["AU", "FJ", "GU", "NZ", "PG"],
  },
];

const SOUTH_AMERICA_TIMEZONES = [
  "America/Argentina",
  "America/Asuncion",
  "America/Bogota",
  "America/Caracas",
  "America/Guyana",
  "America/Lima",
  "America/Montevideo",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/La_Paz",
];

const MIDDLE_EAST_TIMEZONES = [
  "Asia/Amman",
  "Asia/Baghdad",
  "Asia/Baku",
  "Asia/Beirut",
  "Asia/Dubai",
  "Asia/Gaza",
  "Asia/Hebron",
  "Asia/Jerusalem",
  "Asia/Kuwait",
  "Asia/Muscat",
  "Asia/Qatar",
  "Asia/Riyadh",
  "Asia/Tehran",
  "Europe/Istanbul",
];

const SOUTH_ASIA_TIMEZONES = [
  "Asia/Colombo",
  "Asia/Dhaka",
  "Asia/Karachi",
  "Asia/Kathmandu",
  "Asia/Kolkata",
];

const SOUTHEAST_ASIA_TIMEZONES = [
  "Asia/Bangkok",
  "Asia/Brunei",
  "Asia/Ho_Chi_Minh",
  "Asia/Jakarta",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Phnom_Penh",
  "Asia/Pontianak",
  "Asia/Singapore",
  "Asia/Vientiane",
  "Asia/Yangon",
];

const EAST_ASIA_TIMEZONES = [
  "Asia/Hong_Kong",
  "Asia/Macau",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Ulaanbaatar",
];

function getDayDifferenceInclusive(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(1, Math.floor((endUtc - startUtc) / 86_400_000) + 1);
}

function getRegionByCountry(countryCode?: string | null) {
  const normalized = countryCode?.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  return REGION_COUNTRY_GROUPS.find((entry) => entry.countries.includes(normalized))?.key ?? null;
}

function getRegionByTimezone(timezone?: string | null): VisitorRegionKey {
  const normalized = timezone?.trim();

  if (!normalized) {
    return "unknown";
  }

  if (normalized.startsWith("Europe/")) {
    return "europe";
  }

  if (normalized.startsWith("Africa/")) {
    return "africa";
  }

  if (normalized.startsWith("Australia/") || normalized.startsWith("Pacific/")) {
    return "oceania";
  }

  if (SOUTH_AMERICA_TIMEZONES.some((entry) => normalized.startsWith(entry))) {
    return "south-america";
  }

  if (normalized.startsWith("America/")) {
    return "north-america";
  }

  if (MIDDLE_EAST_TIMEZONES.some((entry) => normalized.startsWith(entry))) {
    return "middle-east";
  }

  if (SOUTH_ASIA_TIMEZONES.some((entry) => normalized.startsWith(entry))) {
    return "south-asia";
  }

  if (SOUTHEAST_ASIA_TIMEZONES.some((entry) => normalized.startsWith(entry))) {
    return "southeast-asia";
  }

  if (EAST_ASIA_TIMEZONES.some((entry) => normalized.startsWith(entry))) {
    return "east-asia";
  }

  if (normalized.startsWith("Asia/")) {
    return "east-asia";
  }

  return "unknown";
}

export function getVisitorRegionMeta(regionKey?: string | null) {
  return REGION_META[(regionKey as VisitorRegionKey) || "unknown"] ?? REGION_META.unknown;
}

export function inferVisitorRegion(input: { countryCode?: string | null; timezone?: string | null }) {
  const byCountry = getRegionByCountry(input.countryCode);
  return getVisitorRegionMeta(byCountry ?? getRegionByTimezone(input.timezone));
}

export function hashVisitorIp(ipAddress: string) {
  const salt = process.env.SESSION_SECRET ?? process.env.APP_URL ?? "scholar-blog-studio";
  return createHash("sha256").update(`${salt}:${ipAddress}`).digest("hex").slice(0, 24);
}

export function extractClientIp(requestHeaders: Headers) {
  const directHeaders = [
    requestHeaders.get("cf-connecting-ip"),
    requestHeaders.get("x-real-ip"),
    requestHeaders.get("x-client-ip"),
    requestHeaders.get("true-client-ip"),
    requestHeaders.get("x-forwarded-for"),
  ];

  for (const value of directHeaders) {
    const candidate = value?.split(",")[0]?.trim();

    if (candidate) {
      return candidate;
    }
  }

  const forwarded = requestHeaders.get("forwarded");
  const match = forwarded?.match(/for=(?:"?)(\[[^\]]+\]|[^;,"]+)/i);
  return match?.[1]?.replace(/^\[/, "").replace(/\]$/, "") ?? null;
}

export function isBotUserAgent(userAgent?: string | null) {
  if (!userAgent) {
    return false;
  }

  return /bot|crawl|spider|slurp|preview|curl|wget|headless/i.test(userAgent);
}

export function getDemoFooterAnalytics(now = new Date()): FooterAnalytics {
  const launchedAt = new Date("2026-03-01T00:00:00+08:00");

  return {
    launchedAt,
    daysOnline: getDayDifferenceInclusive(launchedAt, now),
    uniqueVisitors: 184,
    totalVisits: 712,
    activeRegions: 6,
    nodes: [
      { ...REGION_META["east-asia"], uniqueVisitors: 82, totalVisits: 286, lastSeenAt: now },
      { ...REGION_META["north-america"], uniqueVisitors: 34, totalVisits: 138, lastSeenAt: now },
      { ...REGION_META.europe, uniqueVisitors: 29, totalVisits: 110, lastSeenAt: now },
      { ...REGION_META["southeast-asia"], uniqueVisitors: 17, totalVisits: 64, lastSeenAt: now },
      { ...REGION_META["south-asia"], uniqueVisitors: 12, totalVisits: 52, lastSeenAt: now },
      { ...REGION_META.oceania, uniqueVisitors: 10, totalVisits: 35, lastSeenAt: now },
    ],
  };
}

export function buildFooterAnalytics(visitors: VisitorSnapshot[], launchedAt: Date, now = new Date()) {
  const regionMap = new Map<VisitorRegionKey, FooterAnalyticsNode>();
  let totalVisits = 0;

  for (const visitor of visitors) {
    const meta = getVisitorRegionMeta(visitor.regionKey);
    const current = regionMap.get(meta.key) ?? {
      ...meta,
      uniqueVisitors: 0,
      totalVisits: 0,
      lastSeenAt: visitor.lastSeenAt,
    };

    current.uniqueVisitors += 1;
    current.totalVisits += visitor.visitCount;
    current.lastSeenAt = current.lastSeenAt > visitor.lastSeenAt ? current.lastSeenAt : visitor.lastSeenAt;
    regionMap.set(meta.key, current);
    totalVisits += visitor.visitCount;
  }

  const nodes = [...regionMap.values()].sort((left, right) => {
    if (right.uniqueVisitors !== left.uniqueVisitors) {
      return right.uniqueVisitors - left.uniqueVisitors;
    }

    return right.totalVisits - left.totalVisits;
  });

  return {
    launchedAt,
    daysOnline: getDayDifferenceInclusive(launchedAt, now),
    uniqueVisitors: visitors.length,
    totalVisits,
    activeRegions: nodes.length,
    nodes,
  } satisfies FooterAnalytics;
}
