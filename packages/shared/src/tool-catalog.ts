// Portable tools the desktop app can download on request (plan 0064). Pure data and checks, no I/O.
//
// Checked 2026-11-11 against the official release pages. Pins are exact; never use "latest".
//  - Java: Eclipse Temurin 17.0.21+9 JDK, api.adoptium.net / github.com/adoptium/temurin17-binaries.
//  - Python: python-build-standalone 20261110, CPython 3.12.16 "install_only" builds, github.com/astral-sh/python-build-standalone.
//  - C++ (Windows only): WinLibs GCC 16.2.0 + MinGW-w64 14.0.0 (UCRT, POSIX threads, SEH, no LLVM), github.com/brechtsanders/winlibs_mingw.
//  - C++ on macOS (xcode-select) and Linux (distribution package) is not downloaded.
// sha256 of the three Windows files was computed from the downloaded files on 2026-11-11 and matches the publisher's value.
// The other platforms use the checksum the publisher lists for that exact file (Adoptium API, GitHub release digest); the
// GitHub Actions workflow tools-smoke.yml downloads and verifies each of them on its own runner.
// `diskBytes` is the unpacked size: measured for the Windows files, a rounded estimate for the others.

export type ManagedToolId = "java" | "python" | "cpp";
export const MANAGED_TOOL_IDS: readonly ManagedToolId[] = ["java", "python", "cpp"];

export type PlatformKey = "win32-x64" | "darwin-arm64" | "darwin-x64" | "linux-x64" | "linux-arm64";
export const PLATFORM_KEYS: readonly PlatformKey[] = ["win32-x64", "darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64"];

export type ArchiveType = "zip" | "tar.gz" | "tar.xz";

export interface CatalogEntry {
  version: string;
  url: string;
  /** Lowercase hex SHA-256 of the file at `url` */
  sha256: string;
  /** Exact download size in bytes */
  bytes: number;
  /** Approximate unpacked size in bytes (shown before the download starts) */
  diskBytes: number;
  archive: ArchiveType;
  /** Folder inside the install folder that holds the programs (forward slashes) */
  binDir: string;
  license: string;
  /** Who publishes it, for the confirmation text */
  source: string;
}

export type ToolCatalog = Record<ManagedToolId, Partial<Record<PlatformKey, CatalogEntry>>>;

const ADOPTIUM = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.21%2B9/";
const PBS = "https://github.com/astral-sh/python-build-standalone/releases/download/20261110/";
const MB = 1024 * 1024;

function java(file: string, sha256: string, bytes: number, archive: ArchiveType, binDir: string): CatalogEntry {
  return {
    version: "17.0.21+9",
    url: ADOPTIUM + file,
    sha256,
    bytes,
    diskBytes: 320 * MB,
    archive,
    binDir,
    license: "GPLv2 with Classpath Exception",
    source: "Eclipse Adoptium (Temurin JDK 17)",
  };
}

function python(target: string, sha256: string, bytes: number, binDir: string, diskBytes: number): CatalogEntry {
  return {
    version: "3.12.16",
    url: `${PBS}cpython-3.12.16%2B20261110-${target}-install_only.tar.gz`,
    sha256,
    bytes,
    diskBytes,
    archive: "tar.gz",
    binDir,
    license: "Python Software Foundation License",
    source: "python-build-standalone (Astral)",
  };
}

export const TOOL_CATALOG: ToolCatalog = {
  java: {
    "win32-x64": { ...java("OpenJDK17U-jdk_x64_windows_hotspot_17.0.21_9.zip", "98518ecf554465057ee5509462631deeee374bc368c12a411d225cd29381f84b", 191117380, "zip", "jdk-17.0.21+9/bin"), diskBytes: 318034993 },
    "darwin-arm64": java("OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.21_9.tar.gz", "78b08c7f5a0598242d5719c022e19479cb4a3aa45c37c19726a757a469ed1c15", 186192554, "tar.gz", "jdk-17.0.21+9/Contents/Home/bin"),
    "darwin-x64": java("OpenJDK17U-jdk_x64_mac_hotspot_17.0.21_9.tar.gz", "868f5c672b3389fdbe48e44f94ae170f01668b1401360944fc7159d7cc9772cc", 180879475, "tar.gz", "jdk-17.0.21+9/Contents/Home/bin"),
    "linux-x64": java("OpenJDK17U-jdk_x64_linux_hotspot_17.0.21_9.tar.gz", "8b9b611d917e3dfd8419d3566b5949226f69b052fed7e109c1368add1dfe8711", 193594705, "tar.gz", "jdk-17.0.21+9/bin"),
    "linux-arm64": java("OpenJDK17U-jdk_aarch64_linux_hotspot_17.0.21_9.tar.gz", "3e4eca7ead088f080af1476007decf010a240a1eb4e1e78c54fa32fbcc347084", 192336814, "tar.gz", "jdk-17.0.21+9/bin"),
  },
  python: {
    "win32-x64": python("x86_64-pc-windows-msvc", "e23fe5b16926de1d81661b1a97352e89fb167549c55a6825796ccd0f32ec7f1b", 47438699, "python", 151019584),
    "darwin-arm64": python("aarch64-apple-darwin", "e956e60bc9465d577ef8062059aa05cd3a2665b4b8678a2ed24e432368330b8f", 25371130, "python/bin", 100 * MB),
    "darwin-x64": python("x86_64-apple-darwin", "83f2922437e6d546d0fcdb8c11f150a8e52787e8d9ea8651b1974e20908eb1bc", 25078514, "python/bin", 100 * MB),
    "linux-x64": python("x86_64-unknown-linux-gnu", "c2f87d4b4e8db3abddb0f116c6ccfc503d0cbdbb9ee8faacddad1b679ec12e99", 68163679, "python/bin", 250 * MB),
    "linux-arm64": python("aarch64-unknown-linux-gnu", "4792f81750282597fb2a3389fe18b945ed2ba6aad5e45ad406d122c58cb33081", 53264815, "python/bin", 250 * MB),
  },
  cpp: {
    "win32-x64": {
      version: "GCC 16.2.0 (MinGW-w64 14.0.0, r3)",
      url: "https://github.com/brechtsanders/winlibs_mingw/releases/download/16.2.0posix-23.1.3-14.0.0-ucrt-r3/winlibs-x86_64-posix-seh-gcc-16.2.0-mingw-w64ucrt-14.0.0-r3.zip",
      sha256: "3c69305081e4a647144339a936244fcf7d3d9e558319e1ad7be2cd2886d4b6a1",
      bytes: 276414382,
      diskBytes: 968420940,
      archive: "zip",
      binDir: "mingw64/bin",
      license: "GPL with runtime exception (GCC), MinGW-w64 is permissive",
      source: "WinLibs (Brecht Sanders)",
    },
  },
};

/** Hosts GitHub (and Adoptium) redirect release downloads to. Checked on every redirect hop. */
export const REDIRECT_HOSTS: readonly string[] = [
  "github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
  "github-releases.githubusercontent.com",
  "api.adoptium.net",
];

/** At most this many redirects are followed. */
export const MAX_REDIRECTS = 3;

/** "win32-x64" and friends, or null for a platform nothing is offered for. */
export function platformKey(platform: string, arch: string): PlatformKey | null {
  const key = `${platform}-${arch}`;
  return (PLATFORM_KEYS as readonly string[]).includes(key) ? (key as PlatformKey) : null;
}

export function catalogEntry(id: ManagedToolId, key: PlatformKey | null, catalog: ToolCatalog = TOOL_CATALOG): CatalogEntry | null {
  if (!key) return null;
  return catalog[id]?.[key] ?? null;
}

/** Hosts a download of this entry may touch: its own host plus the redirect hosts. */
export function allowedHosts(entry: CatalogEntry): string[] {
  const own = new URL(entry.url).hostname.toLowerCase();
  return [...new Set([own, ...REDIRECT_HOSTS])];
}

/** The largest download accepted: the catalogue size plus 5 percent. */
export function sizeCap(entry: CatalogEntry): number {
  return Math.ceil(entry.bytes * 1.05);
}

/** Problems with an entry (empty when it is fine). Used by the catalogue test and before every download. */
export function verifyPlan(entry: CatalogEntry): string[] {
  const problems: string[] = [];
  let url: URL | null = null;
  try {
    url = new URL(entry.url);
  } catch {
    problems.push("the url is not valid");
  }
  if (url && url.protocol !== "https:") problems.push("the url is not https");
  if (!/^[0-9a-f]{64}$/.test(entry.sha256)) problems.push("sha256 must be 64 lowercase hex characters");
  if (!Number.isInteger(entry.bytes) || entry.bytes <= 0) problems.push("bytes must be a positive whole number");
  if (!Number.isFinite(entry.diskBytes) || entry.diskBytes <= 0) problems.push("diskBytes must be positive");
  if (!["zip", "tar.gz", "tar.xz"].includes(entry.archive)) problems.push("unknown archive type");
  if (!entry.version) problems.push("version is empty");
  if (!entry.binDir || entry.binDir.startsWith("/") || entry.binDir.includes("..") || entry.binDir.includes("\\")) problems.push("binDir must be a safe relative path with forward slashes");
  if (url && /latest/i.test(url.pathname)) problems.push("the url must be pinned, not 'latest'");
  return problems;
}

/** Plain-language size, for example "182 MB". */
export function formatBytes(n: number): string {
  if (n >= 1024 * MB) return `${(n / (1024 * MB)).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(n / MB))} MB`;
}
