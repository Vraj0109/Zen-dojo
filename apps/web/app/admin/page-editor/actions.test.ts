import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadAssetAction } from "./actions";
import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";
import { mintAdminProof } from "@/lib/auth/admin-proof";
import { detectMimeType } from "@/app/api/admin/content/assets/route";

vi.mock("@/lib/auth/admin", () => ({
  AdminDeniedError: class AdminDeniedError extends Error {
    constructor(message = "Not allowed.") {
      super(message);
      this.name = "AdminDeniedError";
    }
  },
  requireAdminAction: vi.fn(),
}));

const mockAdminProof = mintAdminProof("admin-1", "Admin User");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdminAction).mockResolvedValue(mockAdminProof as never);
});

describe("uploadAssetAction", () => {
  it("refuses non-admins with 'Not allowed.'", async () => {
    vi.mocked(requireAdminAction).mockRejectedValueOnce(new AdminDeniedError());

    const fd = new FormData();
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
      type: "image/png",
    });
    fd.set("file", blob, "test.png");

    const res = await uploadAssetAction(fd);
    expect(res).toEqual({ ok: false, error: "Not allowed." });
  });

  it("refuses files over 1 MB", async () => {
    const fd = new FormData();
    // 1 MB + 10 bytes
    const largeBuf = new Uint8Array(1024 * 1024 + 10);
    const blob = new Blob([largeBuf], { type: "image/png" });
    fd.set("file", blob, "large.png");

    const res = await uploadAssetAction(fd);
    expect(res).toEqual({ ok: false, error: "Image is larger than 1 MB." });
  });

  it("refuses SVG files", async () => {
    const fd = new FormData();
    const svgContent = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><circle /></svg>');
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    fd.set("file", blob, "diagram.svg");

    const res = await uploadAssetAction(fd);
    expect(res).toEqual({
      ok: false,
      error: "SVG images are not allowed (use a Mermaid diagram for vector drawings).",
    });
  });

  it("takes the type from the bytes (JPEG named .png is detected as image/jpeg)", () => {
    // JPEG header: FF D8 FF
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    expect(detectMimeType(jpegBytes)).toBe("image/jpeg");

    // PNG header: 89 50 4E 47 0D 0A 1A 0A
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectMimeType(pngBytes)).toBe("image/png");

    // WebP header: RIFF .... WEBP
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectMimeType(webpBytes)).toBe("image/webp");

    // Unknown bytes
    const unknownBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    expect(detectMimeType(unknownBytes)).toBeNull();
  });
});
