"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Athlete,
  CardValidityStatus,
  GymDatabase,
  UserRole,
  WorkoutCard,
  WorkoutSessionLog,
} from "@/types/gym";
import {
  formatItalianDate,
  getCardStatus,
  loadGymDatabase,
  resetToInitialDatabase,
  saveGymDatabase,
} from "@/lib/storage";
import AthleteModal from "@/components/AthleteModal";
import CardModal from "@/components/CardModal";
import OriginalSheetModal from "@/components/OriginalSheetModal";
import WorkoutPlanEditorModal from "@/components/WorkoutPlanEditorModal";
import DailyWorkoutTracker from "@/components/DailyWorkoutTracker";
import {
  Dumbbell,
  Users,
  ClipboardList,
  Plus,
  Search,
  Calendar,
  Edit3,
  Trash2,
  Copy,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  RotateCcw,
  FileImage,
  UserCheck,
  Shield,
  ChevronRight,
  Phone,
  Mail,
  Settings2,
  Play,
} from "lucide-react";

export default function GymHomePage() {
  const [db, setDb] = useState<GymDatabase | null>(null);
  const [role, setRole] = useState<UserRole>("athlete"); // Mostriamo subito la compilazione o lasciamo switch rapido

  // Trainer state
  const [selectedAthleteFilter, setSelectedAthleteFilter] =
    useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    CardValidityStatus | "all"
  >("all");
  const [userSearch, setUserSearch] = useState("");
  const [showOnlyActiveUsers, setShowOnlyActiveUsers] = useState(false);

  // Athlete / Compilation state
  const [activeAthleteId, setActiveAthleteId] =
    useState<string>("ath-roberto-mura");
  const [activeCardIdForWorkout, setActiveCardIdForWorkout] = useState<
    string | null
  >("card-roberto-autunno");
  const [expandedCardId, setExpandedCardId] = useState<string | null>(
    "card-roberto-autunno"
  );

  // Modals state
  const [athleteModalOpen, setAthleteModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<WorkoutCard | null>(null);
  const [planEditorCardId, setPlanEditorCardId] = useState<string | null>(null);
  const [originalSheetOpen, setOriginalSheetOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loaded = loadGymDatabase();
    setDb(loaded);
  }, []);

  const persistDb = (nextDb: GymDatabase) => {
    setDb(nextDb);
    saveGymDatabase(nextDb);
  };

  // CRUD Utenti
  const handleSaveAthlete = (
    data: Omit<Athlete, "id" | "createdAt">,
    existingId?: string
  ) => {
    if (!db) return;
    if (existingId) {
      const updated = db.athletes.map((a) =>
        a.id === existingId ? { ...a, ...data } : a
      );
      persistDb({ ...db, athletes: updated });
    } else {
      const newAthlete: Athlete = {
        ...data,
        id: `ath-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      persistDb({ ...db, athletes: [newAthlete, ...db.athletes] });
      setSelectedAthleteFilter(newAthlete.id);
    }
  };

  const handleDeleteAthlete = (athlete: Athlete) => {
    if (!db) return;
    const athleteCardsCount = db.cards.filter(
      (c) => c.athleteId === athlete.id
    ).length;
    const msg =
      athleteCardsCount > 0
        ? `Eliminare "${athlete.fullName}" e le sue ${athleteCardsCount} schede associate?`
        : `Eliminare l'utente "${athlete.fullName}"?`;
    if (!window.confirm(msg)) return;

    const nextAthletes = db.athletes.filter((a) => a.id !== athlete.id);
    const nextCards = db.cards.filter((c) => c.athleteId !== athlete.id);
    const nextLogs = db.logs.filter((l) => l.athleteId !== athlete.id);

    if (selectedAthleteFilter === athlete.id) {
      setSelectedAthleteFilter("all");
    }
    if (activeAthleteId === athlete.id && nextAthletes.length > 0) {
      setActiveAthleteId(nextAthletes[0].id);
    }
    persistDb({ athletes: nextAthletes, cards: nextCards, logs: nextLogs });
  };

  // CRUD Schede
  const handleSaveCard = (
    data: Omit<WorkoutCard, "id" | "createdAt">,
    existingId?: string
  ) => {
    if (!db) return;
    if (existingId) {
      const updated = db.cards.map((c) =>
        c.id === existingId ? { ...c, ...data } : c
      );
      persistDb({ ...db, cards: updated });
    } else {
      const newCard: WorkoutCard = {
        ...data,
        id: `card-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      persistDb({ ...db, cards: [newCard, ...db.cards] });
      setExpandedCardId(newCard.id);
      setPlanEditorCardId(newCard.id);
    }
  };

  // Salvataggio automatico immediato per il Piano Esercizi della Scheda
  const handleAutoUpdateCard = (updatedCard: WorkoutCard) => {
    if (!db) return;
    const nextCards = db.cards.map((c) =>
      c.id === updatedCard.id ? updatedCard : c
    );
    persistDb({ ...db, cards: nextCards });
  };

  // Salvataggio automatico immediato per i Log giornalieri (Serie numero, Ripetizioni numero e Kg con + e -)
  const handleAutoSaveLog = (
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
  ) => {
    setDb((prevDb) => {
      if (!prevDb) return prevDb;
      const existingIndex = prevDb.logs.findIndex(
        (l) => l.cardId === cardId && l.dayId === dayId && l.date === date
      );

      const existingLog =
        existingIndex >= 0 ? prevDb.logs[existingIndex] : null;
      const updatedFields = updater(existingLog);

      let nextLogs: WorkoutSessionLog[];
      if (existingIndex >= 0 && existingLog) {
        const updatedLog: WorkoutSessionLog = {
          ...existingLog,
          weightsByExercise: updatedFields.weightsByExercise,
          setsByExercise: updatedFields.setsByExercise,
          repsByExercise: updatedFields.repsByExercise,
          notes: updatedFields.notes,
        };
        nextLogs = [...prevDb.logs];
        nextLogs[existingIndex] = updatedLog;
      } else {
        const newLog: WorkoutSessionLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          cardId,
          athleteId,
          dayId,
          date,
          weightsByExercise: updatedFields.weightsByExercise,
          setsByExercise: updatedFields.setsByExercise,
          repsByExercise: updatedFields.repsByExercise,
          notes: updatedFields.notes,
        };
        nextLogs = [...prevDb.logs, newLog];
      }

      const nextDb: GymDatabase = {
        ...prevDb,
        logs: nextLogs,
      };
      saveGymDatabase(nextDb);
      return nextDb;
    });
  };

  const handleDeleteSessionDate = (logId: string) => {
    if (!db) return;
    const nextLogs = db.logs.filter((l) => l.id !== logId);
    persistDb({ ...db, logs: nextLogs });
  };

  const handleDuplicateCard = (card: WorkoutCard) => {
    if (!db) return;
    const today = new Date();
    const nextStart = today.toISOString().slice(0, 10);
    const nextEndObj = new Date(today);
    nextEndObj.setDate(nextEndObj.getDate() + 42);
    const nextEnd = nextEndObj.toISOString().slice(0, 10);

    const duplicated: WorkoutCard = {
      ...card,
      id: `card-${Date.now()}`,
      title: `${card.title} (Rinnovo)`,
      validFrom: nextStart,
      validTo: nextEnd,
      archived: false,
      createdAt: nextStart,
      days: card.days.map((d, dIdx) => ({
        ...d,
        id: `day-${Date.now()}-${dIdx}`,
        exercises: d.exercises.map((ex, eIdx) => ({
          ...ex,
          id: `ex-${Date.now()}-${dIdx}-${eIdx}`,
        })),
      })),
    };
    persistDb({ ...db, cards: [duplicated, ...db.cards] });
  };

  const handleToggleArchiveCard = (card: WorkoutCard) => {
    if (!db) return;
    const updated = db.cards.map((c) =>
      c.id === card.id ? { ...c, archived: !c.archived } : c
    );
    persistDb({ ...db, cards: updated });
  };

  const handleDeleteCard = (card: WorkoutCard) => {
    if (!db) return;
    if (
      !window.confirm(`Eliminare definitivamente la scheda "${card.title}"?`)
    )
      return;
    const nextCards = db.cards.filter((c) => c.id !== card.id);
    const nextLogs = db.logs.filter((l) => l.cardId !== card.id);
    persistDb({ ...db, cards: nextCards, logs: nextLogs });
  };

  // Export / Import / Reset
  const handleExportJson = () => {
    if (!db) return;
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `palestra-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as GymDatabase;
        if (Array.isArray(parsed.athletes) && Array.isArray(parsed.cards)) {
          persistDb({
            athletes: parsed.athletes,
            cards: parsed.cards,
            logs: parsed.logs || [],
          });
        } else {
          alert("File JSON non valido.");
        }
      } catch {
        alert("Errore nella lettura del file JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetDemo = () => {
    if (
      !window.confirm(
        "Ripristinare i dati iniziali di esempio (inclusa la scheda di Roberto Mura)?"
      )
    )
      return;
    const fresh = resetToInitialDatabase();
    setDb(fresh);
    setSelectedAthleteFilter("all");
    setActiveAthleteId("ath-roberto-mura");
    setActiveCardIdForWorkout("card-roberto-autunno");
  };

  const filteredAthletes = useMemo(() => {
    if (!db) return [];
    return db.athletes.filter((a) => {
      if (showOnlyActiveUsers && !a.active) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        a.fullName.toLowerCase().includes(q) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.phone && a.phone.toLowerCase().includes(q))
      );
    });
  }, [db, userSearch, showOnlyActiveUsers]);

  const filteredCards = useMemo(() => {
    if (!db) return [];
    return db.cards.filter((card) => {
      if (
        selectedAthleteFilter !== "all" &&
        card.athleteId !== selectedAthleteFilter
      ) {
        return false;
      }
      if (statusFilter !== "all") {
        const st = getCardStatus(card).status;
        if (st !== statusFilter) return false;
      }
      return true;
    });
  }, [db, selectedAthleteFilter, statusFilter]);

  const kpis = useMemo(() => {
    if (!db)
      return {
        activeAthletes: 0,
        activeCards: 0,
        expiringOrExpired: 0,
        totalLogs: 0,
      };
    const activeAthletes = db.athletes.filter((a) => a.active).length;
    let activeCards = 0;
    let expiringOrExpired = 0;
    db.cards.forEach((c) => {
      const st = getCardStatus(c).status;
      if (st === "active") activeCards++;
      if (st === "expiring" || st === "expired") expiringOrExpired++;
    });
    return {
      activeAthletes,
      activeCards,
      expiringOrExpired,
      totalLogs: db.logs.length,
    };
  }, [db]);

  if (!db) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Caricamento ambiente GymCard Pro...
      </div>
    );
  }

  const getBadgeStyle = (status: CardValidityStatus) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "expiring":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "expired":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "upcoming":
        return "bg-sky-500/15 text-sky-400 border-sky-500/30";
      case "archived":
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const currentAthlete =
    db.athletes.find((a) => a.id === activeAthleteId) || db.athletes[0];
  const currentAthleteCards = db.cards.filter(
    (c) => c.athleteId === currentAthlete?.id
  );
  const selectedWorkoutCard =
    currentAthleteCards.find((c) => c.id === activeCardIdForWorkout) ||
    currentAthleteCards[0] ||
    null;

  const planEditorCard =
    db.cards.find((c) => c.id === planEditorCardId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  GymCard <span className="text-amber-400">Pro</span>
                </h1>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  Auto-Save +/- Attivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestione utenti, schede periodiche e compilazione giornaliera
                serie/carichi
              </p>
            </div>
          </div>

          {/* Switch Modalità Compilazione Atleta / Gestione Trainer + Azioni */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
              <button
                onClick={() => setRole("athlete")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  role === "athlete"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Compilazione Allenamento (+/-)
              </button>
              <button
                onClick={() => setRole("trainer")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  role === "trainer"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Gestione Utenti &amp; Schede
              </button>
            </div>

            <button
              onClick={() => setOriginalSheetOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-amber-500/50 hover:text-amber-300"
              title="Visualizza la foto della scheda cartacea di Roberto Mura"
            >
              <FileImage className="h-4 w-4 text-amber-400" />
              <span className="hidden sm:inline">Scheda Cartacea</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              title="Esporta Backup JSON"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              title="Importa Backup JSON"
            >
              <Upload className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportJson}
              className="hidden"
            />

            <button
              onClick={handleResetDemo}
              className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Ripristina dati demo iniziali"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {role === "trainer" ? (
          <>
            {/* KPI Row */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Utenti Attivi
                  </span>
                  <Users className="h-4 w-4 text-amber-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-white">
                  {kpis.activeAthletes}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    / {db.athletes.length} totali
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Schede Attive
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-emerald-400">
                  {kpis.activeCards}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">
                    In Scadenza / Scadute
                  </span>
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-amber-400">
                  {kpis.expiringOrExpired}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Allenamenti Annotati
                  </span>
                  <Clock className="h-4 w-4 text-sky-400" />
                </div>
                <p className="mt-2 text-2xl font-extrabold text-sky-400">
                  {kpis.totalLogs}
                </p>
              </div>
            </div>

            {/* Layout 2 colonne: Utenti a sinistra, Schede a destra */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* COLONNA UTENTI (5/12) */}
              <section className="lg:col-span-5">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="flex items-center gap-2 text-base font-bold text-white">
                        <Users className="h-5 w-5 text-amber-400" />
                        Utenti Palestra ({filteredAthletes.length})
                      </h2>
                      <p className="text-xs text-slate-400">
                        Seleziona un utente per filtrare le sue schede
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingAthlete(null);
                        setAthleteModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 shadow hover:bg-amber-400"
                    >
                      <Plus className="h-4 w-4" /> Nuovo Utente
                    </button>
                  </div>

                  {/* Ricerca Utenti */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Cerca utente per nome o telefono..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() =>
                        setShowOnlyActiveUsers(!showOnlyActiveUsers)
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        showOnlyActiveUsers
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      Solo attivi
                    </button>
                  </div>

                  {/* Pulsante "Tutti gli utenti" */}
                  <button
                    onClick={() => setSelectedAthleteFilter("all")}
                    className={`mb-2.5 flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                      selectedAthleteFilter === "all"
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                        : "border-slate-800/80 bg-slate-950/50 text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <span>Mostra le schede di tutti gli utenti</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                      {db.cards.length} schede
                    </span>
                  </button>

                  {/* Lista Utenti */}
                  <div className="space-y-2.5">
                    {filteredAthletes.map((athlete) => {
                      const userCards = db.cards.filter(
                        (c) => c.athleteId === athlete.id
                      );
                      const activeCard = userCards.find((c) => {
                        const st = getCardStatus(c).status;
                        return st === "active" || st === "expiring";
                      });
                      const isSelected = selectedAthleteFilter === athlete.id;

                      return (
                        <div
                          key={athlete.id}
                          onClick={() =>
                            setSelectedAthleteFilter(
                              isSelected ? "all" : athlete.id
                            )
                          }
                          className={`group cursor-pointer rounded-xl border p-3.5 transition ${
                            isSelected
                              ? "border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/5"
                              : "border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">
                                  {athlete.fullName}
                                </span>
                                {!athlete.active && (
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                                    Inattivo
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                {athlete.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />{" "}
                                    {athlete.phone}
                                  </span>
                                )}
                                {athlete.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {athlete.email}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setEditingCard(null);
                                  setSelectedAthleteFilter(athlete.id);
                                  setCardModalOpen(true);
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-500/15 hover:text-amber-400"
                                title="Nuova scheda per questo utente"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingAthlete(athlete);
                                  setAthleteModalOpen(true);
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                                title="Modifica utente"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAthlete(athlete)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400"
                                title="Elimina utente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {athlete.notes && (
                            <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                              {athlete.notes}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-xs">
                            <span className="text-slate-400">
                              Schede totali:{" "}
                              <strong className="text-slate-200">
                                {userCards.length}
                              </strong>
                            </span>
                            {activeCard ? (
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getBadgeStyle(
                                  getCardStatus(activeCard).status
                                )}`}
                              >
                                {getCardStatus(activeCard).label}
                              </span>
                            ) : (
                              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] text-rose-300">
                                Nessuna scheda attiva
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredAthletes.length === 0 && (
                      <p className="py-8 text-center text-sm text-slate-500">
                        Nessun utente trovato.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* COLONNA SCHEDE (7/12) */}
              <section className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="flex items-center gap-2 text-base font-bold text-white">
                        <ClipboardList className="h-5 w-5 text-amber-400" />
                        Schede di Allenamento ({filteredCards.length})
                      </h2>
                      <p className="text-xs text-slate-400">
                        {selectedAthleteFilter === "all"
                          ? "Visualizzazione di tutte le schede registrate"
                          : `Schede filtrate per: ${
                              db.athletes.find(
                                (a) => a.id === selectedAthleteFilter
                              )?.fullName || ""
                            }`}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingCard(null);
                        setCardModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow hover:bg-amber-400"
                    >
                      <Plus className="h-4 w-4" /> Nuova Scheda
                    </button>
                  </div>

                  {/* Filtro stato validità scheda */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "all", label: "Tutte" },
                        { id: "active", label: "Attive" },
                        { id: "expiring", label: "In Scadenza" },
                        { id: "expired", label: "Scadute" },
                        { id: "upcoming", label: "Programmate" },
                        { id: "archived", label: "Archiviate" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                          statusFilter === tab.id
                            ? "border-amber-500 bg-amber-500/15 text-amber-300"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Elenco Schede */}
                  <div className="space-y-4">
                    {filteredCards.map((card) => {
                      const athlete = db.athletes.find(
                        (a) => a.id === card.athleteId
                      );
                      const statusInfo = getCardStatus(card);
                      const cardLogs = db.logs.filter(
                        (l) => l.cardId === card.id
                      );
                      const isExpanded = expandedCardId === card.id;

                      return (
                        <div
                          key={card.id}
                          className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 transition hover:border-slate-700"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                                  {athlete?.fullName || "Utente sconosciuto"}
                                </span>
                                <span
                                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getBadgeStyle(
                                    statusInfo.status
                                  )}`}
                                >
                                  {statusInfo.label}
                                </span>
                              </div>
                              <h3 className="mt-2 text-base font-bold text-white">
                                {card.title}
                              </h3>
                              {card.goal && (
                                <p className="text-xs text-slate-400">
                                  Obiettivo:{" "}
                                  <span className="text-slate-300">
                                    {card.goal}
                                  </span>
                                </p>
                              )}
                            </div>

                            {/* Azioni Scheda */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setActiveAthleteId(card.athleteId);
                                  setActiveCardIdForWorkout(card.id);
                                  setRole("athlete");
                                }}
                                className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                                title="Vai alla compilazione giornaliera con + e -"
                              >
                                <Play className="h-3.5 w-3.5" />
                                Compila (+/-)
                              </button>
                              <button
                                onClick={() => setPlanEditorCardId(card.id)}
                                className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:border-amber-500/50"
                                title="Configura esercizi e Serie/Ripetizioni dei giorni"
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                                Esercizi
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCard(card);
                                  setCardModalOpen(true);
                                }}
                                className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:border-amber-500/50 hover:text-amber-400"
                                title="Modifica periodo e dati scheda"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicateCard(card)}
                                className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:border-amber-500/50 hover:text-amber-400"
                                title="Duplica / Rinnova scheda per nuovo periodo"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleArchiveCard(card)}
                                className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:border-amber-500/50 hover:text-amber-400"
                                title={
                                  card.archived
                                    ? "Ripristina dall'archivio"
                                    : "Archivia scheda"
                                }
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCard(card)}
                                className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:border-rose-500/50 hover:text-rose-400"
                                title="Elimina scheda"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Barra Validità & Statistiche */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3.5 py-2 text-xs">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <Calendar className="h-3.5 w-3.5 text-amber-400" />
                              Validità:{" "}
                              <strong>
                                {formatItalianDate(card.validFrom)}
                              </strong>{" "}
                              →{" "}
                              <strong>{formatItalianDate(card.validTo)}</strong>
                            </span>
                            <div className="flex items-center gap-3 text-slate-400">
                              <span>
                                <strong className="text-white">
                                  {card.days.length}
                                </strong>{" "}
                                giorni
                              </span>
                              <span>•</span>
                              <span>
                                <strong className="text-white">
                                  {cardLogs.length}
                                </strong>{" "}
                                sessioni annotate
                              </span>
                            </div>
                          </div>

                          {card.notes && (
                            <p className="mt-2.5 text-xs italic text-slate-400">
                              &ldquo;{card.notes}&rdquo;
                            </p>
                          )}

                          {/* Anteprima Giorni della Scheda */}
                          <div className="mt-3 border-t border-slate-800/80 pt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1.5">
                                {card.days.map((d) => (
                                  <span
                                    key={d.id}
                                    className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300"
                                  >
                                    {d.name}{" "}
                                    <span className="text-slate-500">
                                      ({d.exercises.length} es.)
                                    </span>
                                  </span>
                                ))}
                              </div>

                              <button
                                onClick={() =>
                                  setExpandedCardId(
                                    isExpanded ? null : card.id
                                  )
                                }
                                className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300"
                              >
                                {isExpanded
                                  ? "Nascondi anteprima"
                                  : "Vedi struttura"}
                                <ChevronRight
                                  className={`h-4 w-4 transition ${
                                    isExpanded ? "rotate-90" : ""
                                  }`}
                                />
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {card.days.map((day) => (
                                  <div
                                    key={day.id}
                                    className="rounded-xl border border-slate-800 bg-slate-900/90 p-3"
                                  >
                                    <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-1.5">
                                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                        {day.name}
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        S/R
                                      </span>
                                    </div>
                                    {day.exercises.length === 0 ? (
                                      <p className="py-2 text-xs text-slate-500">
                                        Nessun esercizio configurato. Clicca su
                                        &ldquo;Esercizi&rdquo; per aggiungerli.
                                      </p>
                                    ) : (
                                      <ul className="space-y-1 text-xs">
                                        {day.exercises.map((ex) => (
                                          <li
                                            key={ex.id}
                                            className="flex items-center justify-between gap-2 text-slate-300"
                                          >
                                            <span className="truncate">
                                              {ex.name}
                                            </span>
                                            <span className="shrink-0 font-mono text-[11px] text-amber-300">
                                              {ex.setsReps || "-"}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredCards.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-800 py-12 text-center">
                        <p className="text-sm text-slate-400">
                          Nessuna scheda trovata con i filtri selezionati.
                        </p>
                        <button
                          onClick={() => {
                            setEditingCard(null);
                            setCardModalOpen(true);
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950"
                        >
                          <Plus className="h-4 w-4" /> Crea la prima scheda
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : (
          /* MODALITÀ COMPILAZIONE GIORNALIERA (ATLETA / SALA PESI) */
          <div className="space-y-5">
            {/* Barra selezione Utente e Scheda */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Sala Pesi — Compilazione Rapida (Zero pulsante Salva)
                  </span>
                  <h2 className="mt-0.5 text-lg font-extrabold text-white">
                    Seleziona Atleta e Scheda
                  </h2>
                </div>

                {/* Scelta Utente */}
                <div className="flex flex-wrap gap-2">
                  {db.athletes
                    .filter((a) => a.active)
                    .map((ath) => {
                      const isSelected = currentAthlete?.id === ath.id;
                      return (
                        <button
                          key={ath.id}
                          onClick={() => {
                            setActiveAthleteId(ath.id);
                            const firstCard = db.cards.find(
                              (c) => c.athleteId === ath.id && !c.archived
                            );
                            if (firstCard) {
                              setActiveCardIdForWorkout(firstCard.id);
                            }
                          }}
                          className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                            isSelected
                              ? "border-amber-500 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                              : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          {ath.fullName}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Se l'utente ha più schede, permette di scegliere quale compilare */}
              {currentAthleteCards.length > 1 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                  <span className="text-xs text-slate-400">
                    Schede di {currentAthlete?.fullName}:
                  </span>
                  {currentAthleteCards.map((c) => {
                    const st = getCardStatus(c);
                    const isSelected = selectedWorkoutCard?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setActiveCardIdForWorkout(c.id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/15 text-amber-300"
                            : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>{c.title}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${getBadgeStyle(
                            st.status
                          )}`}
                        >
                          {st.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Componente Compilazione Giornaliera con + e - e Auto-Save */}
            {currentAthlete && selectedWorkoutCard ? (
              <DailyWorkoutTracker
                athlete={currentAthlete}
                card={selectedWorkoutCard}
                logs={db.logs}
                onAutoSaveLog={handleAutoSaveLog}
                onDeleteSessionDate={handleDeleteSessionDate}
                onOpenPlanEditor={(c) => setPlanEditorCardId(c.id)}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 py-12 text-center text-sm text-slate-400">
                Nessuna scheda disponibile per questo utente. Passa a{" "}
                <strong>Gestione Utenti &amp; Schede</strong> per crearne una.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AthleteModal
        isOpen={athleteModalOpen}
        initialAthlete={editingAthlete}
        onClose={() => setAthleteModalOpen(false)}
        onSave={handleSaveAthlete}
      />

      <CardModal
        isOpen={cardModalOpen}
        athletes={db.athletes}
        defaultAthleteId={
          selectedAthleteFilter !== "all"
            ? selectedAthleteFilter
            : db.athletes[0]?.id
        }
        initialCard={editingCard}
        onClose={() => setCardModalOpen(false)}
        onSave={handleSaveCard}
      />

      <WorkoutPlanEditorModal
        isOpen={Boolean(planEditorCard)}
        card={planEditorCard}
        onClose={() => setPlanEditorCardId(null)}
        onAutoUpdateCard={handleAutoUpdateCard}
      />

      <OriginalSheetModal
        isOpen={originalSheetOpen}
        onClose={() => setOriginalSheetOpen(false)}
      />
    </div>
  );
}
