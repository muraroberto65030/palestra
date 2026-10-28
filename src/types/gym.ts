export type UserRole = "trainer" | "athlete";

export type AppTheme = "dark" | "light" | "metallic";

export interface AuthSession {
  role: UserRole;
  athleteId?: string;
  displayName: string;
  loggedInAt: string;
}

export interface Athlete {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  pin?: string; // PIN opzionale per accesso rapido atleta
  notes?: string;
  createdAt: string;
  active: boolean;
}

export interface ExerciseRow {
  id: string;
  name: string; // es. "Panca Piana", "Shoulder press + alzate laterali"
  setsReps: string; // S/R es. "4x8-10", "3\4x8+max"
  notes?: string;
}

export interface WorkoutDay {
  id: string;
  name: string; // es. "Giorno 1", "Giorno 2"
  exercises: ExerciseRow[];
}

/**
 * Rappresenta una colonna "Kg" compilata in una determinata data per un Giorno della scheda
 * (es. "30/9" su Giorno 1, "2/10" su Giorno 2 come nel foglio cartaceo)
 */
export interface WorkoutSessionLog {
  id: string;
  cardId: string;
  athleteId: string;
  dayId: string; // riferimento a WorkoutDay.id
  date: string; // YYYY-MM-DD
  /** Mappa exerciseId -> valore annotato nella casella Kg (es. "+15", "42,5+6", "70") */
  weightsByExercise: Record<string, string>;
  /** Mappa exerciseId -> numero di Serie effettuate nella sessione (es. 4) */
  setsByExercise?: Record<string, number>;
  /** Mappa exerciseId -> numero di Ripetizioni effettuate nella sessione (es. 10) */
  repsByExercise?: Record<string, number>;
  notes?: string;
}

export interface WorkoutCard {
  id: string;
  athleteId: string;
  title: string; // es. "Scheda Autunno - Ipertrofia / Forza"
  goal?: string; // es. "Ipertrofia multifrequenza 2 giorni"
  validFrom: string; // YYYY-MM-DD
  validTo: string; // YYYY-MM-DD
  notes?: string;
   archived?: boolean;
  createdAt: string;
  days: WorkoutDay[];
}

export interface GymDatabase {
  athletes: Athlete[];
  cards: WorkoutCard[];
  logs: WorkoutSessionLog[];
}

export type CardValidityStatus = "active" | "expiring" | "expired" | "upcoming" | "archived";
