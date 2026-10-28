"use client";

import React, { useState, useEffect } from "react";
import { Athlete } from "@/types/gym";
import { X, User, Phone, Mail, KeyRound, FileText } from "lucide-react";

interface AthleteModalProps {
  isOpen: boolean;
  initialAthlete?: Athlete | null;
  onClose: () => void;
  onSave: (data: Omit<Athlete, "id" | "createdAt">, existingId?: string) => void;
}

export default function AthleteModal({
  isOpen,
  initialAthlete,
  onClose,
  onSave,
}: AthleteModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (initialAthlete) {
      setFullName(initialAthlete.fullName);
      setEmail(initialAthlete.email || "");
      setPhone(initialAthlete.phone || "");
      setPin(initialAthlete.pin || "");
      setNotes(initialAthlete.notes || "");
      setActive(initialAthlete.active);
    } else {
      setFullName("");
      setEmail("");
      setPhone("");
      setPin("");
      setNotes("");
      setActive(true);
    }
  }, [initialAthlete, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    onSave(
      {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        pin: pin.trim() || undefined,
        notes: notes.trim() || undefined,
        active,
      },
      initialAthlete?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <User className="h-5 w-5 text-sky-400" />
            {initialAthlete ? "Modifica Utente (Atleta)" : "Nuovo Utente (Atleta)"}
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
              Nome e Cognome *
            </label>
            <input
              type="text"
              required
              placeholder="Es. Roberto Mura"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Phone className="h-3.5 w-3.5" /> Telefono
              </label>
              <input
                type="text"
                placeholder="Es. 340 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <KeyRound className="h-3.5 w-3.5" /> PIN Rapido (Opzionale)
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="Es. 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Mail className="h-3.5 w-3.5" /> Email
            </label>
            <input
              type="email"
              placeholder="nome@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <FileText className="h-3.5 w-3.5" /> Note / Anamnesi / Obiettivi
            </label>
            <textarea
              rows={3}
              placeholder="Note sull'utente, infortuni pregressi, frequenza settimanale..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Utente Attivo in Palestra</p>
              <p className="text-xs text-slate-400">
                Gli utenti attivi compaiono nella schermata rapida di selezione Atleta
              </p>
            </div>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-sky-500"
            />
          </div>

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
              className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {initialAthlete ? "Salva Modifiche" : "Crea Utente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
