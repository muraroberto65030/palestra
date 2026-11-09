import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_GYM_DATA } from "@/lib/initialData";
import { GymDatabase, WorkoutSessionLog } from "@/types/gym";

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
