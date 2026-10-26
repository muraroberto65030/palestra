"use client";

import React from "react";
import { X, FileImage } from "lucide-react";

interface OriginalSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OriginalSheetModal({ isOpen, onClose }: OriginalSheetModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Scheda Cartacea Originale — Roberto Mura
              </h3>
              <p className="text-xs text-slate-400">
                Riferimento utilizzato per pre-caricare l&apos;utente e la sua scheda (Giorno 1 e Giorno 2)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/scheda-originale.jpg"
              alt="Scheda di allenamento cartacea Roberto Mura"
              className="mx-auto max-h-[70vh] w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
