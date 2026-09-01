/* Login / register screen. Self-wires its own controls (not through the
 * in-game tap dispatcher). Calls onSuccess(profile) once signed in.
 */
import { $ } from "../game/core.ts";
import { signIn, signUp, usernameError, passwordError, normalizeUsername, type Profile } from "../net/auth.ts";

type Mode = "login" | "signup";
let mode: Mode = "login";
let busy = false;
let onDone: ((p: Profile) => void) | null = null;

export function initAuth(onSuccess: (p: Profile) => void): void {
  onDone = onSuccess;
  document.querySelectorAll<HTMLElement>("[data-authtab]").forEach((t) => {
    t.addEventListener("click", () => setMode(t.dataset.authtab as Mode));
  });
  $("authgo").addEventListener("click", () => void submit());
  const onEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") void submit();
  };
  ($("authuser") as HTMLInputElement).addEventListener("keydown", onEnter);
  ($("authpass") as HTMLInputElement).addEventListener("keydown", onEnter);
  setMode("login");
}

function setMode(m: Mode): void {
  mode = m;
  document.querySelectorAll<HTMLElement>("[data-authtab]").forEach((t) => t.classList.toggle("on", t.dataset.authtab === m));
  $("authgo").textContent = m === "login" ? "Log in" : "Create account";
  ($("authpass") as HTMLInputElement).autocomplete = m === "login" ? "current-password" : "new-password";
  ($("authwarn") as HTMLElement).style.display = m === "signup" ? "block" : "none";
  $("autherr").textContent = "";
}

function err(msg: string): void {
  $("autherr").textContent = msg;
}

function setBusy(b: boolean): void {
  busy = b;
  ($("authgo") as HTMLButtonElement).disabled = b;
  $("authgo").textContent = b ? "…" : mode === "login" ? "Log in" : "Create account";
}

async function submit(): Promise<void> {
  if (busy) return;
  const username = normalizeUsername(($("authuser") as HTMLInputElement).value);
  const password = ($("authpass") as HTMLInputElement).value;

  const ue = usernameError(username);
  if (ue) return err(ue);
  const pe = passwordError(password);
  if (pe) return err(pe);
  err("");

  setBusy(true);
  const res = mode === "login" ? await signIn(username, password) : await signUp(username, password);
  setBusy(false);

  if (!res.ok) {
    err(res.error);
    return;
  }
  ($("authpass") as HTMLInputElement).value = "";
  onDone?.(res.profile);
}
