import { WorkoutSessionLog } from "@/types/gym";

/**
 * Converte una stringa numerica (con virgola o punto) in numero.
 */
export function parseItalianNumber(val: string): number | null {
  const cleaned = val.trim().replace(",", ".");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Formatta un numero con la virgola per i decimali (es. 42.5 -> "42,5", 15 -> "15")
 */
export function formatItalianNumber(num: number): string {
  const rounded = Math.round(num * 100) / 100;
  return String(rounded).replace(".", ",");
}

/**
 * Estrae i singoli numeri interi proposti per Serie e Ripetizioni
 * a partire dalla stringa con range della scheda (es. "4x8-10" -> { sets: 4, reps: 8 },
 * "3\4x8+max" -> { sets: 3, reps: 8 }, "3x-10-12" -> { sets: 3, reps: 10 }).
 */
export function extractPlannedSetsAndReps(setsReps: string): {
  sets: number;
  reps: number;
} {
  const trimmed = (setsReps || "").trim();
  if (!trimmed) {
    return { sets: 3, reps: 10 };
  }

  const xIndex = trimmed.toLowerCase().indexOf("x");
  if (xIndex === -1) {
    const nums = trimmed.match(/\d+/g);
    if (!nums || nums.length === 0) return { sets: 3, reps: 10 };
    if (nums.length === 1) return { sets: 3, reps: parseInt(nums[0], 10) };
    return { sets: parseInt(nums[0], 10), reps: parseInt(nums[1], 10) };
  }

  const leftPart = trimmed.slice(0, xIndex);
  const rightPart = trimmed.slice(xIndex + 1);

  const leftNums = leftPart.match(/\d+/g);
  const rightNums = rightPart.match(/\d+/g);

  const sets =
    leftNums && leftNums.length > 0 ? Math.max(1, parseInt(leftNums[0], 10)) : 3;
  const reps =
    rightNums && rightNums.length > 0
      ? Math.max(1, parseInt(rightNums[0], 10))
      : 10;

  return { sets, reps };
}

/**
 * Analizza una stringa di carico (es. "+15", "70", "42,5+6", "45+7+4", "5+5").
 * Restituisce:
 * - hasLeadingPlus: true se inizia con "+" (es. "+15")
 * - parts: array dei segmenti numerici (es. ["15"] per "+15", ["42,5", "6"] per "42,5+6")
 */
export function parseWeightComponents(raw: string): {
  hasLeadingPlus: boolean;
  parts: string[];
  isNumeric: boolean;
} {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return { hasLeadingPlus: false, parts: ["0"], isNumeric: true };
  }

  const hasLeadingPlus = trimmed.startsWith("+");
  const withoutLeading = hasLeadingPlus ? trimmed.slice(1) : trimmed;
  const rawParts = withoutLeading.split("+").map((p) => p.trim());

  const allNumeric =
    rawParts.length > 0 &&
    rawParts.every((p) => parseItalianNumber(p) !== null);

  return {
    hasLeadingPlus,
    parts: rawParts,
    isNumeric: allNumeric,
  };
}

/**
 * Applica un incremento/decremento (delta) a una parte specifica del carico
 * (di default partIndex = 0, oppure tutte le parti se sono uguali es. "5+5" -> "6+6" quando stepSymmetricTogether=true).
 */
export function stepWeightString(
  raw: string,
  delta: number,
  partIndex: number = 0,
  stepSymmetricTogether: boolean = false
): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    const nextVal = Math.max(0, delta);
    return formatItalianNumber(nextVal);
  }

  const { hasLeadingPlus, parts, isNumeric } = parseWeightComponents(trimmed);

  if (!isNumeric) {
    const match = trimmed.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) {
      return delta > 0 ? `${trimmed} +${formatItalianNumber(delta)}` : trimmed;
    }
    const currentNum = parseItalianNumber(match[1]) ?? 0;
    const nextNum = Math.max(0, currentNum + delta);
    return trimmed.replace(match[1], formatItalianNumber(nextNum));
  }

  if (
    stepSymmetricTogether &&
    parts.length === 2 &&
    parts[0] === parts[1]
  ) {
    const val = parseItalianNumber(parts[0]) ?? 0;
    const next = Math.max(0, val + delta);
    const formatted = formatItalianNumber(next);
    return `${hasLeadingPlus ? "+" : ""}${formatted}+${formatted}`;
  }

  const nextParts = parts.map((p, idx) => {
    if (idx !== partIndex) return p;
    const val = parseItalianNumber(p) ?? 0;
    const next = Math.max(0, val + delta);
    return formatItalianNumber(next);
  });

  return `${hasLeadingPlus ? "+" : ""}${nextParts.join("+")}`;
}

/**
 * Usato SOLO nell'editor della scheda (creazione/modifica piano) per incrementare/decrementare i range S/R.
 */
export function stepSetsRepsString(
  raw: string,
  delta: number,
  mode: "sets" | "reps" = "reps"
): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return mode === "sets"
      ? `${Math.max(1, 3 + delta)}x10`
      : `3x${Math.max(1, 10 + delta)}`;
  }

  const xIndex = trimmed.toLowerCase().indexOf("x");
  if (xIndex === -1) {
    const match = trimmed.match(/(\d+)/);
    if (!match) return trimmed;
    const val = Math.max(1, parseInt(match[1], 10) + delta);
    return trimmed.replace(match[1], String(val));
  }

  const setsPart = trimmed.slice(0, xIndex);
  const repsPart = trimmed.slice(xIndex + 1);

  if (mode === "sets") {
    const updatedSets = setsPart.replace(/(\d+)(?!.*\d)/, (m) =>
      String(Math.max(1, parseInt(m, 10) + delta))
    );
    return `${updatedSets}x${repsPart}`;
  } else {
    const updatedReps = repsPart.replace(/\d+/g, (m) =>
      String(Math.max(1, parseInt(m, 10) + delta))
    );
    return `${setsPart}x${updatedReps}`;
  }
}

/**
 * Trova l'ultimo carico e gli ultimi numeri di Serie/Ripetizioni inseriti per un esercizio
 * prima (o in data diversa) dalla data corrente.
 */
export function getLastExerciseHistory(
  logs: WorkoutSessionLog[],
  cardId: string,
  dayId: string,
  exerciseId: string,
  currentDate: string
): {
  lastWeight: string;
  lastSets: number | null;
  lastReps: number | null;
  lastDate: string | null;
} {
  const previousLogs = logs
    .filter(
      (l) =>
        l.cardId === cardId &&
        l.dayId === dayId &&
        l.date !== currentDate
    )
    .sort((a, b) => {
      const aBefore = a.date <= currentDate ? 1 : 0;
      const bBefore = b.date <= currentDate ? 1 : 0;
      if (aBefore !== bBefore) return bBefore - aBefore;
      return b.date.localeCompare(a.date);
    });

  for (const log of previousLogs) {
    const w = log.weightsByExercise?.[exerciseId];
    const s = log.setsByExercise?.[exerciseId];
    const r = log.repsByExercise?.[exerciseId];
    if (
      (w && w.trim() !== "") ||
      typeof s === "number" ||
      typeof r === "number"
    ) {
      return {
        lastWeight: w ?? "",
        lastSets: typeof s === "number" ? s : null,
        lastReps: typeof r === "number" ? r : null,
        lastDate: log.date,
      };
    }
  }

  return {
    lastWeight: "",
    lastSets: null,
    lastReps: null,
    lastDate: null,
  };
}

/**
 * Formatta una data ISO (YYYY-MM-DD) nel formato compatto da scheda cartacea (es. "30/9", "2/10")
 */
export function formatShortPaperDate(isoDate: string): string {
  if (!isoDate) return "-";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  return `${day}/${month}`;
}
