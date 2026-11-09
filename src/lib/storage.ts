import {
  AppTheme,
  Athlete,
  AuthSession,
  CardValidityStatus,
  GymDatabase,
  WorkoutCard,
  WorkoutSessionLog,
} from "@/types/gym";
import { INITIAL_GYM_DATA } from "./initialData";

const STORAGE_KEY = "palestra_schede_db_v1";
const AUTH_STORAGE_KEY = "palestra_auth_session_v1";
const THEME_STORAGE_KEY = "palestra_theme_v1";
const MIGRATION_DONE_KEY = "palestra_cloud_migrated_v1";
const PENDING_SYNC_KEY = "palestra_pending_cloud_sync_v1";

export type CloudSyncStatus = "syncing" | "synced" | "pending_local" | "error";

export interface CloudSyncState {
  status: CloudSyncStatus;
  message: string;
  hasPendingLocalChanges: boolean;
  lastSyncedAt: string | null;
}

type SyncListener = (state: CloudSyncState) => void;
const syncListeners = new Set<SyncListener>();

let currentSyncState: CloudSyncState = {
  status: "syncing",
  message: "Connessione al database Cloud in corso...",
  hasPendingLocalChanges: false,
  lastSyncedAt: null,
};

function notifySyncListeners(partial: Partial<CloudSyncState>) {
  currentSyncState = { ...currentSyncState, ...partial };
  syncListeners.forEach((listener) => listener(currentSyncState));
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(currentSyncState);
  return () => {
    syncListeners.delete(listener);
  };
}

function markPendingLocalSync(isPending: boolean) {
  if (typeof window === "undefined") return;
  if (isPending) {
    window.localStorage.setItem(PENDING_SYNC_KEY, "true");
  } else {
    window.localStorage.removeItem(PENDING_SYNC_KEY);
    window.localStorage.setItem(MIGRATION_DONE_KEY, "true");
  }
}

export function hasUnmigratedOrPendingLocalData(): boolean {
  if (typeof window === "undefined") return false;
  const rawLocal = window.localStorage.getItem(STORAGE_KEY);
  if (!rawLocal) return false;
  const migrated = window.localStorage.getItem(MIGRATION_DONE_KEY) === "true";
  const pending = window.localStorage.getItem(PENDING_SYNC_KEY) === "true";
  return !migrated || pending;
}

function mergeTwoLogs(
  baseLog: WorkoutSessionLog,
  incomingLog: WorkoutSessionLog
): WorkoutSessionLog {
  const weightsByExercise: Record<string, string> = {
    ...(baseLog.weightsByExercise || {}),
  };
  for (const [exId, val] of Object.entries(
    incomingLog.weightsByExercise || {}
  )) {
    if (val && val.trim() !== "") {
      weightsByExercise[exId] = val;
    }
  }

  const weights2ByExercise: Record<string, string> = {
    ...(baseLog.weights2ByExercise || {}),
  };
  for (const [exId, val] of Object.entries(
    incomingLog.weights2ByExercise || {}
  )) {
    if (val && val.trim() !== "") {
      weights2ByExercise[exId] = val;
    }
  }

  const setsByExercise: Record<string, number> = {
    ...(baseLog.setsByExercise || {}),
  };
  for (const [exId, val] of Object.entries(incomingLog.setsByExercise || {})) {
    const prev = setsByExercise[exId] ?? 0;
    if (typeof val === "number" && (val > 0 || prev === 0)) {
      setsByExercise[exId] = Math.max(prev, val);
    }
  }

  const repsByExercise: Record<string, number> = {
    ...(baseLog.repsByExercise || {}),
  };
  for (const [exId, val] of Object.entries(incomingLog.repsByExercise || {})) {
    if (typeof val === "number" && val > 0) {
      repsByExercise[exId] = val;
    }
  }

  const reps2ByExercise: Record<string, number> = {
    ...(baseLog.reps2ByExercise || {}),
  };
  for (const [exId, val] of Object.entries(
    incomingLog.reps2ByExercise || {}
  )) {
    if (typeof val === "number" && val > 0) {
      reps2ByExercise[exId] = val;
    }
  }

  return {
    ...baseLog,
    weightsByExercise,
    weights2ByExercise,
    setsByExercise,
    repsByExercise,
    reps2ByExercise,
    notes: incomingLog.notes?.trim() ? incomingLog.notes : baseLog.notes,
  };
}

export function mergeGymDatabasesClient(
  remoteDb: GymDatabase,
  localDb: GymDatabase
): GymDatabase {
  const athleteMap = new Map<string, Athlete>();
  for (const a of remoteDb.athletes || []) athleteMap.set(a.id, a);
  for (const a of localDb.athletes || []) {
    const prev = athleteMap.get(a.id);
    athleteMap.set(a.id, prev ? { ...prev, ...a } : a);
  }

  const cardMap = new Map<string, WorkoutCard>();
  for (const c of remoteDb.cards || []) cardMap.set(c.id, c);
  for (const c of localDb.cards || []) {
    if (!athleteMap.has(c.athleteId)) continue;
    const prev = cardMap.get(c.id);
    if (!prev) {
      cardMap.set(c.id, c);
    } else {
      const prevExCount = prev.days.reduce(
        (acc, d) => acc + d.exercises.length,
        0
      );
      const localExCount = (c.days || []).reduce(
        (acc, d) => acc + d.exercises.length,
        0
      );
      cardMap.set(c.id, {
        ...prev,
        ...c,
        days: localExCount >= prevExCount ? c.days : prev.days,
      });
    }
  }

  const logMap = new Map<string, WorkoutSessionLog>();
  for (const l of remoteDb.logs || []) {
    logMap.set(`${l.cardId}__${l.dayId}__${l.date}`, l);
  }
  for (const l of localDb.logs || []) {
    if (!cardMap.has(l.cardId) || !athleteMap.has(l.athleteId)) continue;
    const key = `${l.cardId}__${l.dayId}__${l.date}`;
    const prev = logMap.get(key);
    logMap.set(key, prev ? mergeTwoLogs(prev, l) : l);
  }

  return {
    athletes: Array.from(athleteMap.values()),
    cards: Array.from(cardMap.values()),
    logs: Array.from(logMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
  };
}

/**
 * Sincronizza i dati all'avvio o su richiesta:
 * - Se il dispositivo ha dati salvati in localStorage non ancora migrati (o modifiche fatte offline),
 *   esegue "merge_db" sul server PostgreSQL così NESSUN dato del dispositivo viene perso o sovrascritto.
 * - Altrimenti scarica i dati aggiornati in tempo reale dal database PostgreSQL.
 */
export async function syncAndMergeWithCloud(): Promise<GymDatabase> {
  const localDb = loadGymDatabase();
  const needsMergeFromDevice = hasUnmigratedOrPendingLocalData();

  notifySyncListeners({
    status: "syncing",
    message: needsMergeFromDevice
      ? "Unione dati del dispositivo col database Cloud..."
      : "Lettura dati aggiornati dal database Cloud...",
    hasPendingLocalChanges: needsMergeFromDevice,
  });

  try {
    if (needsMergeFromDevice) {
      const res = await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge_db", db: localDb }),
        cache: "no-store",
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errBody.error || `Errore sincronizzazione DB (HTTP ${res.status})`
        );
      }
      const mergedDb = (await res.json()) as GymDatabase;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedDb));
      }
      markPendingLocalSync(false);
      const nowTime = new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      notifySyncListeners({
        status: "synced",
        message: `Dati del dispositivo salvati nel DB Cloud (${nowTime})`,
        hasPendingLocalChanges: false,
        lastSyncedAt: nowTime,
      });
      return mergedDb;
    } else {
      const res = await fetch("/api/gym", { cache: "no-store" });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errBody.error || `Errore lettura DB (HTTP ${res.status})`
        );
      }
      const remoteDb = (await res.json()) as GymDatabase;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteDb));
      }
      const nowTime = new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      notifySyncListeners({
        status: "synced",
        message: `Connesso al DB Cloud (${nowTime})`,
        hasPendingLocalChanges: false,
        lastSyncedAt: nowTime,
      });
      return remoteDb;
    }
  } catch (err) {
    const errMsg =
      err instanceof Error ? err.message : "Database Cloud non raggiungibile";
    notifySyncListeners({
      status: "error",
      message: `${errMsg} — Dati protetti sul dispositivo`,
      hasPendingLocalChanges: true,
    });
    throw err;
  }
}

export async function forceMergeLocalToCloud(
  currentDb: GymDatabase
): Promise<GymDatabase> {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentDb));
  }
  markPendingLocalSync(true);
  return syncAndMergeWithCloud();
}

export async function fetchGymDatabaseFromApi(): Promise<GymDatabase> {
  return syncAndMergeWithCloud();
}

let fullSyncTimer: ReturnType<typeof setTimeout> | null = null;

export function syncGymDatabaseToApi(db: GymDatabase): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
  markPendingLocalSync(true);
  notifySyncListeners({
    status: "syncing",
    message: "Salvataggio nel DB Cloud in corso...",
    hasPendingLocalChanges: true,
  });

  if (fullSyncTimer) clearTimeout(fullSyncTimer);
  fullSyncTimer = setTimeout(async () => {
    try {
      const res = await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errBody.error || `Salvataggio DB fallito (HTTP ${res.status})`
        );
      }
      markPendingLocalSync(false);
      const nowTime = new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      notifySyncListeners({
        status: "synced",
        message: `Salvato nel DB Cloud (${nowTime})`,
        hasPendingLocalChanges: false,
        lastSyncedAt: nowTime,
      });
    } catch (err) {
      console.error("Errore sync DB:", err);
      const errMsg =
        err instanceof Error ? err.message : "Errore salvataggio Cloud";
      notifySyncListeners({
        status: "error",
        message: `${errMsg} — Salvato sul dispositivo`,
        hasPendingLocalChanges: true,
      });
    }
  }, 150);
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
  markPendingLocalSync(true);
  notifySyncListeners({
    status: "syncing",
    message: "Salvataggio serie/carico nel Cloud...",
    hasPendingLocalChanges: true,
  });

  const key = `${log.cardId}_${log.dayId}_${log.date}`;
  if (logTimers[key]) clearTimeout(logTimers[key]);
  logTimers[key] = setTimeout(async () => {
    try {
      const res = await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upsert_log", log }),
      });

      if (!res.ok) {
        // Se la scheda o l'atleta erano stati creati offline e mancano nel DB, esegue un merge completo
        const fallbackRes = await fetch("/api/gym", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "merge_db",
            db: fullDbForLocalCache,
          }),
        });
        if (!fallbackRes.ok) {
          const errBody = (await fallbackRes.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            errBody.error ||
              `Salvataggio allenamento fallito (HTTP ${fallbackRes.status})`
          );
        }
      }

      markPendingLocalSync(false);
      const nowTime = new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      notifySyncListeners({
        status: "synced",
        message: `Allenamento salvato nel Cloud (${nowTime})`,
        hasPendingLocalChanges: false,
        lastSyncedAt: nowTime,
      });
    } catch (err) {
      console.error("Errore upsert log:", err);
      const errMsg =
        err instanceof Error ? err.message : "Errore salvataggio Cloud";
      notifySyncListeners({
        status: "error",
        message: `${errMsg} — Salvato sul dispositivo`,
        hasPendingLocalChanges: true,
      });
    }
  }, 120);
}

export async function resetDatabaseViaApi(): Promise<GymDatabase> {
  const res = await fetch("/api/gym", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reset_demo" }),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(
      body.error ||
        `Ripristino del database PostgreSQL non riuscito (HTTP ${res.status}).`
    );
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
