"use client";

import React, { useState, useRef } from "react";
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
  parseWeightComponents,
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
  History,
  Minus,
  Plus,
  Settings2,
  Sparkles,
  Table,
  Trash2,
  SlidersHorizontal,
  Play,
  BookOpen,
  Sun,
  Moon,
  Sparkle,
  Palette,
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
  theme = "dark",
  onChangeTheme,
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

  /**
   * Navigazione a pagine:
   * - currentPage = 0 -> Copertina (dati allenamento, scelta giorno, data, impostazioni)
   * - currentPage = 1..N -> Pagina dell'esercizio (currentPage - 1) in sequenza
   */
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [showSummaryTable, setShowSummaryTable] = useState<boolean>(false);

  // Gestione Swipe Touch sinistra/destra
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const activeDay: WorkoutDay | undefined =
    card.days.find((d) => d.id === selectedDayId) || card.days[0];

  const totalExercises = activeDay ? activeDay.exercises.length : 0;
  // Indice pagina sicuro (0 = copertina, 1..totalExercises = esercizi)
  const safePage = Math.min(currentPage, totalExercises);

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

  // Gestori Touch Swipe Sinistra / Destra
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (
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

    // Verifica che sia uno swipe orizzontale netto (almeno 50px e più orizzontale che verticale)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0 && safePage < totalExercises) {
        // Swipe verso sinistra -> pagina successiva
        setCurrentPage(safePage + 1);
      } else if (deltaX > 0 && safePage > 0) {
        // Swipe verso destra -> pagina precedente
        setCurrentPage(safePage - 1);
      }
    }
  };

  const completedTodayCount = activeDay.exercises.filter(
    (ex) => getExerciseState(ex.id, ex.setsReps).hasAnySavedToday
  ).length;

  const currentExercise =
    safePage >= 1 ? activeDay.exercises[safePage - 1] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Barra di navigazione Pagine (Copertina + Pagina 1..N) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setCurrentPage(Math.max(0, safePage - 1))}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-300 transition hover:border-sky-500/50 hover:text-white disabled:opacity-30"
            title="Pagina precedente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Indicatori Pagina scorrevoli */}
          <div className="flex flex-1 items-center justify-center gap-1.5 overflow-x-auto px-1 py-1">
            <button
              type="button"
              onClick={() => setCurrentPage(0)}
              className={`flex shrink-0 items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                safePage === 0
                  ? "border-sky-500 bg-sky-500 text-slate-950 shadow"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Copertina
            </button>

            {activeDay.exercises.map((ex, idx) => {
              const pageNum = idx + 1;
              const isCurrent = safePage === pageNum;
              const isSaved = getExerciseState(
                ex.id,
                ex.setsReps
              ).hasAnySavedToday;

              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-extrabold transition ${
                    isCurrent
                      ? "border-sky-500 bg-sky-500 text-slate-950 shadow"
                      : isSaved
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                  title={`Pag. ${pageNum}: ${ex.name}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={safePage >= totalExercises}
            onClick={() =>
              setCurrentPage(Math.min(totalExercises, safePage + 1))
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-300 transition hover:border-sky-500/50 hover:text-white disabled:opacity-30"
            title="Pagina successiva"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Stato Auto-Save e Indicatore Swipe */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2 text-[11px]">
          <span className="flex items-center gap-1 font-medium text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {lastAutoSaveInfo
              ? `Salvato: ${lastAutoSaveInfo}`
              : "Auto-save istantaneo (+/-)"}
          </span>

          <span className="text-slate-400">
            {safePage === 0
              ? `Copertina • ${completedTodayCount}/${totalExercises} es. registrati`
              : `Pag. ${safePage} di ${totalExercises} • Scorri ← → per cambiare esercizio`}
          </span>
        </div>
      </div>

      {/* CONTENITORE SWIPE SINISTRA / DESTRA */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="select-none"
      >
        {safePage === 0 ? (
          /* ==========================================
             PAGINA 0: COPERTINA ALLENAMENTO & IMPOSTAZIONI
             ========================================== */
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl sm:p-6">
            {/* Intestazione Scheda / Copertina */}
            <div className="border-b border-slate-800 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-sky-400">
                  Copertina Allenamento
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

            {/* 1. Scelta del Giorno di Allenamento */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Dumbbell className="h-4 w-4 text-sky-400" /> 1. Scegli il
                Giorno di Allenamento
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {card.days.map((day) => {
                  const isSelected = day.id === activeDay.id;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        setSelectedDayId(day.id);
                        setCurrentPage(0);
                      }}
                      className={`flex flex-col items-start justify-between rounded-2xl border p-3.5 text-left transition ${
                        isSelected
                          ? "border-sky-500 bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20"
                          : "border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <span className="text-base font-extrabold">
                        {day.name}
                      </span>
                      <span
                        className={`mt-1 text-xs font-semibold ${
                          isSelected ? "text-slate-950/80" : "text-slate-400"
                        }`}
                      >
                        {day.exercises.length} esercizi previsti
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Data dell'allenamento e Sessioni precedenti */}
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
                      className="shrink-0 rounded-xl bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/25"
                    >
                      Oggi
                    </button>
                  )}
                </div>

                {/* Storico date rapide */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <History className="h-3 w-3 text-sky-400" /> Storico{" "}
                    {activeDay.name}:
                  </span>
                  {daySessions.map((sess) => (
                    <button
                      key={sess.id}
                      type="button"
                      onClick={() => setSelectedDate(sess.date)}
                      className={`rounded-lg border px-2 py-0.5 text-xs font-bold transition ${
                        sess.date === selectedDate
                          ? "border-sky-500 bg-sky-500/20 text-sky-300"
                          : "border-slate-800 bg-slate-900 text-slate-300"
                      }`}
                    >
                      {formatShortPaperDate(sess.date)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Impostazioni Incremento +/- Kg e Azioni Rapide */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" />{" "}
                  3. Passo Incremento +/- (Kg)
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

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={confirmAllProposedForToday}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/20"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Conferma tutti i proposti
                  </button>

                  {onOpenPlanEditor && (
                    <button
                      type="button"
                      onClick={() => onOpenPlanEditor(card)}
                      className="flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      <Settings2 className="h-3.5 w-3.5 text-sky-400" />
                      Modifica Scheda
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Preferenze Tema (Scuro / Light / Grigio Metallizzato) */}
            {onChangeTheme && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
                <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Palette className="h-3.5 w-3.5 text-sky-400" /> 4.
                  Preferenze Tema (Aspetto)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeTheme("dark")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-2 text-xs font-extrabold transition ${
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
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-2 text-xs font-extrabold transition ${
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
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-2 text-xs font-extrabold transition ${
                      theme === "metallic"
                        ? "border-sky-500 bg-sky-500 text-slate-950 shadow"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Sparkle className="h-3.5 w-3.5 shrink-0" />
                    <span>Grigio Metallizzato</span>
                  </button>
                </div>
              </div>
            )}

            {/* Anteprima rapida sequenza esercizi del giorno (toccabili per andare direttamente alla pagina) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sequenza Esercizi — {activeDay.name} ({completedTodayCount}/
                  {totalExercises} completati)
                </span>
                <button
                  type="button"
                  onClick={() => setShowSummaryTable(!showSummaryTable)}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  <Table className="h-3.5 w-3.5" />
                  {showSummaryTable ? "Nascondi Tabella" : "Tabella Storica"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {activeDay.exercises.map((ex, idx) => {
                  const st = getExerciseState(ex.id, ex.setsReps);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setCurrentPage(idx + 1)}
                      className="flex items-center justify-between rounded-xl border border-slate-800/90 bg-slate-900/90 px-3 py-2 text-left text-xs transition hover:border-sky-500/50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            st.hasAnySavedToday
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-sky-400"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate font-semibold text-white">
                          {ex.name}
                        </span>
                      </div>
                      <span className="ml-2 shrink-0 font-mono text-[11px] text-sky-300">
                        {ex.setsReps || "-"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pulsante Grande per partire con Pagina 1 */}
            {totalExercises > 0 && (
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-base font-extrabold text-slate-950 shadow-xl shadow-sky-500/20 transition hover:bg-sky-400 active:scale-[0.99]"
              >
                <Play className="h-5 w-5 fill-current" />
                Inizia da Pagina 1: {activeDay.exercises[0]?.name}
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : currentExercise ? (
          /* ==========================================
             PAGINA 1..N: SINGOLO ESERCIZIO A SCHERMO INTERO CON SWIPE
             ========================================== */
          (() => {
            const state = getExerciseState(
              currentExercise.id,
              currentExercise.setsReps
            );
            const parsedWeight = parseWeightComponents(state.effectiveWeight);
            const isMultiPartWeight =
              parsedWeight.isNumeric && parsedWeight.parts.length > 1;

            return (
              <div
                key={currentExercise.id}
                className={`space-y-5 rounded-2xl border p-5 shadow-2xl transition sm:p-6 ${
                  state.hasAnySavedToday
                    ? "border-emerald-500/50 bg-slate-900/95"
                    : "border-slate-800 bg-slate-900/90"
                }`}
              >
                {/* Header Pagina Esercizio */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-sky-500 px-3 py-1 text-xs font-extrabold text-slate-950">
                      Pagina {safePage} di {totalExercises}
                    </span>
                    <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-300">
                      {activeDay.name} • {formatShortPaperDate(selectedDate)}
                    </span>
                  </div>

                  {state.hasAnySavedToday ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      <Check className="h-3.5 w-3.5" /> Registrato oggi
                    </span>
                  ) : (
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                      Valori proposti pronti
                    </span>
                  )}
                </div>

                {/* Titolo Esercizio & Target Scheda + Ultimo Carico */}
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {currentExercise.name || "Esercizio"}
                  </h2>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-300/80">
                        Previsto da Scheda (Range)
                      </span>
                      <span className="mt-0.5 block font-mono text-lg font-extrabold text-sky-300">
                        {currentExercise.setsReps || "Libero"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-300/90">
                        {state.lastDate
                          ? `Ultima Volta (${formatShortPaperDate(
                              state.lastDate
                            )})`
                          : "Storico Carico"}
                      </span>
                      <span className="mt-0.5 block font-mono text-lg font-extrabold text-indigo-300">
                        {state.lastWeight
                          ? `${state.lastWeight} Kg`
                          : "Nessun dato"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controlli Grandi Mobile: 1. SERIE (numero) | 2. RIPETIZIONI (numero) */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {/* Box SERIE */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                        Serie (Numero)
                      </span>
                      <span className="text-[11px] font-semibold text-sky-400">
                        {state.hasSavedSetsToday ? "Registrato" : "Proposto"}
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
                            { sets: Math.max(1, state.effectiveSets - 1) },
                            `Serie: ${Math.max(1, state.effectiveSets - 1)}`
                          )
                        }
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 active:scale-95"
                        title="-1 Serie"
                      >
                        <Minus className="h-6 w-6" />
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
                              currentExercise.id,
                              currentExercise.name,
                              currentExercise.setsReps,
                              { sets: val },
                              `Serie: ${val}`
                            );
                          }
                        }}
                        className={`h-14 w-full rounded-2xl border text-center font-mono text-2xl font-extrabold focus:border-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                          state.hasSavedSetsToday
                            ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                            : "border-slate-700 bg-slate-900 text-sky-300"
                        }`}
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
                        title="+1 Serie"
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
                      <span className="text-[11px] font-semibold text-sky-400">
                        {state.hasSavedRepsToday ? "Registrato" : "Proposto"}
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
                        className={`h-14 w-full rounded-2xl border text-center font-mono text-2xl font-extrabold focus:border-sky-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                          state.hasSavedRepsToday
                            ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                            : "border-slate-700 bg-slate-900 text-sky-300"
                        }`}
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

                {/* 3. Box CARICO (Kg) con + e - grandi */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                      Carico (Kg) • Passo {String(weightStep).replace(".", ",")}{" "}
                      Kg
                    </span>

                    {!state.hasSavedWeightToday && state.lastWeight ? (
                      <button
                        type="button"
                        onClick={() =>
                          commitExerciseChange(
                            currentExercise.id,
                            currentExercise.name,
                            currentExercise.setsReps,
                            { weight: state.effectiveWeight },
                            `Carico: ${state.effectiveWeight} Kg`
                          )
                        }
                        className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-bold text-sky-300 hover:bg-sky-500/25"
                      >
                        Conferma uguale ({state.effectiveWeight} Kg)
                      </button>
                    ) : null}
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
                      className={`h-14 w-full rounded-2xl border px-3 text-center font-mono text-2xl font-extrabold focus:border-sky-500 focus:outline-none ${
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

                  {/* Controlli +/- per singoli pesi se combinato (es. 42,5+6 o 45+7+4) */}
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

                {/* Pulsanti Navigazione Pagine Precedente / Successivo in fondo alla Card */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(safePage - 1)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-950 py-3.5 text-xs font-extrabold text-slate-200 transition hover:border-slate-600 active:scale-95"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {safePage === 1
                      ? "Torna a Copertina"
                      : `Es. ${safePage - 1}`}
                  </button>

                  {safePage < totalExercises ? (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(safePage + 1)}
                      className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl bg-sky-500 py-3.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 active:scale-95"
                    >
                      <span>
                        Prossimo: {activeDay.exercises[safePage]?.name}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage(0);
                        setShowSummaryTable(true);
                      }}
                      className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 py-3.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Fine Giorno • Torna a Copertina
                    </button>
                  )}
                </div>
              </div>
            );
          })()
        ) : null}
      </div>

      {/* Tabella Storica Completa (opzionale/apribile dalla copertina o a fine allenamento) */}
      {showSummaryTable && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Table className="h-4 w-4 text-sky-400" />
              <h4 className="text-sm font-bold text-white">
                Vista Scheda Completa — {activeDay.name}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowSummaryTable(false)}
              className="text-xs font-semibold text-slate-400 hover:text-white"
            >
              Chiudi tabella
            </button>
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
                        onClick={() => setSelectedDate(sess.date)}
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
                {activeDay.exercises.map((ex, idx) => (
                  <tr
                    key={ex.id}
                    onClick={() => setCurrentPage(idx + 1)}
                    className="cursor-pointer hover:bg-slate-900/40"
                  >
                    <td className="border-r border-slate-800 px-3 py-2 font-medium text-white">
                      {idx + 1}. {ex.name}
                    </td>
                    <td className="border-r border-slate-800 px-2.5 py-2 text-center font-mono font-bold text-sky-300">
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
                          className={`border-r border-slate-800 px-2 py-2 text-center font-mono ${
                            isCurrent
                              ? "bg-sky-500/10 font-bold text-emerald-300"
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
