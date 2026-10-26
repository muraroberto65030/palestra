import { CardValidityStatus, GymDatabase, WorkoutCard } from "@/types/gym";
import { INITIAL_GYM_DATA } from "./initialData";

const STORAGE_KEY = "palestra_schede_db_v1";

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
