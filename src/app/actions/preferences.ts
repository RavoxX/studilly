"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  type Locale,
} from "@/i18n/config";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, isTheme, type Theme } from "@/lib/theme";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Interface preferences.
 *
 * Both are stored in a cookie so the server can resolve them before the first
 * paint, and mirrored onto the profile when the user is signed in so the
 * choice follows them to another device.
 *
 * Neither preference affects the language of academic content: a German
 * interface with English learning material is a supported combination, and
 * content language is detected per material.
 */

const COOKIE_OPTIONS = {
  httpOnly: false as const,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function setLocale(value: string): Promise<void> {
  if (!isLocale(value)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, value, {
    ...COOKIE_OPTIONS,
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });

  const user = await getUser();
  if (user) {
    const supabase = await createClient();
    // RLS restricts this to the caller's own row.
    await supabase
      .from("profiles")
      .update({ ui_locale: value as Locale })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
}

export async function setTheme(value: string): Promise<void> {
  if (!isTheme(value)) return;

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, value, {
    ...COOKIE_OPTIONS,
    maxAge: THEME_COOKIE_MAX_AGE,
  });

  const user = await getUser();
  if (user) {
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({ theme: value as Theme })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
}
