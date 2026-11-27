"use server";

import { AdminDeniedError, requireAdminAction } from "@/lib/auth/admin";
import { uploadAssetAction as baseUploadAssetAction } from "../actions";

export async function uploadAssetAction(formData: FormData) {
  try {
    await requireAdminAction();
    return await baseUploadAssetAction(formData);
  } catch (e) {
    if (e instanceof AdminDeniedError) return { ok: false, error: "Not allowed." };
    throw e;
  }
}
