"use client";

import React, { useState } from "react";
import { AppTheme, Athlete, AuthSession } from "@/types/gym";
import {
  Dumbbell,
  KeyRound,
  LogIn,
  Shield,
  UserCheck,
  AlertCircle,
  Moon,
  Sun,
  Sparkle,
} from "lucide-react";

interface LoginScreenProps {
  athletes: Athlete[];
  theme: AppTheme;
  onChangeTheme: (nextTheme: AppTheme) => void;
  onLogin: (session: AuthSession) => void;
}

const TRAINER_VALID_PINS = ["admin", "1234", "0000"];

export default function LoginScreen({
  athletes,
  theme,
  onChangeTheme,
  onLogin,
}: LoginScreenProps) {
  const activeAthletes = athletes.filter((a) => a.active);
  const [isTrainerMode, setIsTrainerMode] = useState<boolean>(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(
    activeAthletes[0]?.id || athletes[0]?.id || ""
  );
  const [pinInput, setPinInput] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isTrainerMode) {
      const cleaned = pinInput.trim().toLowerCase();
      if (cleaned && !TRAINER_VALID_PINS.includes(cleaned)) {
        setErrorMsg("PIN Trainer non valido (usa 1234 o admin per la demo).");
        return;
      }
      onLogin({
        role: "trainer",
        displayName: "Trainer / Istruttore",
        loggedInAt: new Date().toISOString(),
      });
      return;
    }

    // Login Atleta
    if (!selectedAthlete) {
      setErrorMsg("Seleziona un utente atleta per accedere.");
      return;
    }

    if (
      selectedAthlete.pin &&
      pinInput.trim() !== "" &&
      pinInput.trim() !== selectedAthlete.pin
    ) {
      setErrorMsg(
        `PIN errato per ${selectedAthlete.fullName} (PIN demo: ${selectedAthlete.pin}).`
      );
      return;
    }

    onLogin({
      role: "athlete",
      athleteId: selectedAthlete.id,
      displayName: selectedAthlete.fullName,
      loggedInAt: new Date().toISOString(),
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl sm:p-8">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25">
            <Dumbbell className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            GymCard <span className="text-sky-400">Pro</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Accedi per compilare il tuo allenamento o gestire le schede
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Spunta per scegliere se entrare in modalità Trainer o Atleta */}
          <label
            htmlFor="trainer-mode-checkbox"
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
              isTrainerMode
                ? "border-sky-500 bg-sky-500/10"
                : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
            }`}
          >
            <input
              id="trainer-mode-checkbox"
              type="checkbox"
              checked={isTrainerMode}
              onChange={(e) => {
                setIsTrainerMode(e.target.checked);
                setErrorMsg(null);
                setPinInput("");
              }}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-sky-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Shield className="h-4 w-4 text-sky-400" />
                Entra in modalità Trainer
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {isTrainerMode
                  ? "Accesso completo a gestione utenti, creazione schede e storico."
                  : "Lascia deselezionato per entrare come Atleta e compilare la tua scheda."}
              </p>
            </div>
          </label>

          {/* Campi specifici in base alla spunta */}
          {!isTrainerMode ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <UserCheck className="h-3.5 w-3.5 text-sky-400" /> Seleziona
                  Profilo Atleta
                </label>
                <select
                  value={selectedAthleteId}
                  onChange={(e) => {
                    setSelectedAthleteId(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-sky-500 focus:outline-none"
                >
                  {activeAthletes.map((ath) => (
                    <option key={ath.id} value={ath.id}>
                      {ath.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <KeyRound className="h-3.5 w-3.5 text-sky-400" /> PIN
                    Atleta (Opzionale)
                  </label>
                  {selectedAthlete?.pin && (
                    <span className="text-[11px] text-slate-500">
                      PIN demo: <strong className="text-slate-300">{selectedAthlete.pin}</strong>
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="Lascia vuoto per accesso rapido o inserisci PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <KeyRound className="h-3.5 w-3.5 text-sky-400" /> Codice /
                    PIN Trainer
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Demo: <strong className="text-slate-300">1234</strong> o vuoto
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="Inserisci PIN Trainer (es. 1234)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 active:scale-[0.99]"
          >
            <LogIn className="h-4 w-4" />
            {isTrainerMode
              ? "Accedi come Trainer"
              : `Accedi come ${selectedAthlete?.fullName || "Atleta"}`}
          </button>

          {/* Scelta rapida Tema anche nella schermata di Login */}
          <div className="border-t border-slate-800 pt-4">
            <span className="mb-2 block text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Preferenza Tema
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onChangeTheme("dark")}
                className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition ${
                  theme === "dark"
                    ? "border-sky-500 bg-sky-500 text-slate-950"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                <Moon className="h-3.5 w-3.5" /> Scuro
              </button>
              <button
                type="button"
                onClick={() => onChangeTheme("light")}
                className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition ${
                  theme === "light"
                    ? "border-sky-500 bg-sky-500 text-slate-950"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                <Sun className="h-3.5 w-3.5" /> Light
              </button>
              <button
                type="button"
                onClick={() => onChangeTheme("metallic")}
                className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition ${
                  theme === "metallic"
                    ? "border-sky-500 bg-sky-500 text-slate-950"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                <Sparkle className="h-3.5 w-3.5" /> Metallizzato
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
