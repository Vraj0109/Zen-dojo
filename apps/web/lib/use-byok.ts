"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseByok, readByokRaw, subscribeByok, type ByokConfig } from "./ai-key-store";

/** The saved key config for this browser (null on the server and while there is none). Updates when it is saved or forgotten. */
export function useByok(): ByokConfig | null {
  const raw = useSyncExternalStore(subscribeByok, readByokRaw, () => null);
  return useMemo(() => parseByok(raw), [raw]);
}
