"use client";

import React, { useState } from "react";
import {
  Athlete,
  WorkoutCard,
  WorkoutDay,
  WorkoutSessionLog,
} from "@/types/gym";
import {
  extractPlannedSetsAndReps,
  formatShortPaperDate,
  getLastExerciseHistory,
  parseWeightComponents,
  stepWeightString,
} from "@/lib/workoutHelpers";
import { formatItalianDate } from "@/lib/storage";
import {
  Calendar,
  Check,
  CheckCircle2,
  Dumbbell,
  History,
  Minus,
  Plus,
  Settings2,
  Sparkles,
  Table,
  Trash2,
} from "lucide-react";

interface DailyWorkoutTrackerProps {
  athlete: Athlete;
  card: WorkoutCard;
  logs: WorkoutSessionLog[];
  /** Registra istantaneamente qualsiasi modifica ai log senza bisogno di pulsante Salva */
  onAutoSaveLog: (
    cardId: string,
    athleteId: string,
    dayId: string,
    date: string,
    updater: (prevLog: WorkoutSessionLog | null) => {
      weightsByExercise: Record<string, string>;
      setsByExercise: Record<string, number>;
      repsByExercise: Record<string, number>;
      notes?: string;
    }
  ) => void;
  onDeleteSessionDate?: (logId: string) => void;
  onOpenPlanEditor?: (card: WorkoutCard) => void;
}

export default function DailyWorkoutTracker({
  athlete,
  card,
  logs,
  onAutoSaveLog,
  onDeleteSessionDate,
  onOpenPlanEditor,
}: DailyWorkoutTrackerProps) {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [selectedDayId, setSelectedDayId] = useState<string>(
    card.days[0]?.id || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [weightStep, setWeightStep] = useState<number>(2.5);
  const [lastAutoSaveInfo, setLastAutoSaveInfo] = useState<string | null>(null);

  const activeDay: WorkoutDay | undefined =
    card.days.find((d) => d.id === selectedDayId) || card.days[0];

  // Tutte le sessioni registrate per questo Giorno della scheda, ordinate cronologicamente
  const daySessions = logs
    .filter((l) => l.cardId === card.id && l.dayId === activeDay?.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Sessione della data selezionata (se già creata)
  const currentSession =
    daySessions.find((l) => l.date === selectedDate) || null;

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
   * Restituisce per ciascun esercizio:
   * - effectiveSets: singolo numero intero per le Serie (registrato oggi, oppure proposto dalla scheda/ultima volta)
   * - effectiveReps: singolo numero intero per le Ripetizioni (registrato oggi, oppure proposto dalla scheda/ultima volta)
   * - effectiveWeight: carico Kg (registrato oggi, oppure proposto dall'ultima volta)
   */
  const getExerciseState = (exId: string, plannedSetsReps: string) => {
    const planned = extractPlannedSetsAndReps(plannedSetsReps);
    const history = getLastExerciseHistory(
      logs,
      card.id,
      activeDay.id,
      exId,
      selectedDate
    );

    const savedWeightInSession = currentSession?.weightsByExercise?.[exId];
    const savedSetsInSession = currentSession?.setsByExercise?.[exId];
    const savedRepsInSession = currentSession?.repsByExercise?.[exId];

    const hasSavedWeightToday =
      savedWeightInSession !== undefined && savedWeightInSession !== "";
    const hasSavedSetsToday = typeof savedSetsInSession === "number";
    const hasSavedRepsToday = typeof savedRepsInSession === "number";

    const effectiveWeight = hasSavedWeightToday
      ? savedWeightInSession
      : history.lastWeight;

    const effectiveSets = hasSavedSetsToday
      ? savedSetsInSession
      : history.lastSets ?? planned.sets;

    const effectiveReps = hasSavedRepsToday
      ? savedRepsInSession
      : history.lastReps ?? planned.reps;

    return {
      effectiveWeight,
      effectiveSets,
      effectiveReps,
      hasSavedWeightToday,
      hasSavedSetsToday,
      hasSavedRepsToday,
      hasAnySavedToday:
        hasSavedWeightToday || hasSavedSetsToday || hasSavedRepsToday,
      lastWeight: history.lastWeight,
      lastSets: history.lastSets,
      lastReps: history.lastReps,
      lastDate: history.lastDate,
      plannedSets: planned.sets,
      plannedReps: planned.reps,
    };
  };

  /**
   * Registra istantaneamente una modifica a Serie (numero), Ripetizioni (numero) o Carico (Kg)
   * preservando gli altri valori proposti dell'esercizio nella data corrente.
   */
  const commitExerciseChange = (
    exId: string,
    exName: string,
    plannedSetsReps: string,
    patch: {
      sets?: number;
      reps?: number;
      weight?: string;
    },
    logLabel: string
  ) => {
    const state = getExerciseState(exId, plannedSetsReps);
    const nextSetsVal =
      patch.sets !== undefined ? Math.max(1, patch.sets) : state.effectiveSets;
    const nextRepsVal =
      patch.reps !== undefined ? Math.max(1, patch.reps) : state.effectiveReps;
    const nextWeightVal =
      patch.weight !== undefined ? patch.weight : state.effectiveWeight;

    onAutoSaveLog(
      card.id,
      athlete.id,
      activeDay.id,
      selectedDate,
      (prevLog) => {
        const nextWeights = { ...(prevLog?.weightsByExercise || {}) };
        const nextSetsMap = { ...(prevLog?.setsByExercise || {}) };
        const nextRepsMap = { ...(prevLog?.repsByExercise || {}) };

        nextSetsMap[exId] = nextSetsVal;
        nextRepsMap[exId] = nextRepsVal;
        nextWeights[exId] = nextWeightVal;

        return {
          weightsByExercise: nextWeights,
          setsByExercise: nextSetsMap,
          repsByExercise: nextRepsMap,
          notes: prevLog?.notes,
        };
      }
    );

    markSaved(`${exName} → ${logLabel}`);
  };

  /**
   * Conferma con un solo clic tutti i valori proposti (Serie, Ripetizioni e ultimi Carichi) per la data selezionata
   */
  const confirmAllProposedForToday = () => {
    onAutoSaveLog(
      card.id,
      athlete.id,
      activeDay.id,
      selectedDate,
      (prevLog) => {
        const nextWeights = { ...(prevLog?.weightsByExercise || {}) };
        const nextSetsMap = { ...(prevLog?.setsByExercise || {}) };
        const nextRepsMap = { ...(prevLog?.repsByExercise || {}) };

        activeDay.exercises.forEach((ex) => {
          const st = getExerciseState(ex.id, ex.setsReps);
          if (nextWeights[ex.id] === undefined && st.effectiveWeight) {
            nextWeights[ex.id] = st.effectiveWeight;
          }
          if (typeof nextSetsMap[ex.id] !== "number") {
            nextSetsMap[ex.id] = st.effectiveSets;
          }
          if (typeof nextRepsMap[ex.id] !== "number") {
            nextRepsMap[ex.id] = st.effectiveReps;
          }
        });

        return {
          weightsByExercise: nextWeights,
          setsByExercise: nextSetsMap,
          repsByExercise: nextRepsMap,
          notes: prevLog?.notes,
        };
      }
    );
    markSaved(`Confermati tutti i proposti per ${activeDay.name}`);
  };

  return (
    <div className="space-y-5">
      {/* Barra di controllo superiore: Selezione Giorno, Data e Step Kg */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                {athlete.fullName}
              </span>
              <h3 className="text-base font-extrabold text-white sm:text-lg">
                {card.title}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              In compilazione traccia il{" "}
              <strong className="text-slate-200">numero di Serie</strong>, il{" "}
              <strong className="text-slate-200">numero di Ripetizioni</strong>{" "}
              e il <strong className="text-slate-200">Carico (Kg)</strong> con{" "}
              <strong className="text-amber-300">+</strong> e{" "}
              <strong className="text-amber-300">-</strong> (salvataggio
              immediato).
            </p>
          </div>

          {/* Indicatore Salvataggio Istantaneo + Bottone Configura Scheda */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>
                {lastAutoSaveInfo
                  ? `Registrato: ${lastAutoSaveInfo}`
                  : "Auto-salvataggio istantaneo attivo"}
              </span>
            </div>

            {onOpenPlanEditor && (
              <button
                type="button"
                onClick={() => onOpenPlanEditor(card)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-amber-500/50 hover:text-amber-300"
              >
                <Settings2 className="h-3.5 w-3.5 text-amber-400" />
                Modifica Scheda (Range S/R)
              </button>
            )}
          </div>
        </div>

        {/* Riga selettori: Giorni della scheda | Data allenamento | Step +/- Kg */}
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs Giorno 1 / Giorno 2 */}
          <div className="flex flex-wrap items-center gap-2">
            {card.days.map((day) => {
              const isSelected = day.id === activeDay.id;
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-extrabold transition ${
                    isSelected
                      ? "border-amber-500 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                      : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  <Dumbbell className="h-4 w-4" />
                  {day.name}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      isSelected
                        ? "bg-slate-950/20 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {day.exercises.length} es.
                  </span>
                </button>
              );
            })}
          </div>

          {/* Data di compilazione + Step incremento Kg */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Data Allenamento */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Data Allenamento
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) =>
                    e.target.value && setSelectedDate(e.target.value)
                  }
                  className="bg-transparent text-xs font-bold text-white focus:outline-none"
                />
              </div>
              {selectedDate !== todayIso && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayIso)}
                  className="ml-1 rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25"
                >
                  Oggi
                </button>
              )}
            </div>

            {/* Selettore Step +/- Kg */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5">
              <span className="text-[11px] font-semibold text-slate-400">
                Passo +/- Kg:
              </span>
              {[0.5, 1, 2.5, 5].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setWeightStep(step)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                    weightStep === step
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {String(step).replace(".", ",")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Storico date rapide del Giorno selezionato */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <History className="h-3.5 w-3.5 text-amber-400" /> Sessioni{" "}
              {activeDay.name}:
            </span>
            {daySessions.map((sess) => {
              const isSelected = sess.date === selectedDate;
              return (
                <button
                  key={sess.id}
                  type="button"
                  onClick={() => setSelectedDate(sess.date)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/20 text-amber-300"
                      : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {formatShortPaperDate(sess.date)}
                </button>
              );
            })}
            {!daySessions.some((s) => s.date === selectedDate) && (
              <span className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                {formatShortPaperDate(selectedDate)} (Da compilare)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={confirmAllProposedForToday}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
            title="Registra nella data selezionata tutti i valori proposti"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Conferma tutti i proposti ({formatShortPaperDate(selectedDate)})
          </button>
        </div>
      </div>

      {/* Lista Esercizi del Giorno: Numero Serie | Numero Ripetizioni | Carico Kg */}
      <div className="space-y-3">
        {activeDay.exercises.map((ex, idx) => {
          const state = getExerciseState(ex.id, ex.setsReps);
          const parsedWeight = parseWeightComponents(state.effectiveWeight);
          const isMultiPartWeight =
            parsedWeight.isNumeric && parsedWeight.parts.length > 1;

          return (
            <div
              key={ex.id}
              className={`rounded-2xl border p-4 transition ${
                state.hasAnySavedToday
                  ? "border-emerald-500/40 bg-slate-900/90 shadow-md shadow-emerald-500/5"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 lg:items-center">
                {/* 1. Nome Esercizio + Range S/R della scheda + Ultima volta (4/12) */}
                <div className="lg:col-span-4">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-xs font-extrabold text-amber-400">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-extrabold text-white">
                          {ex.name || "Esercizio senza nome"}
                        </h4>
                        {state.hasAnySavedToday && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            <Check className="h-3 w-3" /> Registrato{" "}
                            {formatShortPaperDate(selectedDate)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        {/* Range previsto nella scheda */}
                        <span className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-slate-200">
                          Scheda S/R:{" "}
                          <strong className="font-mono text-amber-300">
                            {ex.setsReps || "-"}
                          </strong>
                        </span>

                        {/* Info ultima volta */}
                        {state.lastDate ? (
                          <span className="rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-sky-300">
                            Ultima ({formatShortPaperDate(state.lastDate)}):{" "}
                            <strong className="font-mono">
                              {state.lastWeight || "-"} Kg
                            </strong>
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Primo inserimento
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SERIE (solo numero intero) con - e + (2/12) */}
                <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-2.5 lg:col-span-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Serie
                    </span>
                    {!state.hasSavedSetsToday && (
                      <span className="text-[10px] text-amber-400/80">
                        Proposto
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        commitExerciseChange(
                          ex.id,
                          ex.name,
                          ex.setsReps,
                          { sets: Math.max(1, state.effectiveSets - 1) },
                          `Serie: ${Math.max(1, state.effectiveSets - 1)}`
                        )
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800 active:scale-95"
                      title="-1 Serie"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={state.effectiveSets}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!Number.isNaN(val) && val > 0) {
                          commitExerciseChange(
                            ex.id,
                            ex.name,
                            ex.setsReps,
                            { sets: val },
                            `Serie: ${val}`
                          );
                        }
                      }}
                      className={`h-10 w-full min-w-[2.5rem] rounded-xl border text-center font-mono text-base font-extrabold focus:border-amber-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        state.hasSavedSetsToday
                          ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                          : "border-slate-700 bg-slate-900 text-amber-300"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        commitExerciseChange(
                          ex.id,
                          ex.name,
                          ex.setsReps,
                          { sets: state.effectiveSets + 1 },
                          `Serie: ${state.effectiveSets + 1}`
                        )
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow hover:bg-amber-400 active:scale-95"
                      title="+1 Serie"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 3. RIPETIZIONI (solo numero intero) con - e + (2/12) */}
                <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-2.5 lg:col-span-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Ripetizioni
                    </span>
                    {!state.hasSavedRepsToday && (
                      <span className="text-[10px] text-amber-400/80">
                        Proposto
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        commitExerciseChange(
                          ex.id,
                          ex.name,
                          ex.setsReps,
                          { reps: Math.max(1, state.effectiveReps - 1) },
                          `Ripetizioni: ${Math.max(1, state.effectiveReps - 1)}`
                        )
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800 active:scale-95"
                      title="-1 Ripetizione"
                    >
                      <Minus className="h-4 w-4" />
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
                            ex.id,
                            ex.name,
                            ex.setsReps,
                            { reps: val },
                            `Ripetizioni: ${val}`
                          );
                        }
                      }}
                      className={`h-10 w-full min-w-[2.5rem] rounded-xl border text-center font-mono text-base font-extrabold focus:border-amber-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        state.hasSavedRepsToday
                          ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                          : "border-slate-700 bg-slate-900 text-amber-300"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        commitExerciseChange(
                          ex.id,
                          ex.name,
                          ex.setsReps,
                          { reps: state.effectiveReps + 1 },
                          `Ripetizioni: ${state.effectiveReps + 1}`
                        )
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow hover:bg-amber-400 active:scale-95"
                      title="+1 Ripetizione"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 4. CARICO (Kg) con - e + (4/12) */}
                <div className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-2.5 lg:col-span-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Carico (Kg)
                    </span>
                    {!state.hasSavedWeightToday && state.lastWeight ? (
                      <button
                        type="button"
                        onClick={() =>
                          commitExerciseChange(
                            ex.id,
                            ex.name,
                            ex.setsReps,
                            { weight: state.effectiveWeight },
                            `Carico: ${state.effectiveWeight} Kg`
                          )
                        }
                        className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/25"
                        title="Tocca per confermare lo stesso carico dell'ultima volta"
                      >
                        Proposto da ultima volta • Conferma
                      </button>
                    ) : state.hasSavedWeightToday ? (
                      <span className="text-[10px] font-semibold text-emerald-400">
                        Registrato
                      </span>
                    ) : null}
                  </div>

                  {/* Riga principale: Bottone [-]  Input Kg  Bottone [+] */}
                  <div className="flex items-center gap-1.5">
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
                          ex.id,
                          ex.name,
                          ex.setsReps,
                          { weight: nextW },
                          `Carico: ${nextW} Kg`
                        );
                      }}
                      className="flex h-10 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800 active:scale-95"
                      title={`Diminuisci di ${weightStep} Kg`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <input
                      type="text"
                      value={state.effectiveWeight}
                      placeholder="Es. +15 o 70"
                      onChange={(e) =>
                        commitExerciseChange(
                          ex.id,
                          ex.name,
                          ex.setsReps,
                          { weight: e.target.value },
                          `Carico: ${e.target.value || "vuoto"} Kg`
                        )
                      }
                      className={`h-10 w-full rounded-xl border px-2.5 text-center font-mono text-base font-extrabold focus:border-amber-500 focus:outline-none ${
                        state.hasSavedWeightToday
                          ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                          : "border-slate-700 bg-slate-900 text-white"
                      }`}
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
                          ex.id,
                          ex.name,
                          ex.setsReps,
                          { weight: nextW },
                          `Carico: ${nextW} Kg`
                        );
                      }}
                      className="flex h-10 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow hover:bg-amber-400 active:scale-95"
                      title={`Aumenta di ${weightStep} Kg`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Se il carico è combinato (es. "42,5+6", "5+5", "45+7+4"), mostra controlli +/- separati per ogni singolo peso */}
                  {isMultiPartWeight && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-800/80 pt-2">
                      <span className="text-[10px] text-slate-400">
                        Singoli pesi:
                      </span>
                      {parsedWeight.parts.map((partVal, partIdx) => (
                        <div
                          key={partIdx}
                          className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-1.5 py-0.5"
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
                                ex.id,
                                ex.name,
                                ex.setsReps,
                                { weight: nextW },
                                `Carico: ${nextW} Kg`
                              );
                            }}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                            title={`-${weightStep} Kg sul peso ${partIdx + 1}`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-xs font-bold text-amber-300">
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
                                ex.id,
                                ex.name,
                                ex.setsReps,
                                { weight: nextW },
                                `Carico: ${nextW} Kg`
                              );
                            }}
                            className="rounded p-0.5 text-amber-400 hover:bg-slate-800"
                            title={`+${weightStep} Kg sul peso ${partIdx + 1}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista Tabella Scheda Cartacea: Colonna S/R mostra i range della scheda, le colonne data mostrano Kg e (Serie x Rip) effettivi */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              Vista Scheda Completa — {activeDay.name}
            </h4>
          </div>
          <span className="text-xs text-slate-400">
            La colonna S/R mostra i range della scheda; le colonne data mostrano
            i carichi e le serie/ripetizioni svolte
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
                <th className="min-w-[180px] border-r border-slate-800 px-3.5 py-2.5 font-bold uppercase tracking-wider text-amber-400">
                  {activeDay.name}
                </th>
                <th className="w-28 border-r border-slate-800 px-3 py-2.5 text-center font-bold">
                  S/R (Scheda)
                </th>
                {daySessions.map((sess) => {
                  const isCurrent = sess.date === selectedDate;
                  return (
                    <th
                      key={sess.id}
                      onClick={() => setSelectedDate(sess.date)}
                      className={`min-w-[105px] cursor-pointer border-r border-slate-800 px-2.5 py-2 text-center transition ${
                        isCurrent
                          ? "bg-amber-500/20 text-amber-300"
                          : "hover:bg-slate-800"
                      }`}
                      title={`Passa alla sessione del ${formatItalianDate(
                        sess.date
                      )}`}
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
                            title="Elimina colonna data"
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
                {!daySessions.some((s) => s.date === selectedDate) && (
                  <th className="min-w-[105px] border-r border-slate-800 bg-amber-500/10 px-2.5 py-2 text-center text-amber-300">
                    <div className="font-mono text-xs font-extrabold">
                      {formatShortPaperDate(selectedDate)}
                    </div>
                    <div className="text-[10px] font-semibold uppercase">
                      Proposto
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {activeDay.exercises.map((ex) => {
                const state = getExerciseState(ex.id, ex.setsReps);
                return (
                  <tr key={ex.id} className="hover:bg-slate-900/40">
                    <td className="border-r border-slate-800 px-3.5 py-2 font-medium text-white">
                      {ex.name}
                    </td>
                    {/* Nella visualizzazione della scheda si usa il range previsto */}
                    <td className="border-r border-slate-800 px-3 py-2 text-center font-mono font-bold text-amber-300">
                      {ex.setsReps || "-"}
                    </td>
                    {daySessions.map((sess) => {
                      const w = sess.weightsByExercise?.[ex.id] || "";
                      const sNum = sess.setsByExercise?.[ex.id];
                      const rNum = sess.repsByExercise?.[ex.id];
                      const isCurrent = sess.date === selectedDate;
                      return (
                        <td
                          key={sess.id}
                          onClick={() => setSelectedDate(sess.date)}
                          className={`cursor-pointer border-r border-slate-800 px-2.5 py-2 text-center font-mono ${
                            isCurrent
                              ? "bg-amber-500/10 font-bold text-emerald-300"
                              : "text-slate-200"
                          }`}
                        >
                          <div>{w || "-"}</div>
                          {typeof sNum === "number" &&
                            typeof rNum === "number" && (
                              <div className="text-[10px] text-slate-400">
                                {sNum}×{rNum}
                              </div>
                            )}
                        </td>
                      );
                    })}
                    {!daySessions.some((s) => s.date === selectedDate) && (
                      <td className="border-r border-slate-800 bg-amber-500/5 px-2.5 py-2 text-center font-mono text-slate-500">
                        <div>{state.effectiveWeight || "-"}</div>
                        <div className="text-[10px]">
                          {state.effectiveSets}×{state.effectiveReps}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
