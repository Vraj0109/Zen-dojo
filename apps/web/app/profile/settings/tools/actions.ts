"use server";

import { refresh } from "next/cache";
import { dismissToolsNotice } from "./notice-state";

export async function dismissToolsNoticeAction(): Promise<void> {
  await dismissToolsNotice();
  refresh();
}
