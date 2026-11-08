"use client";

import { useEffect } from "react";
import { CUSTOM_FONT_KEY, parseCustomFont } from "@/lib/custom";
import { loadFontFile, registerFont } from "@/lib/font-store";

/** Puts an uploaded font (kept in this browser) back in use on every page load. Renders nothing. */
export function CustomFontLoader() {
  useEffect(() => {
    let font = null;
    try {
      font = parseCustomFont(localStorage.getItem(CUSTOM_FONT_KEY));
    } catch {
      return;
    }
    if (!font || font.source !== "file") return;
    const family = font.family;
    loadFontFile()
      .then((data) => (data ? registerFont(family, data) : undefined))
      .catch(() => {
        // The font file is gone or broken: the page keeps its normal font.
      });
  }, []);
  return null;
}
