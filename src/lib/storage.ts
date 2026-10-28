import { AppTheme, AuthSession, CardValidityStatus, GymDatabase, WorkoutCard, WorkoutSessionLog } from "@/types/gym";
import { INITIAL_GYM_DATA } from "./initialData";

const STORAGE_KEY = "palestra_schede_db_v1";
const AUTH_STORAGE_KEY = "palestra_auth_session_v1";
const THEME_STORAGE_KEY = "palestra_theme_v1";

export async function fetchGymDatabaseFromApi(): Promise<GymDatabase> {
  const res = await fetch("/api/gym", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Errore caricamento dal database PostgreSQL");
  }
  const data = (await res.json()) as GymDatabase;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  return data;
}

let fullSyncTimer: ReturnType<typeof setTimeout> | null = null;

export function syncGymDatabaseToApi(db: GymDatabase): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
  if (fullSyncTimer) clearTimeout(fullSyncTimer);
  fullSyncTimer = setTimeout(() => {
    fetch("/api/gym", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ db }),
    }).catch((err) => console.error("Errore sync DB:", err));
  }, 250);
}

const logTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export function upsertWorkoutLogToApi(
  log: WorkoutSessionLog,
  fullDbForLocalCache: GymDatabase
): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(fullDbForLocalCache)
    );
  }
  const key = `${log.cardId}_${log.dayId}_${log.date}`;
  if (logTimers[key]) clearTimeout(logTimers[key]);
  logTimers[key] = setTimeout(() => {
    fetch("/api/gym", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert_log", log }),
    }).catch((err) => console.error("Errore upsert log:", err));
  }, 200);
}

export async function resetDatabaseViaApi(): Promise<GymDatabase> {
  const res = await fetch("/api/gym", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reset_demo" }),
  });
  if (!res.ok) {
    return resetToInitialDatabase();
  }
  const fresh = (await res.json()) as GymDatabase;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }
  return fresh;
}

export function loadTheme(): AppTheme {
  if (typeof window === "undefined") return "dark";
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "light" || raw === "metallic" || raw === "dark") {
    return raw;
  }
  return "dark";
}

export function applyThemeToDocument(theme: AppTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function saveTheme(theme: AppTheme): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  applyThemeToDocument(theme);
}

export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed || (parsed.role !== "trainer" && parsed.role !== "athlete")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function loadGymDatabase(): GymDatabase {
  if (typeof window === "undefined") {
    return INITIAL_GYM_DATA;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_GYM_DATA));
      return INITIAL_GYM_DATA;
    }
    const parsed = JSON.parse(raw) as GymDatabase;
    if (!parsed.athletes || !parsed.cards) {
      return INITIAL_GYM_DATA;
    }
    return {
      athletes: parsed.athletes,
      cards: parsed.cards,
      logs: parsed.logs || [],
    };
  } catch {
    return INITIAL_GYM_DATA;
  }
}

export function saveGymDatabase(db: GymDatabase): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetToInitialDatabase(): GymDatabase {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_GYM_DATA));
  }
  return INITIAL_GYM_DATA;
}

export function getCardStatus(
  card: WorkoutCard,
  referenceDate: Date = new Date()
): {
  status: CardValidityStatus;
  label: string;
  daysLeft: number;
} {
  if (card.archived) {
    return { status: "archived", label: "Archiviata", daysLeft: 0 };
  }

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const start = new Date(card.validFrom + "T00:00:00");
  const end = new Date(card.validTo + "T00:00:00");

  const diffFromEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const diffFromStart = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffFromStart > 0) {
    return {
      status: "upcoming",
      label: `Inizia tra ${diffFromStart} gg`,
      daysLeft: diffFromEnd,
    };
  }

  if (diffFromEnd < 0) {
    return {
      status: "expired",
      label: `Scaduta da ${Math.abs(diffFromEnd)} gg`,
      daysLeft: diffFromEnd,
    };
  }

  if (diffFromEnd <= 7) {
    return {
      status: "expiring",
      label: diffFromEnd === 0 ? "Scade oggi" : `In scadenza (${diffFromEnd} gg)`,
      daysLeft: diffFromEnd,
    };
  }

  return {
    status: "active",
    label: `Attiva (${diffFromEnd} gg rimasti)`,
    daysLeft: diffFromEnd,
  };
}

export function formatItalianDate(isoDate: string): string {
  if (!isoDate) return "-";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
