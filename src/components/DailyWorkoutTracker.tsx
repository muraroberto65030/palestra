"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  AppTheme,
  Athlete,
  WorkoutCard,
  WorkoutDay,
  WorkoutSessionLog,
} from "@/types/gym";
import {
  extractPlannedSetsAndReps,
  formatShortPaperDate,
  getLastExerciseHistory,
  parseSupersetNames,
  parseWeightComponents,
  splitSupersetWeight,
  stepWeightString,
} from "@/lib/workoutHelpers";
import { formatItalianDate } from "@/lib/storage";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Minus,
  Plus,
  Settings2,
  Table,
  Trash2,
  SlidersHorizontal,
  Play,
  BookOpen,
  Sun,
  Moon,
  Sparkle,
  Palette,
  PlusCircle,
  Timer,
  Layers,
} from "lucide-react";

interface DailyWorkoutTrackerProps {
  athlete: Athlete;
  card: WorkoutCard;
  logs: WorkoutSessionLog[];
  theme?: AppTheme;
  onChangeTheme?: (nextTheme: AppTheme) => void;
  /** Registra istantaneamente qualsiasi modifica ai log senza bisogno di pulsante Salva */
  onAutoSaveLog: (
    cardId: string,
    athleteId: string,
    dayId: string,
    date: string,
    updater: (prevLog: WorkoutSessionLog | null) => {
      weightsByExercise: Record<string, string>;
      weights2ByExercise?: Record<string, string>;
      setsByExercise: Record<string, number>;
      repsByExercise: Record<string, number>;
      reps2ByExercise?: Record<string, number>;
      notes?: string;
    }
  ) => void;
  onDeleteSessionDate?: (logId: string) => void;
  onOpenPlanEditor?: (card: WorkoutCard) => void;
}

type TrackerMode = "cover" | "setup" | "training";

export default function DailyWorkoutTracker({
  athlete,
  card,
  logs,
  theme = "dark",
  onChangeTheme,
  onAutoSaveLog,
  onDeleteSessionDate,
  onOpenPlanEditor,
}: DailyWorkoutTrackerProps) {
  const todayIso = new Date().toISOString().slice(0, 10);

  // Trova l'ultimo allenamento svolto su questa scheda per proporre il giorno successivo
  const allCardLogs = logs
    .filter((l) => l.cardId === card.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const lastCardLog = allCardLogs[0] || null;

  const getSuggestedNextDayId = (): string => {
    if (!card.days.length) return "";
    if (!lastCardLog) return card.days[0].id;
    const lastIdx = card.days.findIndex((d) => d.id === lastCardLog.dayId);
    if (lastIdx === -1) return card.days[0].id;
    const nextIdx = (lastIdx + 1) % card.days.length;
    return card.days[nextIdx].id;
  };

  const [mode, setMode] = useState<TrackerMode>("cover");
  const [selectedDayId, setSelectedDayId] = useState<string>(
    card.days[0]?.id || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [weightStep, setWeightStep] = useState<number>(2.5);

  // Impostazione Timer di Recupero (30 / 60 / 90 secondi) e stato del countdown
  const [restDuration, setRestDuration] = useState<30 | 60 | 90>(60);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);

  const [lastAutoSaveInfo, setLastAutoSaveInfo] = useState<string | null>(null);

  /**
   * In modalità "training", exercisePage va da 1 a N (tutti gli esercizi in sequenza con swipe sinistra/destra)
   */
  const [exercisePage, setExercisePage] = useState<number>(1);
  const [showSummaryTable, setShowSummaryTable] = useState<boolean>(false);

  // Gestione Swipe Touch sinistra/destra
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Gestione Countdown Timer Recupero
  useEffect(() => {
    if (restRemaining === null || restRemaining <= 0) return;
    const timerId = window.setInterval(() => {
      setRestRemaining((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [restRemaining]);

  const handlePressRestTimer = () => {
    if (restRemaining !== null && restRemaining > 0) {
      setRestRemaining(null);
    } else {
      setRestRemaining(restDuration);
    }
  };

  const formatCountdown = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    if (mins > 0) {
      return `${String(mins).padStart(2, "0")}:${String(remSec).padStart(
        2,
        "0"
      )} (${sec}s)`;
    }
    return `${sec}s`;
  };

  const activeDay: WorkoutDay | undefined =
    card.days.find((d) => d.id === selectedDayId) || card.days[0];

  const totalExercises = activeDay ? activeDay.exercises.length : 0;
  const safeExercisePage = Math.max(
    1,
    Math.min(exercisePage, Math.max(1, totalExercises))
  );

  // Tutte le sessioni registrate per il Giorno attivo, ordinate cronologicamente
  const daySessions = logs
    .filter((l) => l.cardId === card.id && l.dayId === activeDay?.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const markSaved = (detail: string) => {
    const time = new Date().toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLastAutoSaveInfo(`${detail} (${time})`);
  };

  if (!activeDay) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
        Questa scheda non ha ancora giorni configurati.
      </div>
    );
  }

  /**
   * Restituisce per ciascun esercizio lo stato completo (inclusi reps2 e weight2 se è una Super Serie con "+" nel nome)
   */
  const getExerciseState = (
    exId: string,
    exName: string,
    plannedSetsReps: string,
    targetDayId: string = activeDay.id,
    targetDate: string = selectedDate
  ) => {
    const superset = parseSupersetNames(exName);
    const planned = extractPlannedSetsAndReps(plannedSetsReps);
    const history = getLastExerciseHistory(
      logs,
      card.id,
      targetDayId,
      exId,
      targetDate,
      superset.isSuperset
    );

    const sessionForTarget = logs.find(
      (l) =>
        l.cardId === card.id &&
        l.dayId === targetDayId &&
        l.date === targetDate
    );

    let savedWeight1InSession = sessionForTarget?.weightsByExercise?.[exId];
    let savedWeight2InSession = sessionForTarget?.weights2ByExercise?.[exId];

    // Se in una sessione storica di una Superserie i due carichi erano uniti in weightsByExercise (es. "42,5+6"), li separiamo
    if (
      superset.isSuperset &&
      savedWeight1InSession &&
      savedWeight1InSession.includes("+") &&
      savedWeight2InSession === undefined
    ) {
      const split = splitSupersetWeight(savedWeight1InSession);
      savedWeight1InSession = split.weight1;
      savedWeight2InSession = split.weight2;
    }

    const savedSetsInSession = sessionForTarget?.setsByExercise?.[exId];
    const savedReps1InSession = sessionForTarget?.repsByExercise?.[exId];
    const savedReps2InSession = sessionForTarget?.reps2ByExercise?.[exId];

    const hasSavedWeight1Today =
      savedWeight1InSession !== undefined && savedWeight1InSession !== "";
    const hasSavedWeight2Today =
      savedWeight2InSession !== undefined && savedWeight2InSession !== "";
    const hasSavedSetsToday = typeof savedSetsInSession === "number";
    const hasSavedReps1Today = typeof savedReps1InSession === "number";
    const hasSavedReps2Today = typeof savedReps2InSession === "number";

    const effectiveWeight = hasSavedWeight1Today
      ? savedWeight1InSession!
      : history.lastWeight;

    const effectiveWeight2 = hasSavedWeight2Today
      ? savedWeight2InSession!
      : history.lastWeight2;

    // Quando inizia un nuovo allenamento le serie partono sempre da 0
    const effectiveSets = hasSavedSetsToday ? savedSetsInSession! : 0;

    const effectiveReps = hasSavedReps1Today
      ? savedReps1InSession!
      : history.lastReps ?? planned.reps;

    const effectiveReps2 = hasSavedReps2Today
      ? savedReps2InSession!
      : history.lastReps2 ?? planned.reps2;

    const remainingSets = Math.max(0, planned.sets - effectiveSets);

    // Stato colore scritta Serie:
    // 0 -> rosso ("serie-label-red")
    // da 1 fino a (planned.sets - 1) -> giallo ("serie-label-yellow")
    // >= planned.sets -> verde ("serie-label-green")
    const serieColorClass =
      effectiveSets === 0
        ? "serie-label-red"
        : effectiveSets < planned.sets
        ? "serie-label-yellow"
        : "serie-label-green";

    return {
      superset,
      effectiveWeight,
      effectiveWeight2,
      effectiveSets,
      effectiveReps,
      effectiveReps2,
      remainingSets,
      serieColorClass,
      hasSavedWeightToday: hasSavedWeight1Today,
      hasSavedWeight2Today,
      hasSavedSetsToday,
      hasSavedRepsToday: hasSavedReps1Today,
      hasSavedReps2Today,
      hasAnySavedToday:
        effectiveSets > 0 ||
        hasSavedWeight1Today ||
        hasSavedWeight2Today ||
        hasSavedReps1Today ||
        hasSavedReps2Today,
      lastWeight: history.lastWeight,
      lastWeight2: history.lastWeight2,
      lastSets: history.lastSets,
      lastReps: history.lastReps,
      lastReps2: history.lastReps2,
      lastDate: history.lastDate,
      plannedSets: planned.sets,
      plannedReps: planned.reps,
      plannedReps2: planned.reps2,
    };
  };

  /**
   * Registra istantaneamente una modifica a Serie (numero >= 0), Ripetizioni 1/2 (numero >= 1) o Carico 1/2 (Kg)
   */
  const commitExerciseChange = (
    exId: string,
    exName: string,
    plannedSetsReps: string,
    patch: {
      sets?: number;
      reps?: number;
      reps2?: number;
      weight?: string;
      weight2?: string;
    },
    logLabel: string
  ) => {
    const state = getExerciseState(exId, exName, plannedSetsReps);
    const nextSetsVal =
      patch.sets !== undefined ? Math.max(0, patch.sets) : state.effectiveSets;
    const nextRepsVal =
      patch.reps !== undefined ? Math.max(1, patch.reps) : state.effectiveReps;
    const nextReps2Val =
      patch.reps2 !== undefined
        ? Math.max(1, patch.reps2)
        : state.effectiveReps2;
    const nextWeightVal =
      patch.weight !== undefined ? patch.weight : state.effectiveWeight;
    const nextWeight2Val =
      patch.weight2 !== undefined ? patch.weight2 : state.effectiveWeight2;

    onAutoSaveLog(
      card.id,
      athlete.id,
      activeDay.id,
      selectedDate,
      (prevLog) => {
        const nextWeights = { ...(prevLog?.weightsByExercise || {}) };
        const nextWeights2 = { ...(prevLog?.weights2ByExercise || {}) };
        const nextSetsMap = { ...(prevLog?.setsByExercise || {}) };
        const nextRepsMap = { ...(prevLog?.repsByExercise || {}) };
        const nextReps2Map = { ...(prevLog?.reps2ByExercise || {}) };

        nextSetsMap[exId] = nextSetsVal;
        nextRepsMap[exId] = nextRepsVal;
        nextWeights[exId] = nextWeightVal;

        if (state.superset.isSuperset) {
          nextReps2Map[exId] = nextReps2Val;
          nextWeights2[exId] = nextWeight2Val;
        }

        return {
          weightsByExercise: nextWeights,
          weights2ByExercise: nextWeights2,
          setsByExercise: nextSetsMap,
          repsByExercise: nextRepsMap,
          reps2ByExercise: nextReps2Map,
          notes: prevLog?.notes,
        };
      }
    );

    markSaved(`${exName} → ${logLabel}`);
  };

  /**
   * Apre il pannello di configurazione "Nuovo Allenamento" proponendo il giorno consigliato e la data di oggi
   */
  const handleStartNewWorkoutSetup = () => {
    const suggestedDay = getSuggestedNextDayId();
    if (suggestedDay) {
      setSelectedDayId(suggestedDay);
    }
    setSelectedDate(todayIso);
    setMode("setup");
  };

  /**
   * Conferma la scelta di giornata e impostazioni:
   * - Inizializza tutte le Serie a 0
   * - Propone le Ripetizioni previste (1 e 2 per le superserie) e gli ultimi Carichi (1 e 2 per le superserie)
   * - Avvia l'allenamento da Pagina 1
   */
  const handleConfirmAndStartWorkout = () => {
    onAutoSaveLog(
      card.id,
      athlete.id,
      activeDay.id,
      selectedDate,
      (prevLog) => {
        const nextWeights = { ...(prevLog?.weightsByExercise || {}) };
        const nextWeights2 = { ...(prevLog?.weights2ByExercise || {}) };
        const nextSetsMap = { ...(prevLog?.setsByExercise || {}) };
        const nextRepsMap = { ...(prevLog?.repsByExercise || {}) };
        const nextReps2Map = { ...(prevLog?.reps2ByExercise || {}) };

        activeDay.exercises.forEach((ex) => {
          const st = getExerciseState(
            ex.id,
            ex.name,
            ex.setsReps,
            activeDay.id,
            selectedDate
          );
          if (nextWeights[ex.id] === undefined && st.effectiveWeight) {
            nextWeights[ex.id] = st.effectiveWeight;
          }
          // All'inizio di un nuovo allenamento la serie parte sempre da 0
          nextSetsMap[ex.id] = 0;
          if (typeof nextRepsMap[ex.id] !== "number") {
            nextRepsMap[ex.id] = st.effectiveReps;
          }
          if (st.superset.isSuperset) {
            if (nextWeights2[ex.id] === undefined && st.effectiveWeight2) {
              nextWeights2[ex.id] = st.effectiveWeight2;
            }
            if (typeof nextReps2Map[ex.id] !== "number") {
              nextReps2Map[ex.id] = st.effectiveReps2;
            }
          }
        });

        return {
          weightsByExercise: nextWeights,
          weights2ByExercise: nextWeights2,
          setsByExercise: nextSetsMap,
          repsByExercise: nextRepsMap,
          reps2ByExercise: nextReps2Map,
          notes: prevLog?.notes,
        };
      }
    );

    setRestRemaining(null);
    markSaved(`Avviato ${activeDay.name} (Serie azzerate a 0)`);
    setExercisePage(1);
    setMode("training");
  };

  // Gestori Touch Swipe Sinistra / Destra per la modalità "training"
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (
      mode !== "training" ||
      touchStartXRef.current === null ||
      touchStartYRef.current === null ||
      e.changedTouches.length === 0
    ) {
      return;
    }

    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0 && safeExercisePage < totalExercises) {
        setExercisePage(safeExercisePage + 1);
      } else if (deltaX > 0 && safeExercisePage > 1) {
        setExercisePage(safeExercisePage - 1);
      }
    }
  };

  const currentExercise = activeDay.exercises[safeExercisePage - 1] || null;
  const suggestedDayId = getSuggestedNextDayId();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* =====================================================================
          FASE 1: COPERTINA SCHEDA CON PULSANTE "NUOVO ALLENAMENTO"
          ===================================================================== */}
      {mode === "cover" && (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-xl sm:p-6">
          {/* Intestazione Scheda / Copertina */}
          <div className="border-b border-slate-800 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-400">
                Copertina Scheda Atleta
              </span>
              <span className="text-xs text-slate-400">
                Valida: <strong>{formatItalianDate(card.validFrom)}</strong> →{" "}
                <strong>{formatItalianDate(card.validTo)}</strong>
              </span>
            </div>

            <h2 className="mt-2 text-xl font-extrabold text-white sm:text-2xl">
              {card.title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-300">
              Atleta: <strong className="text-sky-300">{athlete.fullName}</strong>
              {card.goal ? ` • Obiettivo: ${card.goal}` : ""}
            </p>
            {card.notes && (
              <p className="mt-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs italic text-slate-400">
                &ldquo;{card.notes}&rdquo;
              </p>
            )}
          </div>

          {/* CTA Principale: Pulsante "NUOVO ALLENAMENTO" */}
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Pronto per allenarti?
                </h3>
                <p className="text-xs text-slate-300">
                  Scegli la giornata, il recupero (30/60/90s) e le impostazioni
                  per partire dalla Serie 0.
                </p>
              </div>
              {lastCardLog && (
                <span className="rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1 text-[11px] text-slate-300">
                  Ultimo:{" "}
                  <strong>
                    {card.days.find((d) => d.id === lastCardLog.dayId)?.name ||
                      "Giorno"}{" "}
                    ({formatShortPaperDate(lastCardLog.date)})
                  </strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleStartNewWorkoutSetup}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-sky-500 py-4 text-base font-extrabold text-slate-950 shadow-xl shadow-sky-500/20 transition hover:bg-sky-400 active:scale-[0.99]"
            >
              <PlusCircle className="h-5 w-5" />
              Nuovo Allenamento
            </button>
          </div>

          {/* Riepilogo Giorni della Scheda e Sessioni già registrate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Giornate della Scheda &amp; Storico Sessioni
              </span>
              {onOpenPlanEditor && (
                <button
                  type="button"
                  onClick={() => onOpenPlanEditor(card)}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Modifica Esercizi Scheda
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {card.days.map((day) => {
                const sessionsForDay = logs
                  .filter((l) => l.cardId === card.id && l.dayId === day.id)
                  .sort((a, b) => b.date.localeCompare(a.date));

                return (
                  <div
                    key={day.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3.5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-white">
                          {day.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {day.exercises.length} esercizi
                        </span>
                      </div>

                      {/* Elenco compatto esercizi con range S/R della scheda */}
                      <ul className="mt-2 space-y-1 border-t border-slate-800/80 pt-2 text-xs">
                        {day.exercises.slice(0, 4).map((ex) => (
                          <li
                            key={ex.id}
                            className="flex items-center justify-between text-slate-300"
                          >
                            <span className="truncate">{ex.name}</span>
                            <span className="ml-2 font-mono text-[11px] text-sky-300">
                              {ex.setsReps || "-"}
                            </span>
                          </li>
                        ))}
                        {day.exercises.length > 4 && (
                          <li className="text-[11px] text-slate-500">
                            + altri {day.exercises.length - 4} esercizi...
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Sessioni passate cliccabili per rivederle o modificarle */}
                    <div className="mt-3 border-t border-slate-800/80 pt-2.5">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Sessioni registrate ({sessionsForDay.length}):
                      </span>
                      {sessionsForDay.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {sessionsForDay.map((sess) => (
                            <button
                              key={sess.id}
                              type="button"
                              onClick={() => {
                                setSelectedDayId(day.id);
                                setSelectedDate(sess.date);
                                setExercisePage(1);
                                setMode("training");
                              }}
                              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-sky-300 hover:border-sky-500"
                              title="Apri e rivedi questa sessione"
                            >
                              {formatShortPaperDate(sess.date)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="mt-1 block text-xs text-slate-500">
                          Nessuna sessione registrata
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pulsante Tabella Completa e Preferenze Tema in Copertina */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setShowSummaryTable(!showSummaryTable)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs font-bold text-sky-400 hover:border-sky-500/50"
            >
              <Table className="h-4 w-4" />
              {showSummaryTable
                ? "Nascondi Tabella Scheda"
                : "Vedi Tabella Scheda Completa"}
            </button>

            {onChangeTheme && (
              <div className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-sky-400" />
                {(
                  [
                    { id: "dark", label: "Scuro", icon: Moon },
                    { id: "light", label: "Light", icon: Sun },
                    { id: "metallic", label: "Metallizzato", icon: Sparkle },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onChangeTheme(t.id)}
                      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                        theme === t.id
                          ? "border-sky-500 bg-sky-500 text-slate-950"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          FASE 2: CONFIGURAZIONE NUOVO ALLENAMENTO (SCELTA GIORNATA E IMPOSTAZIONI)
          ===================================================================== */}
      {mode === "setup" && (
        <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-400">
                Configurazione Nuovo Allenamento
              </span>
              <h2 className="mt-2 text-xl font-extrabold text-white">
                Scegli Giornata e Impostazioni
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setMode("cover")}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white"
            >
              Annulla
            </button>
          </div>

          {/* 1. Scegli la Giornata */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Dumbbell className="h-4 w-4 text-sky-400" /> 1. Quale giornata
              vuoi svolgere?
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {card.days.map((day) => {
                const isSelected = day.id === activeDay.id;
                const isSuggested = day.id === suggestedDayId;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setSelectedDayId(day.id)}
                    className={`flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? "border-sky-500 bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20"
                        : "border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-base font-extrabold">
                        {day.name}
                      </span>
                      {isSuggested && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isSelected
                              ? "bg-slate-950/20 text-slate-950"
                              : "bg-sky-500/15 text-sky-300"
                          }`}
                        >
                          Consigliato oggi
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-1 text-xs font-semibold ${
                        isSelected ? "text-slate-950/80" : "text-slate-400"
                      }`}
                    >
                      {day.exercises.length} esercizi in sequenza
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Data dell'allenamento & 3. Timer di Recupero (30/60/90s) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-sky-400" /> 2. Data
                Allenamento
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) =>
                    e.target.value && setSelectedDate(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-white focus:border-sky-500 focus:outline-none"
                />
                {selectedDate !== todayIso && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayIso)}
                    className="shrink-0 rounded-xl bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-300"
                  >
                    Oggi
                  </button>
                )}
              </div>
            </div>

            {/* 3. Scelta Timer di Recupero (30 / 60 / 90 secondi) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Timer className="h-3.5 w-3.5 text-sky-400" /> 3. Timer
                Recupero (Secondi)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([30, 60, 90] as const).map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setRestDuration(sec);
                      setRestRemaining(null);
                    }}
                    className={`rounded-xl py-2 text-xs font-extrabold transition ${
                      restDuration === sec
                        ? "bg-sky-500 text-slate-950 shadow"
                        : "border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                    }`}
                  >
                    {sec} sec
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Passo Incremento +/- Kg & 5. Preferenza Tema */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" /> 4.
                Passo Incremento +/- (Kg)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.5, 1, 2.5, 5].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setWeightStep(step)}
                    className={`rounded-xl py-2 text-xs font-extrabold transition ${
                      weightStep === step
                        ? "bg-sky-500 text-slate-950 shadow"
                        : "border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                    }`}
                  >
                    {String(step).replace(".", ",")} Kg
                  </button>
                ))}
              </div>
            </div>

            {onChangeTheme && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Palette className="h-3.5 w-3.5 text-sky-400" /> 5. Preferenza
                  Tema
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeTheme("dark")}
                    className={`flex items-center justify-center gap-1 rounded-xl border py-2 px-1.5 text-xs font-extrabold transition ${
                      theme === "dark"
                        ? "border-sky-500 bg-sky-500 text-slate-950 shadow"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5 shrink-0" />
                    <span>Scuro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeTheme("light")}
                    className={`flex items-center justify-center gap-1 rounded-xl border py-2 px-1.5 text-xs font-extrabold transition ${
                      theme === "light"
                        ? "border-sky-500 bg-sky-500 text-slate-950 shadow"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5 shrink-0" />
                    <span>Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeTheme("metallic")}
                    className={`flex items-center justify-center gap-1 rounded-xl border py-2 px-1.5 text-xs font-extrabold transition ${
                      theme === "metallic"
                        ? "border-sky-500 bg-sky-500 text-slate-950 shadow"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Sparkle className="h-3.5 w-3.5 shrink-0" />
                    <span>Metallizzato</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Anteprima esercizi che partiranno da Serie 0 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Esercizi in {activeDay.name} ({activeDay.exercises.length} —
              partenza da Serie 0)
            </span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {activeDay.exercises.map((ex, idx) => {
                const st = getExerciseState(ex.id, ex.name, ex.setsReps);
                return (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/80 px-2.5 py-1.5 text-xs"
                  >
                    <span className="truncate font-medium text-white">
                      {idx + 1}. {ex.name}
                    </span>
                    <span className="ml-2 shrink-0 font-mono text-[11px] text-sky-300">
                      {st.superset.isSuperset
                        ? `${st.plannedSets}×(${st.effectiveReps}+${st.effectiveReps2})`
                        : `${st.plannedSets}×${st.effectiveReps}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pulsante Conferma e Inizia Allenamento */}
          <button
            type="button"
            onClick={handleConfirmAndStartWorkout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-base font-extrabold text-slate-950 shadow-xl shadow-sky-500/20 transition hover:bg-sky-400 active:scale-[0.99]"
          >
            <Play className="h-5 w-5 fill-current" />
            Conferma e Inizia {activeDay.name} (Pagina 1)
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* =====================================================================
          FASE 3: ALLENAMENTO ATTIVO (PAGINA 1..N CON SWIPE SINISTRA / DESTRA)
          ===================================================================== */}
      {mode === "training" && currentExercise && (
        <>
          {/* Barra di navigazione Pagine Esercizi (1..N) + Ritorno a Copertina */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMode("cover")}
                className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-extrabold text-slate-300 transition hover:border-sky-500/50 hover:text-white"
              >
                <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                Copertina
              </button>

              {/* Numeri Esercizi 1..N con colore in base alle serie completate */}
              <div className="flex flex-1 items-center justify-center gap-1.5 overflow-x-auto px-1 py-1">
                {activeDay.exercises.map((ex, idx) => {
                  const pageNum = idx + 1;
                  const isCurrent = safeExercisePage === pageNum;
                  const exState = getExerciseState(ex.id, ex.name, ex.setsReps);
                  const isDone = exState.effectiveSets >= exState.plannedSets;
                  const isInProgress =
                    exState.effectiveSets > 0 &&
                    exState.effectiveSets < exState.plannedSets;

                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setExercisePage(pageNum)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-extrabold transition ${
                        isCurrent
                          ? "border-sky-500 bg-sky-500 text-slate-950 shadow"
                          : isDone
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                          : isInProgress
                          ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                      title={`Esercizio ${pageNum}: ${ex.name} (${exState.effectiveSets}/${exState.plannedSets} serie)`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeExercisePage <= 1}
                  onClick={() =>
                    setExercisePage(Math.max(1, safeExercisePage - 1))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={safeExercisePage >= totalExercises}
                  onClick={() =>
                    setExercisePage(
                      Math.min(totalExercises, safeExercisePage + 1)
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-300 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2 text-[11px]">
              <span className="flex items-center gap-1 font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {lastAutoSaveInfo
                  ? `Salvato: ${lastAutoSaveInfo}`
                  : "Auto-save istantaneo (+/-)"}
              </span>

              <span className="text-slate-400">
                Esercizio {safeExercisePage} di {totalExercises} • Scorri ← →
              </span>
            </div>
          </div>

          {/* Card Singolo Esercizio con Swipe Sinistra / Destra */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="select-none"
          >
            {(() => {
              const state = getExerciseState(
                currentExercise.id,
                currentExercise.name,
                currentExercise.setsReps
              );
              const parsedWeight = parseWeightComponents(state.effectiveWeight);
              const isMultiPartWeight =
                !state.superset.isSuperset &&
                parsedWeight.isNumeric &&
                parsedWeight.parts.length > 1;

              const isTimerRunning =
                restRemaining !== null && restRemaining > 0;
              const isTimerFinished = restRemaining === 0;

              return (
                <div
                  key={currentExercise.id}
                  className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl transition sm:p-6"
                >
                  {/* Header Pagina Esercizio */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-xl bg-sky-500 px-3 py-1 text-xs font-extrabold text-slate-950">
                        Pagina {safeExercisePage} di {totalExercises}
                      </span>
                      <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-300">
                        {activeDay.name} • {formatShortPaperDate(selectedDate)}
                      </span>
                      {state.superset.isSuperset && (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/15 px-2.5 py-1 text-xs font-extrabold text-sky-300">
                          <Layers className="h-3.5 w-3.5" /> Super Serie (2
                          Esercizi)
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      <Check className="h-3.5 w-3.5" /> Registrazione attiva
                    </span>
                  </div>

                  {/* Titolo Esercizio & Target Scheda (sinistra) + Pulsante Timer Recupero (destra) */}
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                      {currentExercise.name || "Esercizio"}
                    </h2>

                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      {/* Box Sinistro: Previsto da Scheda (Range) */}
                      <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-300/80">
                          Previsto da Scheda (Range)
                        </span>
                        <span className="mt-0.5 block font-mono text-lg font-extrabold text-sky-300">
                          {currentExercise.setsReps || "Libero"}
                        </span>
                      </div>

                      {/* Box Destro: Pulsante Timer Recupero con Countdown nel testo */}
                      <button
                        type="button"
                        onClick={handlePressRestTimer}
                        className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition active:scale-95 ${
                          isTimerRunning
                            ? "border-amber-500 bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/10"
                            : isTimerFinished
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                            : "border-indigo-500/40 bg-indigo-500/15 text-indigo-300 hover:border-indigo-400"
                        }`}
                      >
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                          <Timer className="h-3.5 w-3.5" />
                          {isTimerRunning
                            ? "Recupero in corso (tocca per stop)"
                            : isTimerFinished
                            ? "Recupero completato! Tocca per riavviare"
                            : `Timer Recupero (${restDuration}s)`}
                        </span>
                        <span className="mt-0.5 font-mono text-lg font-extrabold">
                          {isTimerRunning
                            ? formatCountdown(restRemaining)
                            : isTimerFinished
                            ? `00:00 • Riprendi! (${restDuration}s)`
                            : `Avvia Recupero (${restDuration}s)`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* ==========================================================
                      CASO A: ESERCIZIO SINGOLO (nessun "+" nella descrizione)
                      ========================================================== */}
                  {!state.superset.isSuperset ? (
                    <>
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        {/* Box SERIE */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className={`text-sm font-extrabold uppercase tracking-wider ${state.serieColorClass}`}
                            >
                              Serie ({state.effectiveSets}/{state.plannedSets})
                            </span>
                            <span
                              className={`text-xs font-bold ${state.serieColorClass}`}
                            >
                              {state.effectiveSets === 0
                                ? `Mancano ${state.plannedSets} serie`
                                : state.remainingSets > 0
                                ? state.remainingSets === 1
                                  ? "Manca 1 serie"
                                  : `Mancano ${state.remainingSets} serie`
                                : "Serie completate!"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                commitExerciseChange(
                                  currentExercise.id,
                                  currentExercise.name,
                                  currentExercise.setsReps,
                                  { sets: Math.max(0, state.effectiveSets - 1) },
                                  `Serie: ${Math.max(
                                    0,
                                    state.effectiveSets - 1
                                  )}`
                                )
                              }
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 active:scale-95"
                              title="-1 Serie"
                            >
                              <Minus className="h-6 w-6" />
                            </button>

                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={state.effectiveSets}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!Number.isNaN(val) && val >= 0) {
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { sets: val },
                                    `Serie: ${val}`
                                  );
                                }
                              }}
                              className={`h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 text-center font-mono text-2xl font-extrabold focus:border-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${state.serieColorClass}`}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                commitExerciseChange(
                                  currentExercise.id,
                                  currentExercise.name,
                                  currentExercise.setsReps,
                                  { sets: state.effectiveSets + 1 },
                                  `Serie: ${state.effectiveSets + 1}`
                                )
                              }
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20 active:scale-95"
                              title="+1 Serie eseguita"
                            >
                              <Plus className="h-6 w-6" />
                            </button>
                          </div>
                        </div>

                        {/* Box RIPETIZIONI */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                              Ripetizioni (Numero)
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                commitExerciseChange(
                                  currentExercise.id,
                                  currentExercise.name,
                                  currentExercise.setsReps,
                                  { reps: Math.max(1, state.effectiveReps - 1) },
                                  `Ripetizioni: ${Math.max(
                                    1,
                                    state.effectiveReps - 1
                                  )}`
                                )
                              }
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 active:scale-95"
                              title="-1 Ripetizione"
                            >
                              <Minus className="h-6 w-6" />
                            </button>

                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={state.effectiveReps}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!Number.isNaN(val) && val > 0) {
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { reps: val },
                                    `Ripetizioni: ${val}`
                                  );
                                }
                              }}
                              className="h-14 w-full rounded-2xl border border-emerald-500/50 bg-emerald-950/20 text-center font-mono text-2xl font-extrabold text-emerald-300 focus:border-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                commitExerciseChange(
                                  currentExercise.id,
                                  currentExercise.name,
                                  currentExercise.setsReps,
                                  { reps: state.effectiveReps + 1 },
                                  `Ripetizioni: ${state.effectiveReps + 1}`
                                )
                              }
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20 active:scale-95"
                              title="+1 Ripetizione"
                            >
                              <Plus className="h-6 w-6" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Box CARICO (Kg) */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                            Carico (Kg) • Passo{" "}
                            {String(weightStep).replace(".", ",")} Kg
                          </span>
                          {state.lastDate && state.lastWeight && (
                            <span className="text-[11px] text-slate-400">
                              Ultima volta (
                              {formatShortPaperDate(state.lastDate)}):{" "}
                              <strong className="font-mono text-slate-200">
                                {state.lastWeight} Kg
                              </strong>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              const nextW = stepWeightString(
                                state.effectiveWeight,
                                -weightStep,
                                0,
                                true
                              );
                              commitExerciseChange(
                                currentExercise.id,
                                currentExercise.name,
                                currentExercise.setsReps,
                                { weight: nextW },
                                `Carico: ${nextW} Kg`
                              );
                            }}
                            className="flex h-14 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 active:scale-95"
                            title={`-${weightStep} Kg`}
                          >
                            <Minus className="h-6 w-6" />
                          </button>

                          <input
                            type="text"
                            value={state.effectiveWeight}
                            placeholder="Es. +15 o 70"
                            onChange={(e) =>
                              commitExerciseChange(
                                currentExercise.id,
                                currentExercise.name,
                                currentExercise.setsReps,
                                { weight: e.target.value },
                                `Carico: ${e.target.value || "vuoto"} Kg`
                              )
                            }
                            className="h-14 w-full rounded-2xl border border-emerald-500/50 bg-emerald-950/20 px-3 text-center font-mono text-2xl font-extrabold text-emerald-300 focus:border-sky-500 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const nextW = stepWeightString(
                                state.effectiveWeight,
                                weightStep,
                                0,
                                true
                              );
                              commitExerciseChange(
                                currentExercise.id,
                                currentExercise.name,
                                currentExercise.setsReps,
                                { weight: nextW },
                                `Carico: ${nextW} Kg`
                              );
                            }}
                            className="flex h-14 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20 active:scale-95"
                            title={`+${weightStep} Kg`}
                          >
                            <Plus className="h-6 w-6" />
                          </button>
                        </div>

                        {isMultiPartWeight && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                            <span className="text-xs font-semibold text-slate-400">
                              Singoli pesi combinati:
                            </span>
                            {parsedWeight.parts.map((partVal, partIdx) => (
                              <div
                                key={partIdx}
                                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-2 py-1"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextW = stepWeightString(
                                      state.effectiveWeight,
                                      -weightStep,
                                      partIdx,
                                      false
                                    );
                                    commitExerciseChange(
                                      currentExercise.id,
                                      currentExercise.name,
                                      currentExercise.setsReps,
                                      { weight: nextW },
                                      `Carico: ${nextW} Kg`
                                    );
                                  }}
                                  className="rounded-lg bg-slate-950 p-1.5 text-slate-300 active:scale-95"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="px-1 font-mono text-sm font-extrabold text-sky-300">
                                  {partIdx === 0 && parsedWeight.hasLeadingPlus
                                    ? `+${partVal}`
                                    : partVal}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextW = stepWeightString(
                                      state.effectiveWeight,
                                      weightStep,
                                      partIdx,
                                      false
                                    );
                                    commitExerciseChange(
                                      currentExercise.id,
                                      currentExercise.name,
                                      currentExercise.setsReps,
                                      { weight: nextW },
                                      `Carico: ${nextW} Kg`
                                    );
                                  }}
                                  className="rounded-lg bg-sky-500/20 p-1.5 text-sky-300 active:scale-95"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* ==========================================================
                       CASO B: SUPER SERIE ("+" nella descrizione dell'esercizio)
                       Serie comune + 2 Ripetizioni separate + 2 Carichi separati
                       ========================================================== */
                    <div className="space-y-4">
                      {/* 1. Box SERIE della Super Serie (0 = Rossa, 1..N-1 = Gialla, >=N = Verde) */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`text-sm font-extrabold uppercase tracking-wider ${state.serieColorClass}`}
                          >
                            Serie Super Serie ({state.effectiveSets}/
                            {state.plannedSets})
                          </span>
                          <span
                            className={`text-xs font-bold ${state.serieColorClass}`}
                          >
                            {state.effectiveSets === 0
                              ? `Mancano ${state.plannedSets} serie`
                              : state.remainingSets > 0
                              ? state.remainingSets === 1
                                ? "Manca 1 serie"
                                : `Mancano ${state.remainingSets} serie`
                              : "Serie completate!"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              commitExerciseChange(
                                currentExercise.id,
                                currentExercise.name,
                                currentExercise.setsReps,
                                { sets: Math.max(0, state.effectiveSets - 1) },
                                `Serie: ${Math.max(0, state.effectiveSets - 1)}`
                              )
                            }
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 active:scale-95"
                            title="-1 Serie"
                          >
                            <Minus className="h-6 w-6" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={30}
                            value={state.effectiveSets}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!Number.isNaN(val) && val >= 0) {
                                commitExerciseChange(
                                  currentExercise.id,
                                  currentExercise.name,
                                  currentExercise.setsReps,
                                  { sets: val },
                                  `Serie: ${val}`
                                );
                              }
                            }}
                            className={`h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 text-center font-mono text-2xl font-extrabold focus:border-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${state.serieColorClass}`}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              commitExerciseChange(
                                currentExercise.id,
                                currentExercise.name,
                                currentExercise.setsReps,
                                { sets: state.effectiveSets + 1 },
                                `Serie: ${state.effectiveSets + 1}`
                              )
                            }
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20 active:scale-95"
                            title="+1 Serie eseguita"
                          >
                            <Plus className="h-6 w-6" />
                          </button>
                        </div>
                      </div>

                      {/* 2. PRIMO ESERCIZIO DELLA SUPER SERIE: Ripetizioni 1 + Carico 1 */}
                      <div className="rounded-2xl border border-sky-500/30 bg-slate-950 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                            1° Esercizio: {state.superset.name1}
                          </span>
                          {state.lastDate && state.lastWeight && (
                            <span className="text-[11px] text-slate-400">
                              Ultimo ({formatShortPaperDate(state.lastDate)}):{" "}
                              <strong className="font-mono text-slate-200">
                                {state.lastWeight} Kg
                              </strong>
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {/* Ripetizioni 1 */}
                          <div>
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Ripetizioni ({state.superset.name1})
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    {
                                      reps: Math.max(
                                        1,
                                        state.effectiveReps - 1
                                      ),
                                    },
                                    `Rip 1 (${state.superset.name1}): ${Math.max(
                                      1,
                                      state.effectiveReps - 1
                                    )}`
                                  )
                                }
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 active:scale-95"
                              >
                                <Minus className="h-5 w-5" />
                              </button>

                              <input
                                type="number"
                                min={1}
                                max={200}
                                value={state.effectiveReps}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(val) && val > 0) {
                                    commitExerciseChange(
                                      currentExercise.id,
                                      currentExercise.name,
                                      currentExercise.setsReps,
                                      { reps: val },
                                      `Rip 1 (${state.superset.name1}): ${val}`
                                    );
                                  }
                                }}
                                className="h-12 w-full rounded-xl border border-emerald-500/50 bg-emerald-950/20 text-center font-mono text-xl font-extrabold text-emerald-300 focus:border-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { reps: state.effectiveReps + 1 },
                                    `Rip 1 (${state.superset.name1}): ${
                                      state.effectiveReps + 1
                                    }`
                                  )
                                }
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow active:scale-95"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            </div>
                          </div>

                          {/* Carico 1 (Kg) */}
                          <div>
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Carico Kg ({state.superset.name1})
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextW1 = stepWeightString(
                                    state.effectiveWeight,
                                    -weightStep,
                                    0,
                                    true
                                  );
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { weight: nextW1 },
                                    `Carico 1 (${state.superset.name1}): ${nextW1} Kg`
                                  );
                                }}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 active:scale-95"
                              >
                                <Minus className="h-5 w-5" />
                              </button>

                              <input
                                type="text"
                                value={state.effectiveWeight}
                                placeholder="Es. 42,5"
                                onChange={(e) =>
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { weight: e.target.value },
                                    `Carico 1 (${state.superset.name1}): ${e.target.value} Kg`
                                  )
                                }
                                className="h-12 w-full rounded-xl border border-emerald-500/50 bg-emerald-950/20 px-2 text-center font-mono text-xl font-extrabold text-emerald-300 focus:border-sky-500 focus:outline-none"
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  const nextW1 = stepWeightString(
                                    state.effectiveWeight,
                                    weightStep,
                                    0,
                                    true
                                  );
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { weight: nextW1 },
                                    `Carico 1 (${state.superset.name1}): ${nextW1} Kg`
                                  );
                                }}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow active:scale-95"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. SECONDO ESERCIZIO DELLA SUPER SERIE: Ripetizioni 2 + Carico 2 */}
                      <div className="rounded-2xl border border-indigo-500/30 bg-slate-950 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                            2° Esercizio: {state.superset.name2}
                          </span>
                          {state.lastDate && state.lastWeight2 && (
                            <span className="text-[11px] text-slate-400">
                              Ultimo ({formatShortPaperDate(state.lastDate)}):{" "}
                              <strong className="font-mono text-slate-200">
                                {state.lastWeight2} Kg
                              </strong>
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {/* Ripetizioni 2 */}
                          <div>
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Ripetizioni ({state.superset.name2})
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    {
                                      reps2: Math.max(
                                        1,
                                        state.effectiveReps2 - 1
                                      ),
                                    },
                                    `Rip 2 (${state.superset.name2}): ${Math.max(
                                      1,
                                      state.effectiveReps2 - 1
                                    )}`
                                  )
                                }
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 active:scale-95"
                              >
                                <Minus className="h-5 w-5" />
                              </button>

                              <input
                                type="number"
                                min={1}
                                max={200}
                                value={state.effectiveReps2}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(val) && val > 0) {
                                    commitExerciseChange(
                                      currentExercise.id,
                                      currentExercise.name,
                                      currentExercise.setsReps,
                                      { reps2: val },
                                      `Rip 2 (${state.superset.name2}): ${val}`
                                    );
                                  }
                                }}
                                className="h-12 w-full rounded-xl border border-emerald-500/50 bg-emerald-950/20 text-center font-mono text-xl font-extrabold text-emerald-300 focus:border-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { reps2: state.effectiveReps2 + 1 },
                                    `Rip 2 (${state.superset.name2}): ${
                                      state.effectiveReps2 + 1
                                    }`
                                  )
                                }
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow active:scale-95"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            </div>
                          </div>

                          {/* Carico 2 (Kg) */}
                          <div>
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Carico Kg ({state.superset.name2})
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextW2 = stepWeightString(
                                    state.effectiveWeight2,
                                    -weightStep,
                                    0,
                                    true
                                  );
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { weight2: nextW2 },
                                    `Carico 2 (${state.superset.name2}): ${nextW2} Kg`
                                  );
                                }}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 active:scale-95"
                              >
                                <Minus className="h-5 w-5" />
                              </button>

                              <input
                                type="text"
                                value={state.effectiveWeight2}
                                placeholder="Es. 6"
                                onChange={(e) =>
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { weight2: e.target.value },
                                    `Carico 2 (${state.superset.name2}): ${e.target.value} Kg`
                                  )
                                }
                                className="h-12 w-full rounded-xl border border-emerald-500/50 bg-emerald-950/20 px-2 text-center font-mono text-xl font-extrabold text-emerald-300 focus:border-sky-500 focus:outline-none"
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  const nextW2 = stepWeightString(
                                    state.effectiveWeight2,
                                    weightStep,
                                    0,
                                    true
                                  );
                                  commitExerciseChange(
                                    currentExercise.id,
                                    currentExercise.name,
                                    currentExercise.setsReps,
                                    { weight2: nextW2 },
                                    `Carico 2 (${state.superset.name2}): ${nextW2} Kg`
                                  );
                                }}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-slate-950 shadow active:scale-95"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigazione Inferiore tra gli esercizi 1..N */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    {safeExercisePage > 1 ? (
                      <button
                        type="button"
                        onClick={() => setExercisePage(safeExercisePage - 1)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-950 py-3.5 text-xs font-extrabold text-slate-200 transition hover:border-slate-600 active:scale-95"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Es. {safeExercisePage - 1}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMode("cover")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-950 py-3.5 text-xs font-extrabold text-slate-200 transition hover:border-slate-600 active:scale-95"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Copertina
                      </button>
                    )}

                    {safeExercisePage < totalExercises ? (
                      <button
                        type="button"
                        onClick={() => setExercisePage(safeExercisePage + 1)}
                        className="flex flex-[1.5] items-center justify-center gap-1.5 rounded-2xl bg-sky-500 py-3.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 active:scale-95"
                      >
                        <span>
                          Prossimo:{" "}
                          {activeDay.exercises[safeExercisePage]?.name}
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("cover");
                          setShowSummaryTable(true);
                        }}
                        className="flex flex-[1.5] items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 py-3.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-95"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Termina Allenamento
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Tabella Storica Completa (apribile dalla copertina o a fine allenamento) */}
      {showSummaryTable && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Table className="h-4 w-4 text-sky-400" />
              <h4 className="text-sm font-bold text-white">
                Vista Scheda Completa — {activeDay.name}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {card.days.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDayId(d.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    d.id === activeDay.id
                      ? "bg-sky-500 text-slate-950"
                      : "bg-slate-950 text-slate-400"
                  }`}
                >
                  {d.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowSummaryTable(false)}
                className="ml-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Chiudi
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
                  <th className="min-w-[160px] border-r border-slate-800 px-3 py-2.5 font-bold uppercase tracking-wider text-sky-400">
                    {activeDay.name}
                  </th>
                  <th className="w-24 border-r border-slate-800 px-2.5 py-2.5 text-center font-bold">
                    S/R (Scheda)
                  </th>
                  {daySessions.map((sess) => {
                    const isCurrent = sess.date === selectedDate;
                    return (
                      <th
                        key={sess.id}
                        onClick={() => {
                          setSelectedDate(sess.date);
                          setExercisePage(1);
                          setMode("training");
                        }}
                        className={`min-w-[95px] cursor-pointer border-r border-slate-800 px-2 py-2 text-center transition ${
                          isCurrent
                            ? "bg-sky-500/20 text-sky-300"
                            : "hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-extrabold">
                            {formatShortPaperDate(sess.date)}
                          </span>
                          {onDeleteSessionDate && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm(
                                    `Eliminare la colonna del ${formatItalianDate(
                                      sess.date
                                    )}?`
                                  )
                                ) {
                                  onDeleteSessionDate(sess.id);
                                }
                              }}
                              className="rounded p-0.5 text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] font-semibold uppercase text-slate-400">
                          Kg • S×R
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {activeDay.exercises.map((ex, idx) => {
                  const superset = parseSupersetNames(ex.name);
                  return (
                    <tr
                      key={ex.id}
                      onClick={() => {
                        setExercisePage(idx + 1);
                        setMode("training");
                      }}
                      className="cursor-pointer hover:bg-slate-900/40"
                    >
                      <td className="border-r border-slate-800 px-3 py-2 font-medium text-white">
                        {idx + 1}. {ex.name}
                      </td>
                      <td className="border-r border-slate-800 px-2.5 py-2 text-center font-mono font-bold text-sky-300">
                        {ex.setsReps || "-"}
                      </td>
                      {daySessions.map((sess) => {
                        const w1 = sess.weightsByExercise?.[ex.id] || "";
                        const w2 = sess.weights2ByExercise?.[ex.id] || "";
                        const sNum = sess.setsByExercise?.[ex.id];
                        const r1Num = sess.repsByExercise?.[ex.id];
                        const r2Num = sess.reps2ByExercise?.[ex.id];
                        const isCurrent = sess.date === selectedDate;

                        const displayWeight =
                          superset.isSuperset && w2
                            ? `${w1 || "0"}+${w2}`
                            : w1 || "-";

                        return (
                          <td
                            key={sess.id}
                            className={`border-r border-slate-800 px-2 py-2 text-center font-mono ${
                              isCurrent
                                ? "bg-sky-500/10 font-bold text-emerald-300"
                                : "text-slate-200"
                            }`}
                          >
                            <div>{displayWeight}</div>
                            {typeof sNum === "number" &&
                              typeof r1Num === "number" && (
                                <div className="text-[10px] text-slate-400">
                                  {superset.isSuperset &&
                                  typeof r2Num === "number"
                                    ? `${sNum}×(${r1Num}+${r2Num})`
                                    : `${sNum}×${r1Num}`}
                                </div>
                              )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
