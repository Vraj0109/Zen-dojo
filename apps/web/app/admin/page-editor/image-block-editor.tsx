"use client";

import { useState } from "react";
import type { BlockRow } from "@habit/shared";
import { uploadAssetAction } from "./actions";

export function ImageBlockEditor({
  block,
  onChange,
}: {
  block: BlockRow;
  onChange: (updates: Partial<BlockRow>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError("Image must be smaller than 1 MB.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadAssetAction(fd);
      if (res.ok) {
        onChange({ assetId: (res as { id: string }).id });
      } else {
        setError((res as { error: string }).error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const assetUrl = block.assetId ? `/api/content/assets/${block.assetId}` : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Upload Image (PNG, JPEG, WebP up to 1 MB)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-xs text-muted file:mr-2 file:rounded file:border-0 file:bg-surface file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-accent/20"
            />
            {uploading && <p className="mt-1 text-xs text-muted">Uploading...</p>}
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Asset ID (or enter existing sha256 id)
            </label>
            <input
              type="text"
              value={block.assetId ?? ""}
              onChange={(e) => onChange({ assetId: e.target.value || null })}
              placeholder="e.g. 8f4a123b..."
              className="w-full rounded-md border border-line bg-surface/50 px-3 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Alt text <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={block.body ?? ""}
              onChange={(e) => onChange({ body: e.target.value })}
              placeholder="Describe image for accessibility..."
              className="w-full rounded-md border border-line bg-surface/50 px-3 py-1.5 text-xs focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Caption (optional)</label>
            <input
              type="text"
              value={block.caption ?? ""}
              onChange={(e) => onChange({ caption: e.target.value || null })}
              placeholder="Image caption..."
              className="w-full rounded-md border border-line bg-surface/50 px-3 py-1.5 text-xs focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-md border border-line bg-surface/20 p-3 min-h-[8rem]">
          {assetUrl ? (
            <figure className="space-y-1 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl}
                alt={block.body ?? "Image preview"}
                className="max-h-48 max-w-full rounded border border-line object-contain"
              />
              {block.caption && <figcaption className="text-xs text-muted">{block.caption}</figcaption>}
            </figure>
          ) : (
            <span className="text-xs italic text-muted">Image preview</span>
          )}
        </div>
      </div>
    </div>
  );
}
