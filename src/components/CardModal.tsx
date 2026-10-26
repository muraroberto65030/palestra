"use client";

import React, { useState, useEffect } from "react";
import { Athlete, WorkoutCard, WorkoutDay } from "@/types/gym";
import { X, Calendar, ClipboardList, Plus, Trash2, Target } from "lucide-react";

interface CardModalProps {
  isOpen: boolean;
  athletes: Athlete[];
  defaultAthleteId?: string;
  initialCard?: WorkoutCard | null;
  onClose: () => void;
  onSave: (
    data: Omit<WorkoutCard, "id" | "createdAt">,
    existingId?: string
  ) => void;
}

export default function CardModal({
  isOpen,
  athletes,
  defaultAthleteId,
  initialCard,
  onClose,
  onSave,
}: CardModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextMonthDate = new Date();
  nextMonthDate.setDate(nextMonthDate.getDate() + 42); // ~6 settimane default
  const defaultEndStr = nextMonthDate.toISOString().slice(0, 10);

  const [athleteId, setAthleteId] = useState("");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [validFrom, setValidFrom] = useState(todayStr);
  const [validTo, setValidTo] = useState(defaultEndStr);
  const [notes, setNotes] = useState("");
  const [archived, setArchived] = useState(false);
  const [days, setDays] = useState<WorkoutDay[]>([]);

  useEffect(() => {
    if (initialCard) {
      setAthleteId(initialCard.athleteId);
      setTitle(initialCard.title);
      setGoal(initialCard.goal || "");
      setValidFrom(initialCard.validFrom);
      setValidTo(initialCard.validTo);
      setNotes(initialCard.notes || "");
      setArchived(Boolean(initialCard.archived));
      setDays(initialCard.days);
    } else {
      setAthleteId(defaultAthleteId || athletes[0]?.id || "");
      setTitle("");
      setGoal("");
      setValidFrom(todayStr);
      setValidTo(defaultEndStr);
      setNotes("");
      setArchived(false);
      setDays([
        { id: `day-${Date.now()}-1`, name: "Giorno 1", exercises: [] },
        { id: `day-${Date.now()}-2`, name: "Giorno 2", exercises: [] },
      ]);
    }
  }, [initialCard, defaultAthleteId, athletes, isOpen, todayStr, defaultEndStr]);

  if (!isOpen) return null;

  const handleAddDay = () => {
    const nextNum = days.length + 1;
    setDays([
      ...days,
      {
        id: `day-${Date.now()}-${nextNum}`,
        name: `Giorno ${nextNum}`,
        exercises: [],
      },
    ]);
  };

  const handleRenameDay = (dayId: string, newName: string) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, name: newName } : d)));
  };

  const handleRemoveDay = (dayId: string) => {
    if (days.length <= 1) return;
    setDays(days.filter((d) => d.id !== dayId));
  };

  const setQuickDuration = (weeks: number) => {
    const base = validFrom ? new Date(validFrom + "T00:00:00") : new Date();
    base.setDate(base.getDate() + weeks * 7);
    setValidTo(base.toISOString().slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!athleteId || !title.trim() || !validFrom || !validTo) return;
    onSave(
      {
        athleteId,
        title: title.trim(),
        goal: goal.trim() || undefined,
        validFrom,
        validTo,
        notes: notes.trim() || undefined,
        archived,
        days,
      },
      initialCard?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <ClipboardList className="h-5 w-5 text-amber-400" />
            {initialCard ? "Modifica Scheda di Allenamento" : "Nuova Scheda di Allenamento"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Utente (Atleta) *
            </label>
            <select
              required
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="" disabled>
                Seleziona un utente...
              </option>
              {athletes.map((ath) => (
                <option key={ath.id} value={ath.id}>
                  {ath.fullName} {!ath.active ? "(Non attivo)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Nome / Titolo Scheda *
              </label>
              <input
                type="text"
                required
                placeholder="Es. Scheda Autunno - Giorno 1/2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Target className="h-3.5 w-3.5" /> Obiettivo
              </label>
              <input
                type="text"
                placeholder="Es. Ipertrofia / Forza"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <Calendar className="h-3.5 w-3.5" /> Periodo di Validità della Scheda
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Durata rapida:</span>
                {[4, 6, 8].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setQuickDuration(w)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs font-medium text-slate-300 hover:border-amber-500 hover:text-amber-400"
                  >
                    {w} sett.
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Valida dal *</label>
                <input
                  type="date"
                  required
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Valida fino al *</label>
                <input
                  type="date"
                  required
                  min={validFrom}
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Suddivisione Giorni Scheda ({days.length})
              </label>
              <button
                type="button"
                onClick={handleAddDay}
                className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-slate-700"
              >
                <Plus className="h-3.5 w-3.5" /> Aggiungi Giorno
              </button>
            </div>
            <div className="space-y-2">
              {days.map((day, idx) => (
                <div
                  key={day.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-400">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={day.name}
                    onChange={(e) => handleRenameDay(day.id, e.target.value)}
                    placeholder={`Giorno ${idx + 1}`}
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">
                    {day.exercises.length} esercizi
                  </span>
                  {days.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDay(day.id)}
                      className="rounded p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                      title="Rimuovi giorno"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Nella Fase 2 potrai compilare e modificare nel dettaglio tutti gli esercizi, le S/R e le colonne Kg di ciascun giorno.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Note della Scheda
            </label>
            <textarea
              rows={2}
              placeholder="Indicazioni sui tempi di recupero, riscaldamento, progressione..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {initialCard && (
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-white">Scheda Archiviata</p>
                <p className="text-xs text-slate-400">
                  Sposta la scheda nello storico senza cancellare i dati registrati
                </p>
              </div>
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
                className="h-5 w-5 accent-amber-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              {initialCard ? "Salva Scheda" : "Crea Scheda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
