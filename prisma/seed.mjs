import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INITIAL_DATA = {
  athletes: [
    {
      id: "ath-roberto-mura",
      fullName: "Roberto Mura",
      email: "roberto.mura@example.com",
      phone: "340 1234567",
      pin: "1234",
      notes: "Scheda importata dal modello cartaceo originale (Giorno 1 e Giorno 2).",
      createdAt: "2026-09-28",
      active: true,
    },
    {
      id: "ath-giulia-bianchi",
      fullName: "Giulia Bianchi",
      email: "giulia.bianchi@example.com",
      phone: "333 9876543",
      pin: "0000",
      notes: "Allenamento 3 volte a settimana - focus ricomposizione corporea.",
      createdAt: "2026-10-01",
      active: true,
    },
    {
      id: "ath-marco-verdi",
      fullName: "Marco Verdi",
      email: "marco.verdi@example.com",
      phone: "347 5556677",
      pin: "1111",
      notes: "Scheda precedente in scadenza a fine mese.",
      createdAt: "2026-09-01",
      active: true,
    },
  ],
  cards: [
    {
      id: "card-roberto-autunno",
      athleteId: "ath-roberto-mura",
      title: "Scheda Multifrequenza (Giorno 1 / Giorno 2)",
      goal: "Forza e Ipertrofia Generale",
      validFrom: "2026-09-30",
      validTo: "2026-11-30",
      notes: "Trascrizione fedele della scheda cartacea di Roberto Mura.",
      archived: false,
      createdAt: "2026-09-30",
      days: [
        {
          id: "day-roberto-1",
          name: "Giorno 1",
          exercises: [
            { id: "ex-r1-1", name: "Panca Piana", setsReps: "4x8-10" },
            { id: "ex-r1-2", name: "Chest Press", setsReps: "3x-10-12" },
            { id: "ex-r1-3", name: "Squat", setsReps: "4x8-10" },
            { id: "ex-r1-4", name: "Leg Ex", setsReps: "4x12-15" },
            { id: "ex-r1-5", name: "Lat Machine", setsReps: "4x8-10" },
            { id: "ex-r1-6", name: "Pulley", setsReps: "4x12" },
            { id: "ex-r1-7", name: "Shoulder press + alzate laterali", setsReps: "4x8+10" },
            { id: "ex-r1-8", name: "Addome", setsReps: "4x10" },
          ],
        },
        {
          id: "day-roberto-2",
          name: "Giorno 2",
          exercises: [
            { id: "ex-r2-1", name: "Stacco Rumeno", setsReps: "4x10" },
            { id: "ex-r2-2", name: "Leg Curl", setsReps: "4x12" },
            { id: "ex-r2-3", name: "Pressa", setsReps: "3\\4x8-10" },
            { id: "ex-r2-4", name: "Lat Machine", setsReps: "4x6-8" },
            { id: "ex-r2-5", name: "Pulley", setsReps: "4x10" },
            { id: "ex-r2-6", name: "Posteriori ai Cavi", setsReps: "3x15-20" },
            { id: "ex-r2-7", name: "Chest press + Push Up", setsReps: "3\\4x8+max" },
            { id: "ex-r2-8", name: "Military manubri", setsReps: "4x8-10" },
            { id: "ex-r2-9", name: "Calf Machine", setsReps: "4x10" },
            { id: "ex-r2-10", name: "Addome", setsReps: "" },
          ],
        },
      ],
    },
    {
      id: "card-giulia-1",
      athleteId: "ath-giulia-bianchi",
      title: "Scheda Tonificazione Autunno",
      goal: "Ricomposizione corporea",
      validFrom: "2026-10-05",
      validTo: "2026-11-20",
      notes: "Recupero 60-90s tra le serie.",
      archived: false,
      createdAt: "2026-10-05",
      days: [
        {
          id: "day-giulia-1",
          name: "Giorno A",
          exercises: [
            { id: "ex-g1-1", name: "Hip Thrust", setsReps: "4x10-12" },
            { id: "ex-g1-2", name: "Pressa 45°", setsReps: "4x12" },
            { id: "ex-g1-3", name: "Lat Machine", setsReps: "3x12" },
          ],
        },
        {
          id: "day-giulia-2",
          name: "Giorno B",
          exercises: [
            { id: "ex-g2-1", name: "Stacco Rumeno Manubri", setsReps: "4x10" },
            { id: "ex-g2-2", name: "Shoulder Press", setsReps: "3x10-12" },
            { id: "ex-g2-3", name: "Plank + Addome", setsReps: "3x45s" },
          ],
        },
      ],
    },
    {
      id: "card-marco-1",
      athleteId: "ath-marco-verdi",
      title: "Ciclo Base Settembre-Ottobre",
      goal: "Condizionamento",
      validFrom: "2026-09-15",
      validTo: "2026-10-30",
      notes: "In scadenza: preparare nuova scheda per Novembre.",
      archived: false,
      createdAt: "2026-09-15",
      days: [
        {
          id: "day-marco-1",
          name: "Giorno 1",
          exercises: [
            { id: "ex-m1-1", name: "Chest Press", setsReps: "3x12" },
            { id: "ex-m1-2", name: "Lat Machine", setsReps: "3x12" },
            { id: "ex-m1-3", name: "Pressa", setsReps: "3x15" },
          ],
        },
      ],
    },
  ],
  logs: [
    {
      id: "log-roberto-30-09",
      cardId: "card-roberto-autunno",
      athleteId: "ath-roberto-mura",
      dayId: "day-roberto-1",
      date: "2026-09-30",
      weightsByExercise: {
        "ex-r1-1": "+15",
        "ex-r1-2": "+45",
        "ex-r1-3": "+15",
        "ex-r1-4": "+20",
        "ex-r1-5": "+35",
        "ex-r1-6": "+30",
        "ex-r1-7": "42,5",
        "ex-r1-8": "",
      },
      weights2ByExercise: {
        "ex-r1-7": "6",
      },
      setsByExercise: {
        "ex-r1-1": 4,
        "ex-r1-2": 3,
        "ex-r1-3": 4,
        "ex-r1-4": 4,
        "ex-r1-5": 4,
        "ex-r1-6": 4,
        "ex-r1-7": 4,
        "ex-r1-8": 4,
      },
      repsByExercise: {
        "ex-r1-1": 8,
        "ex-r1-2": 10,
        "ex-r1-3": 8,
        "ex-r1-4": 12,
        "ex-r1-5": 8,
        "ex-r1-6": 12,
        "ex-r1-7": 8,
        "ex-r1-8": 10,
      },
      reps2ByExercise: {
        "ex-r1-7": 10,
      },
      notes: "Annotazioni prima colonna (30/9) dalla scheda cartacea",
    },
    {
      id: "log-roberto-02-10",
      cardId: "card-roberto-autunno",
      athleteId: "ath-roberto-mura",
      dayId: "day-roberto-2",
      date: "2026-10-02",
      weightsByExercise: {
        "ex-r2-1": "5+5",
        "ex-r2-2": "+30",
        "ex-r2-3": "70",
        "ex-r2-4": "35",
        "ex-r2-5": "35",
        "ex-r2-6": "",
        "ex-r2-7": "45",
        "ex-r2-8": "6+6",
        "ex-r2-9": "+10",
        "ex-r2-10": "",
      },
      weights2ByExercise: {
        "ex-r2-7": "7+4",
      },
      setsByExercise: {
        "ex-r2-1": 4,
        "ex-r2-2": 4,
        "ex-r2-3": 4,
        "ex-r2-4": 4,
        "ex-r2-5": 4,
        "ex-r2-6": 3,
        "ex-r2-7": 4,
        "ex-r2-8": 4,
        "ex-r2-9": 4,
      },
      repsByExercise: {
        "ex-r2-1": 10,
        "ex-r2-2": 12,
        "ex-r2-3": 8,
        "ex-r2-4": 6,
        "ex-r2-5": 10,
        "ex-r2-6": 15,
        "ex-r2-7": 8,
        "ex-r2-8": 8,
        "ex-r2-9": 10,
      },
      reps2ByExercise: {
        "ex-r2-7": 10,
      },
      notes: "Annotazioni prima colonna (2/10) dalla scheda cartacea",
    },
  ],
};

async function main() {
  const count = await prisma.athlete.count();
  if (count > 0) {
    console.log(`Database già popolato con ${count} atleti.`);
    return;
  }

  for (const ath of INITIAL_DATA.athletes) {
    await prisma.athlete.create({ data: ath });
  }

  for (const card of INITIAL_DATA.cards) {
    await prisma.workoutCard.create({
      data: {
        id: card.id,
        athleteId: card.athleteId,
        title: card.title,
        goal: card.goal,
        validFrom: card.validFrom,
        validTo: card.validTo,
        notes: card.notes,
        archived: card.archived,
        createdAt: card.createdAt,
        days: {
          create: card.days.map((d, dIdx) => ({
            id: d.id,
            name: d.name,
            sortOrder: dIdx,
            exercises: {
              create: d.exercises.map((ex, eIdx) => ({
                id: ex.id,
                name: ex.name,
                setsReps: ex.setsReps,
                sortOrder: eIdx,
              })),
            },
          })),
        },
      },
    });
  }

  for (const log of INITIAL_DATA.logs) {
    await prisma.workoutSessionLog.create({ data: log });
  }

  console.log("Seed completato con successo su PostgreSQL (Prisma)!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
