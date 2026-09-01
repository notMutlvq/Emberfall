/* Username + password auth on top of Supabase Auth (which is email-based).
 *
 * The synthetic email is derived purely from the username, client-side —
 * `<username>@<SYNTH_DOMAIN>` — so login needs no lookup and no email is
 * ever stored or sent. Nothing is delivered to SYNTH_DOMAIN; it only has
 * to be a syntactically valid host. Supabase must have "Confirm email"
 * turned OFF (Authentication -> Providers -> Email).
 */
import { supabase } from "./supabase.ts";
import { t } from "../i18n/index.ts";

const SYNTH_DOMAIN = "players.emberfall.app";
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const MIN_PASSWORD = 6;

export function normalizeUsername(raw: string): string {
  return raw.normalize("NFKC").trim().toLowerCase();
}
export function usernameError(u: string): string | null {
  if (u.length < 3) return t("errUserShort");
  if (u.length > 20) return t("errUserLong");
  if (!USERNAME_RE.test(u)) return t("errUserChars");
  return null;
}
export function passwordError(p: string): string | null {
  return p.length < MIN_PASSWORD ? t("errPassShort", { min: MIN_PASSWORD }) : null;
}
function emailFor(username: string): string {
  return `${username}@${SYNTH_DOMAIN}`;
}

export interface Profile {
  id: string;
  username: string;
}

export type AuthResult = { ok: true; profile: Profile } | { ok: false; error: string };

export async function currentProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("id, username").eq("id", user.id).maybeSingle();
  if (data) return { id: data.id, username: String(data.username) };
  const metaName = (user.user_metadata as { username?: string } | null)?.username;
  return { id: user.id, username: metaName ?? "?" };
}

export async function usernameTaken(username: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  return !!data;
}

export async function signUp(usernameRaw: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: t("errOffline") };
  const username = normalizeUsername(usernameRaw);
  const ue = usernameError(username);
  if (ue) return { ok: false, error: ue };
  const pe = passwordError(password);
  if (pe) return { ok: false, error: pe };

  if (await usernameTaken(username)) return { ok: false, error: t("errUserTaken") };

  const { data, error } = await supabase.auth.signUp({
    email: emailFor(username),
    password,
    options: { data: { username } },
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already registered") || m.includes("database error saving")) {
      return { ok: false, error: t("errUserTaken") };
    }
    return { ok: false, error: error.message };
  }
  if (!data.session) {
    return { ok: false, error: t("errNoSession") };
  }
  return { ok: true, profile: { id: data.user!.id, username } };
}

export async function signIn(usernameRaw: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: t("errOffline") };
  const username = normalizeUsername(usernameRaw);
  if (!username || !password) return { ok: false, error: t("errEnterBoth") };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailFor(username),
    password,
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("invalid login")) return { ok: false, error: t("errWrongLogin") };
    return { ok: false, error: error.message };
  }
  return { ok: true, profile: { id: data.user.id, username } };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
