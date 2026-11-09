import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_GYM_DATA } from "@/lib/initialData";
import {
  Athlete,
  GymDatabase,
  WorkoutCard,
  WorkoutSessionLog,
} from "@/types/gym";

export const dynamic = "force-dynamic";

function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("errorCode" in error && typeof error.errorCode === "string") {
    return error.errorCode;
  }
  if (
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("P")
  ) {
    return error.code;
  }
  return undefined;
}

function getDatabaseErrorMessage(error: unknown, operation: string): string {
  if (!process.env.DATABASE_URL?.trim()) {
    return "DATABASE_URL non è configurata per questa distribuzione Vercel.";
  }

  const code = getPrismaErrorCode(error);
  if (code === "P1000") {
    return "Autenticazione PostgreSQL fallita (Prisma P1000). Verifica le credenziali in DATABASE_URL.";
  }
  if (code === "P1001") {
    return "PostgreSQL non è raggiungibile da Vercel (Prisma P1001). Verifica host, rete e disponibilità del database.";
  }
  if (code === "P2021") {
    return "Le tabelle dell'app non esistono nel database (Prisma P2021). Va applicato lo schema Prisma.";
  }

  return code
    ? `Errore ${operation} del database PostgreSQL (Prisma ${code}).`
    : `Errore ${operation} del database PostgreSQL. Controlla i log della funzione su Vercel.`;
}

async function seedDatabaseIfEmpty() {
  const count = await prisma.athlete.count();
  if (count > 0) return;

  await replaceFullDatabase(INITIAL_GYM_DATA);
}

async function replaceFullDatabase(data: GymDatabase) {
  await prisma.$transaction(async (tx) => {
    await tx.workoutSessionLog.deleteMany({});
    await tx.exerciseRow.deleteMany({});
    await tx.workoutDay.deleteMany({});
    await tx.workoutCard.deleteMany({});
    await tx.athlete.deleteMany({});

    for (const ath of data.athletes) {
      await tx.athlete.create({
        data: {
          id: ath.id,
          fullName: ath.fullName,
          email: ath.email ?? null,
          phone: ath.phone ?? null,
          pin: ath.pin ?? null,
          notes: ath.notes ?? null,
          createdAt: ath.createdAt,
          active: ath.active,
        },
      });
    }

    for (const card of data.cards) {
      await tx.workoutCard.create({
        data: {
          id: card.id,
          athleteId: card.athleteId,
          title: card.title,
          goal: card.goal ?? null,
          validFrom: card.validFrom,
          validTo: card.validTo,
          notes: card.notes ?? null,
          archived: Boolean(card.archived),
          createdAt: card.createdAt,
          days: {
            create: card.days.map((day, dIdx) => ({
              id: day.id,
              name: day.name,
              sortOrder: dIdx,
              exercises: {
                create: day.exercises.map((ex, eIdx) => ({
                  id: ex.id,
                  name: ex.name,
                  setsReps: ex.setsReps,
                  notes: ex.notes ?? null,
                  sortOrder: eIdx,
                })),
              },
            })),
          },
        },
      });
    }

    for (const log of data.logs) {
      await tx.workoutSessionLog.create({
        data: {
          id: log.id,
          cardId: log.cardId,
          athleteId: log.athleteId,
          dayId: log.dayId,
          date: log.date,
          weightsByExercise: log.weightsByExercise ?? {},
          weights2ByExercise: log.weights2ByExercise ?? {},
          setsByExercise: log.setsByExercise ?? {},
          repsByExercise: log.repsByExercise ?? {},
          reps2ByExercise: log.reps2ByExercise ?? {},
          notes: log.notes ?? null,
        },
      });
    }
  });
}

async function fetchFullDatabase(): Promise<GymDatabase> {
  const [athletes, cards, logs] = await Promise.all([
    prisma.athlete.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.workoutCard.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        days: {
          orderBy: { sortOrder: "asc" },
          include: {
            exercises: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }),
    prisma.workoutSessionLog.findMany({
      orderBy: { date: "asc" },
    }),
  ]);

  return {
    athletes: athletes.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      email: a.email ?? undefined,
      phone: a.phone ?? undefined,
      pin: a.pin ?? undefined,
      notes: a.notes ?? undefined,
      createdAt: a.createdAt,
      active: a.active,
    })),
    cards: cards.map((c) => ({
      id: c.id,
      athleteId: c.athleteId,
      title: c.title,
      goal: c.goal ?? undefined,
      validFrom: c.validFrom,
      validTo: c.validTo,
      notes: c.notes ?? undefined,
      archived: c.archived,
      createdAt: c.createdAt,
      days: c.days.map((d) => ({
        id: d.id,
        name: d.name,
        exercises: d.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          setsReps: e.setsReps,
          notes: e.notes ?? undefined,
        })),
      })),
    })),
    logs: logs.map((l) => ({
      id: l.id,
      cardId: l.cardId,
      athleteId: l.athleteId,
      dayId: l.dayId,
      date: l.date,
      weightsByExercise: (l.weightsByExercise as Record<string, string>) || {},
      weights2ByExercise:
        (l.weights2ByExercise as Record<string, string>) || {},
      setsByExercise: (l.setsByExercise as Record<string, number>) || {},
      repsByExercise: (l.repsByExercise as Record<string, number>) || {},
      reps2ByExercise: (l.reps2ByExercise as Record<string, number>) || {},
      notes: l.notes ?? undefined,
    })),
  };
}

function mergeLogs(
  existing: WorkoutSessionLog,
  incoming: WorkoutSessionLog
): WorkoutSessionLog {
  const weightsByExercise: Record<string, string> = {
    ...(existing.weightsByExercise || {}),
  };
  for (const [exId, val] of Object.entries(incoming.weightsByExercise || {})) {
    if (val && val.trim() !== "") {
      weightsByExercise[exId] = val;
    }
  }

  const weights2ByExercise: Record<string, string> = {
    ...(existing.weights2ByExercise || {}),
  };
  for (const [exId, val] of Object.entries(incoming.weights2ByExercise || {})) {
    if (val && val.trim() !== "") {
      weights2ByExercise[exId] = val;
    }
  }

  const setsByExercise: Record<string, number> = {
    ...(existing.setsByExercise || {}),
  };
  for (const [exId, val] of Object.entries(incoming.setsByExercise || {})) {
    const prev = setsByExercise[exId] ?? 0;
    if (typeof val === "number" && (val > 0 || prev === 0)) {
      setsByExercise[exId] = Math.max(prev, val);
    }
  }

  const repsByExercise: Record<string, number> = {
    ...(existing.repsByExercise || {}),
  };
  for (const [exId, val] of Object.entries(incoming.repsByExercise || {})) {
    if (typeof val === "number" && val > 0) {
      repsByExercise[exId] = val;
    }
  }

  const reps2ByExercise: Record<string, number> = {
    ...(existing.reps2ByExercise || {}),
  };
  for (const [exId, val] of Object.entries(incoming.reps2ByExercise || {})) {
    if (typeof val === "number" && val > 0) {
      reps2ByExercise[exId] = val;
    }
  }

  return {
    ...existing,
    weightsByExercise,
    weights2ByExercise,
    setsByExercise,
    repsByExercise,
    reps2ByExercise,
    notes: incoming.notes?.trim() ? incoming.notes : existing.notes,
  };
}

function mergeGymDatabasesOnServer(
  serverDb: GymDatabase,
  deviceDb: GymDatabase
): GymDatabase {
  const athleteMap = new Map<string, Athlete>();
  for (const a of serverDb.athletes) {
    athleteMap.set(a.id, a);
  }
  for (const a of deviceDb.athletes || []) {
    const prev = athleteMap.get(a.id);
    athleteMap.set(a.id, prev ? { ...prev, ...a } : a);
  }

  const cardMap = new Map<string, WorkoutCard>();
  for (const c of serverDb.cards) {
    cardMap.set(c.id, c);
  }
  for (const c of deviceDb.cards || []) {
    if (!athleteMap.has(c.athleteId)) continue;
    const prev = cardMap.get(c.id);
    if (!prev) {
      cardMap.set(c.id, c);
    } else {
      // Mantiene la scheda con più giorni/esercizi o i dettagli aggiornati dal dispositivo
      const prevExCount = prev.days.reduce(
        (acc, d) => acc + d.exercises.length,
        0
      );
      const incExCount = (c.days || []).reduce(
        (acc, d) => acc + d.exercises.length,
        0
      );
      cardMap.set(c.id, {
        ...prev,
        ...c,
        days: incExCount >= prevExCount ? c.days : prev.days,
      });
    }
  }

  const logMap = new Map<string, WorkoutSessionLog>();
  for (const l of serverDb.logs) {
    const key = `${l.cardId}__${l.dayId}__${l.date}`;
    logMap.set(key, l);
  }
  for (const l of deviceDb.logs || []) {
    if (!cardMap.has(l.cardId) || !athleteMap.has(l.athleteId)) continue;
    const key = `${l.cardId}__${l.dayId}__${l.date}`;
    const prev = logMap.get(key);
    if (!prev) {
      logMap.set(key, l);
    } else {
      logMap.set(key, mergeLogs(prev, l));
    }
  }

  return {
    athletes: Array.from(athleteMap.values()),
    cards: Array.from(cardMap.values()),
    logs: Array.from(logMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
  };
}

export async function GET() {
  try {
    await seedDatabaseIfEmpty();
    const db = await fetchFullDatabase();
    return NextResponse.json(db);
  } catch (error) {
    console.error("GET /api/gym error:", error);
    return NextResponse.json(
      {
        error: getDatabaseErrorMessage(error, "lettura"),
        code: getPrismaErrorCode(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "upsert_log" && body.log) {
      const log = body.log as WorkoutSessionLog;
      await prisma.workoutSessionLog.upsert({
        where: {
          cardId_dayId_date: {
            cardId: log.cardId,
            dayId: log.dayId,
            date: log.date,
          },
        },
        update: {
          weightsByExercise: log.weightsByExercise ?? {},
          weights2ByExercise: log.weights2ByExercise ?? {},
          setsByExercise: log.setsByExercise ?? {},
          repsByExercise: log.repsByExercise ?? {},
          reps2ByExercise: log.reps2ByExercise ?? {},
          notes: log.notes ?? null,
        },
        create: {
          id: log.id,
          cardId: log.cardId,
          athleteId: log.athleteId,
          dayId: log.dayId,
          date: log.date,
          weightsByExercise: log.weightsByExercise ?? {},
          weights2ByExercise: log.weights2ByExercise ?? {},
          setsByExercise: log.setsByExercise ?? {},
          repsByExercise: log.repsByExercise ?? {},
          reps2ByExercise: log.reps2ByExercise ?? {},
          notes: log.notes ?? null,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "merge_db" && body.db) {
      await seedDatabaseIfEmpty();
      const currentServerDb = await fetchFullDatabase();
      const merged = mergeGymDatabasesOnServer(
        currentServerDb,
        body.db as GymDatabase
      );
      await replaceFullDatabase(merged);
      const fresh = await fetchFullDatabase();
      return NextResponse.json(fresh);
    }

    if (body.action === "reset_demo") {
      await replaceFullDatabase(INITIAL_GYM_DATA);
      const fresh = await fetchFullDatabase();
      return NextResponse.json(fresh);
    }

    if (body.db) {
      await replaceFullDatabase(body.db as GymDatabase);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/gym error:", error);
    return NextResponse.json(
      {
        error: getDatabaseErrorMessage(error, "salvataggio"),
        code: getPrismaErrorCode(error),
      },
      { status: 500 }
    );
  }
}
