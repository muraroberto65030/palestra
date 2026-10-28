"use client";

import React, { useState } from "react";
import { ExerciseRow, WorkoutCard, WorkoutDay } from "@/types/gym";
import { stepSetsRepsString } from "@/lib/workoutHelpers";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Dumbbell,
  CheckCircle2,
  Minus,
} from "lucide-react";

interface WorkoutPlanEditorModalProps {
  isOpen: boolean;
  card: WorkoutCard | null;
  onClose: () => void;
  /** Salva istantaneamente ogni modifica alla scheda senza pulsante Salva */
  onAutoUpdateCard: (updatedCard: WorkoutCard) => void;
}

export default function WorkoutPlanEditorModal({
  isOpen,
  card,
  onClose,
  onAutoUpdateCard,
}: WorkoutPlanEditorModalProps) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  if (!isOpen || !card) return null;

  const safeDayIdx = Math.min(activeDayIdx, Math.max(0, card.days.length - 1));
  const currentDay: WorkoutDay | undefined = card.days[safeDayIdx];

  const triggerAutoSave = (nextDays: WorkoutDay[]) => {
    onAutoUpdateCard({
      ...card,
      days: nextDays,
    });
    const now = new Date();
    setLastSavedAt(
      now.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  };

  const handleAddDay = () => {
    const nextNum = card.days.length + 1;
    const newDay: WorkoutDay = {
      id: `day-${Date.now()}-${nextNum}`,
      name: `Giorno ${nextNum}`,
      exercises: [
        {
          id: `ex-${Date.now()}-1`,
          name: "Nuovo Esercizio",
          setsReps: "4x10",
        },
      ],
    };
    const nextDays = [...card.days, newDay];
    triggerAutoSave(nextDays);
    setActiveDayIdx(nextDays.length - 1);
  };

  const handleRenameDay = (dayId: string, name: string) => {
    const nextDays = card.days.map((d) =>
      d.id === dayId ? { ...d, name } : d
    );
    triggerAutoSave(nextDays);
  };

  const handleRemoveDay = (dayId: string) => {
    if (card.days.length <= 1) return;
    if (!window.confirm("Eliminare questo giorno e i relativi esercizi?")) return;
    const nextDays = card.days.filter((d) => d.id !== dayId);
    triggerAutoSave(nextDays);
    setActiveDayIdx(0);
  };

  const handleAddExercise = () => {
    if (!currentDay) return;
    const newEx: ExerciseRow = {
      id: `ex-${Date.now()}-${currentDay.exercises.length + 1}`,
      name: "",
      setsReps: "4x8-10",
    };
    const nextDays = card.days.map((d) =>
      d.id === currentDay.id
        ? { ...d, exercises: [...d.exercises, newEx] }
        : d
    );
    triggerAutoSave(nextDays);
  };

  const handleUpdateExercise = (
    exId: string,
    patch: Partial<ExerciseRow>
  ) => {
    if (!currentDay) return;
    const nextDays = card.days.map((d) =>
      d.id === currentDay.id
        ? {
            ...d,
            exercises: d.exercises.map((ex) =>
              ex.id === exId ? { ...ex, ...patch } : ex
            ),
          }
        : d
    );
    triggerAutoSave(nextDays);
  };

  const handleMoveExercise = (index: number, direction: -1 | 1) => {
    if (!currentDay) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentDay.exercises.length) return;
    const cloned = [...currentDay.exercises];
    const [moved] = cloned.splice(index, 1);
    cloned.splice(targetIndex, 0, moved);
    const nextDays = card.days.map((d) =>
      d.id === currentDay.id ? { ...d, exercises: cloned } : d
    );
    triggerAutoSave(nextDays);
  };

  const handleDeleteExercise = (exId: string) => {
    if (!currentDay) return;
    const nextDays = card.days.map((d) =>
      d.id === currentDay.id
        ? { ...d, exercises: d.exercises.filter((ex) => ex.id !== exId) }
        : d
    );
    triggerAutoSave(nextDays);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-sky-400" />
              <h3 className="text-lg font-bold text-white">
                Piano di Allenamento — {card.title}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Ogni modifica a esercizi e Serie/Ripetizioni (S/R) viene registrata automaticamente
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {lastSavedAt
                ? `Salvato alle ${lastSavedAt}`
                : "Salvataggio automatico attivo"}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs Giorni */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {card.days.map((day, idx) => (
              <button
                key={day.id}
                onClick={() => setActiveDayIdx(idx)}
                className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                  safeDayIdx === idx
                    ? "border-sky-500 bg-sky-500 text-slate-950 shadow"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                }`}
              >
                {day.name || `Giorno ${idx + 1}`}{" "}
                <span className="opacity-75">({day.exercises.length})</span>
              </button>
            ))}
            <button
              onClick={handleAddDay}
              className="flex items-center gap-1 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:border-sky-500"
            >
              <Plus className="h-3.5 w-3.5" /> Aggiungi Giorno
            </button>
          </div>

          {currentDay && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentDay.name}
                onChange={(e) => handleRenameDay(currentDay.id, e.target.value)}
                className="w-36 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white focus:border-sky-500 focus:outline-none"
                placeholder="Nome giorno..."
              />
              {card.days.length > 1 && (
                <button
                  onClick={() => handleRemoveDay(currentDay.id)}
                  className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
                  title="Elimina questo giorno"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Corpo Esercizi del Giorno */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentDay ? (
            <div className="space-y-3">
              {currentDay.exercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 sm:flex-row sm:items-center"
                >
                  {/* Ordine */}
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-bold text-sky-400">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveExercise(idx, -1)}
                        className="text-slate-500 hover:text-white disabled:opacity-25"
                        title="Sposta su"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === currentDay.exercises.length - 1}
                        onClick={() => handleMoveExercise(idx, 1)}
                        className="text-slate-500 hover:text-white disabled:opacity-25"
                        title="Sposta giù"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Nome Esercizio */}
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Esercizio
                    </label>
                    <input
                      type="text"
                      value={ex.name}
                      placeholder="Es. Panca Piana, Squat, Lat Machine..."
                      onChange={(e) =>
                        handleUpdateExercise(ex.id, { name: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* Serie / Ripetizioni S/R con + e - */}
                  <div className="w-full sm:w-72">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Serie x Ripetizioni (S/R) previste
                    </label>
                    <div className="flex items-center gap-1.5">
                      {/* Stepper Serie */}
                      <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateExercise(ex.id, {
                              setsReps: stepSetsRepsString(
                                ex.setsReps,
                                -1,
                                "sets"
                              ),
                            })
                          }
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                          title="-1 Serie"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-1 text-[10px] font-bold text-slate-400">
                          S
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateExercise(ex.id, {
                              setsReps: stepSetsRepsString(
                                ex.setsReps,
                                1,
                                "sets"
                              ),
                            })
                          }
                          className="rounded p-1 text-sky-400 hover:bg-slate-800"
                          title="+1 Serie"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={ex.setsReps}
                        placeholder="Es. 4x8-10"
                        onChange={(e) =>
                          handleUpdateExercise(ex.id, {
                            setsReps: e.target.value,
                          })
                        }
                        className="w-28 flex-1 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2 text-center font-mono text-sm font-bold text-sky-300 focus:border-sky-500 focus:outline-none"
                      />

                      {/* Stepper Ripetizioni */}
                      <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateExercise(ex.id, {
                              setsReps: stepSetsRepsString(
                                ex.setsReps,
                                -1,
                                "reps"
                              ),
                            })
                          }
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                          title="-1 Ripetizione"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-1 text-[10px] font-bold text-slate-400">
                          R
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateExercise(ex.id, {
                              setsReps: stepSetsRepsString(
                                ex.setsReps,
                                1,
                                "reps"
                              ),
                            })
                          }
                          className="rounded p-1 text-sky-400 hover:bg-slate-800"
                          title="+1 Ripetizione"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Elimina Esercizio */}
                  <div className="flex justify-end sm:pt-4">
                    <button
                      type="button"
                      onClick={() => handleDeleteExercise(ex.id)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/15 hover:text-rose-400"
                      title="Rimuovi esercizio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddExercise}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 py-3 text-xs font-bold text-sky-400 transition hover:border-sky-500 hover:bg-sky-500/10"
              >
                <Plus className="h-4 w-4" /> Aggiungi Esercizio a {currentDay.name}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
