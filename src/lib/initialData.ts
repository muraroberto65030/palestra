import { GymDatabase } from "@/types/gym";

export const INITIAL_GYM_DATA: GymDatabase = {
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
      id: "ath-1793307115366",
      fullName: "Lello",
      email: "antonio.piras.pt@gmail.com",
      phone: "3472367596",
      pin: "1908",
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
      id: "card-1793307115366-lello-1",
      athleteId: "ath-1793307115366",
      title: "Scheda Lello 1",
      goal: "Forza e ricomposizione corporea",
      validFrom: "2026-10-29",
      validTo: "2026-12-10",
      notes: "Programma importato da scheda cartacea di Lello.",
      archived: false,
      createdAt: "2026-10-29",
      days: [
        {
          id: "day-1793307128856-1",
          name: "Giorno 1 focus gambe",
          exercises: [
            {
              id: "ex-1793307176270-1",
              name: "Squat",
              setsReps: "5x6-8",
            },
            {
              id: "ex-1793307179147-2",
              name: "Affondi posteriori o split squat",
              setsReps: "4x10",
            },
            {
              id: "ex-1793307181662-3",
              name: "Leg ex",
              setsReps: "4x10-12",
            },
            {
              id: "ex-1793307183489-4",
              name: "Panca piana",
              setsReps: "4x8-10",
            },
            {
              id: "ex-1793307185170-5",
              name: "Lat machine neutra",
              setsReps: "4x8-10",
            },
            {
              id: "ex-1793307191671-6",
              name: "Thruster manubri",
              setsReps: "4x10-12",
            },
            {
              id: "ex-1793307193683-7",
              name: "Addome",
              setsReps: "",
            },
          ],
        },
        {
          id: "day-1793307128856-2",
          name: "Giorno 2 focus petto",
          exercises: [
            {
              id: "ex-1793307441929-1",
              name: "Panca piana",
              setsReps: "4x8-10"
            },
            {
              id: "ex-1793307444570-2",
              name: "Panca 30* manubri",
              setsReps: "4x10-12"
            },
            {
              id: "ex-1793307450290-3",
              name: "Chest press",
              setsReps: "3x15-20"
            },
            {
              id: "ex-1793307457311-4",
              name: "Spinte con manubri 70*",
              setsReps: "4x8-10"
            },
            {
              id: "ex-1793307459055-5",
              name: "Alzate laterali",
              setsReps: "4x15"
            },
            {
              id: "ex-1793307461997-6",
              name: "Stacchi rumeni",
              setsReps: "4x10"
            },
            {
              id: "ex-1793307464811-7",
              name: "Push down cavi",
              setsReps: "4x8-15"
            },
            {
              id: "ex-1793307466589-8",
              name: "Addome",
              setsReps: ""
            }
          ]
        },
        {
          id: "day-1793307159972-3",
          name: "Giorno 3 focus schiena",
          exercises: [
            {
              id: "ex-1793307761409-1",
              name: "Trap bar",
              setsReps: "3x6-8"
            },
            {
              id: "ex-1793307778969-2",
              name: "Stacchi rumeni",
              setsReps: "4x8-10"
            },
            {
              id: "ex-1793307780747-3",
              name: "Lat machine neutra",
              setsReps: "4x6-8"
            },
            {
              id: "ex-1793307782526-4",
              name: "Lat pulley",
              setsReps: "4x10"
            },
            {
              id: "ex-1793307785153-5",
              name: "Lat machine supina",
              setsReps: "3x12-15"
            },
            {
              id: "ex-1793307787016-6",
              name: "Curl bicipiti",
              setsReps: "4x8-15"
            },
            {
              id: "ex-1793307788831-7",
              name: "Curl a martello",
              setsReps: "4x10"
            }
          ]
        },
        {
          id: "day-1793307161914-4",
          name: "Giorno 4 total body",
          exercises: [
            {
              id: "ex-1793307972715-1",
              name: "Chest press",
              setsReps: "4x8-10"
            },
            {
              id: "ex-1793307986687-2",
              name: "Squat",
              setsReps: "4x8-10"
            },
            {
              id: "ex-1793307990429-3",
              name: "Row trx",
              setsReps: "4x12-15"
            },
            {
              id: "ex-1793307992385-4",
              name: "Swing",
              setsReps: "4x20"
            },
            {
              id: "ex-1793307994229-5",
              name: "Military press",
              setsReps: "4x8-10"
            },
            {
              id: "ex-1793307996044-6",
              name: "Push down",
              setsReps: "4x8-10"
            },
            {
              id: "ex-1793307998640-7",
              name: "Curl manubri",
              setsReps: "4x8-10"
            }
          ]
        },
        {
          id: "day-1793307163595-5",
          name: "Giorno 5 extra",
          exercises: [
            {
              id: "ex-1793308154673-1",
              name: "Tapin",
              setsReps: "15 min"
            },
            {
              id: "ex-1793308164732-2",
              name: "Ciclete",
              setsReps: "15 min"
            }
          ]
        },
        {
          id: "day-1793307164858-6",
          name: "Giorno 6 extra",
          exercises: [
            {
              id: "ex-1793308198486-1",
              name: "Ciclete",
              setsReps: "15 min"
            },
            {
              id: "ex-1793308200665-2",
              name: "Tapin",
              setsReps: "15 min"
            }
          ]
        }
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
      "id": "log-roberto-30-09",
      "cardId": "card-roberto-autunno",
      "athleteId": "ath-roberto-mura",
      "dayId": "day-roberto-1",
      "date": "2026-09-30",
      "weightsByExercise": {
        "ex-r1-1": "+15",
        "ex-r1-2": "+45",
        "ex-r1-3": "+15",
        "ex-r1-4": "+20",
        "ex-r1-5": "+35",
        "ex-r1-6": "+30",
        "ex-r1-7": "42,5+6",
        "ex-r1-8": ""
      },
      "notes": "Annotazioni prima colonna (30/9) dalla scheda cartacea"
    },
    {
      "id": "log-roberto-02-10",
      "cardId": "card-roberto-autunno",
      "athleteId": "ath-roberto-mura",
      "dayId": "day-roberto-2",
      "date": "2026-10-02",
      "weightsByExercise": {
        "ex-r2-1": "5+5",
        "ex-r2-2": "+30",
        "ex-r2-3": "70",
        "ex-r2-4": "35",
        "ex-r2-5": "35",
        "ex-r2-6": "",
        "ex-r2-7": "45+7+4",
        "ex-r2-8": "6+6",
        "ex-r2-9": "+10",
        "ex-r2-10": ""
      },
      "notes": "Annotazioni prima colonna (2/10) dalla scheda cartacea"
    },
    {
      "id": "log-1793200445162-tbrj",
      "cardId": "card-roberto-autunno",
      "athleteId": "ath-roberto-mura",
      "dayId": "day-roberto-1",
      "date": "2026-10-28",
      "weightsByExercise": {
        "ex-r1-1": "+30",
        "ex-r1-2": "+55",
        "ex-r1-3": "+40",
        "ex-r1-4": "+25",
        "ex-r1-5": "+50",
        "ex-r1-6": "+50",
        "ex-r1-7": "35+7,5"
      },
      "setsByExercise": {
        "ex-r1-1": 4,
        "ex-r1-2": 3,
        "ex-r1-3": 4,
        "ex-r1-4": 4,
        "ex-r1-5": 4,
        "ex-r1-6": 4,
        "ex-r1-7": 4,
        "ex-r1-8": 4
      },
      "repsByExercise": {
        "ex-r1-1": 10,
        "ex-r1-2": 12,
        "ex-r1-3": 10,
        "ex-r1-4": 12,
        "ex-r1-5": 10,
        "ex-r1-6": 12,
        "ex-r1-7": 8,
        "ex-r1-8": 10
      }
    },
    {
      "id": "log-1793200643285-osmy",
      "cardId": "card-roberto-autunno",
      "athleteId": "ath-roberto-mura",
      "dayId": "day-roberto-2",
      "date": "2026-10-26",
      "weightsByExercise": {
        "ex-r2-1": "10+10",
        "ex-r2-2": "+37,5",
        "ex-r2-3": "100",
        "ex-r2-4": "50",
        "ex-r2-5": "50",
        "ex-r2-6": "10",
        "ex-r2-7": "50+3,9",
        "ex-r2-8": "7,5+7,5"
      },
      "setsByExercise": {
        "ex-r2-1": 4,
        "ex-r2-2": 4,
        "ex-r2-3": 3,
        "ex-r2-4": 4,
        "ex-r2-5": 4,
        "ex-r2-6": 3,
        "ex-r2-7": 3,
        "ex-r2-8": 4
      },
      "repsByExercise": {
        "ex-r2-1": 10,
        "ex-r2-2": 12,
        "ex-r2-3": 10,
        "ex-r2-4": 8,
        "ex-r2-5": 10,
        "ex-r2-6": 15,
        "ex-r2-7": 8,
        "ex-r2-8": 8
      }
    },
    {
      "id": "log-1793258658013-15us",
      "cardId": "card-roberto-autunno",
      "athleteId": "ath-roberto-mura",
      "dayId": "day-roberto-2",
      "date": "2026-10-29",
      "weightsByExercise": {
        "ex-r2-1": "10+10",
        "ex-r2-2": "+37,5",
        "ex-r2-3": "100",
        "ex-r2-4": "50",
        "ex-r2-5": "50",
        "ex-r2-6": "10",
        "ex-r2-7": "50",
        "ex-r2-8": "7,5+7,5",
        "ex-r2-9": "+10"
      },
      "weights2ByExercise": {
        "ex-r2-7": "3,9"
      },
      "setsByExercise": {
        "ex-r2-1": 0,
        "ex-r2-2": 0,
        "ex-r2-3": 0,
        "ex-r2-4": 0,
        "ex-r2-5": 0,
        "ex-r2-6": 0,
        "ex-r2-7": 0,
        "ex-r2-8": 0,
        "ex-r2-9": 0,
        "ex-r2-10": 0
      },
      "repsByExercise": {
        "ex-r2-1": 10,
        "ex-r2-2": 12,
        "ex-r2-3": 10,
        "ex-r2-4": 8,
        "ex-r2-5": 10,
        "ex-r2-6": 15,
        "ex-r2-7": 8,
        "ex-r2-8": 8,
        "ex-r2-9": 10,
        "ex-r2-10": 10
      },
      "reps2ByExercise": {
        "ex-r2-7": 10
      }
    },
    {
      "id": "log-1793808348664-tftm",
      "cardId": "card-roberto-autunno",
      "athleteId": "ath-roberto-mura",
      "dayId": "day-roberto-1",
      "date": "2026-11-04",
      "weightsByExercise": {
        "ex-r1-1": "+52,5",
        "ex-r1-2": "+55",
        "ex-r1-3": "+40",
        "ex-r1-4": "+27,5",
        "ex-r1-5": "+50",
        "ex-r1-6": "+50",
        "ex-r1-7": "35",
        "ex-r1-8": ""
      },
      "weights2ByExercise": {
        "ex-r1-7": "7,5"
      },
      "setsByExercise": {
        "ex-r1-1": 4,
        "ex-r1-2": 3,
        "ex-r1-3": 4,
        "ex-r1-4": 4,
        "ex-r1-5": 4,
        "ex-r1-6": 4,
        "ex-r1-7": 4,
        "ex-r1-8": 4
      },
      "repsByExercise": {
        "ex-r1-1": 10,
        "ex-r1-2": 12,
        "ex-r1-3": 10,
        "ex-r1-4": 12,
        "ex-r1-5": 10,
        "ex-r1-6": 12,
        "ex-r1-7": 8,
        "ex-r1-8": 10
      },
      "reps2ByExercise": {
        "ex-r1-7": 10
      }
    },
    {
      "id": "log-1793309499241-6fvi",
      "cardId": "card-1793307115366-lello-1",
      "athleteId": "ath-1793307115366",
      "dayId": "day-1793307128856-1",
      "date": "2026-10-29",
      "weightsByExercise": {
        "ex-1793307176270-1": "40",
        "ex-1793307181662-3": "37,5",
        "ex-1793307183489-4": "50",
        "ex-1793307185170-5": "50",
        "ex-1793307191671-6": "6"
      },
      "weights2ByExercise": {},
      "setsByExercise": {
        "ex-1793307176270-1": 0,
        "ex-1793307179147-2": 0,
        "ex-1793307181662-3": 0,
        "ex-1793307183489-4": 0,
        "ex-1793307185170-5": 0,
        "ex-1793307191671-6": 0,
        "ex-1793307193683-7": 0
      },
      "repsByExercise": {
        "ex-1793307176270-1": 8,
        "ex-1793307179147-2": 10,
        "ex-1793307181662-3": 12,
        "ex-1793307183489-4": 10,
        "ex-1793307185170-5": 10,
        "ex-1793307191671-6": 12,
        "ex-1793307193683-7": 10
      },
      "reps2ByExercise": {}
    },
    {
      "id": "log-1793309734627-7hmq",
      "cardId": "card-1793307115366-lello-1",
      "athleteId": "ath-1793307115366",
      "dayId": "day-1793307128856-2",
      "date": "2026-10-29",
      "weightsByExercise": {
        "ex-1793307441929-1": "50",
        "ex-1793307444570-2": "15",
        "ex-1793307450290-3": "35",
        "ex-1793307457311-4": "10",
        "ex-1793307459055-5": "8",
        "ex-1793307461997-6": "60",
        "ex-1793307464811-7": "30"
      },
      "weights2ByExercise": {},
      "setsByExercise": {
        "ex-1793307441929-1": 0,
        "ex-1793307444570-2": 0,
        "ex-1793307450290-3": 0,
        "ex-1793307457311-4": 0,
        "ex-1793307459055-5": 0,
        "ex-1793307461997-6": 0,
        "ex-1793307464811-7": 0,
        "ex-1793307466589-8": 0
      },
      "repsByExercise": {
        "ex-1793307441929-1": 8,
        "ex-1793307444570-2": 10,
        "ex-1793307450290-3": 15,
        "ex-1793307457311-4": 8,
        "ex-1793307459055-5": 15,
        "ex-1793307461997-6": 10,
        "ex-1793307464811-7": 8,
        "ex-1793307466589-8": 10
      },
      "reps2ByExercise": {}
    },
    {
      "id": "log-1793309886212-3pez",
      "cardId": "card-1793307115366-lello-1",
      "athleteId": "ath-1793307115366",
      "dayId": "day-1793307159972-3",
      "date": "2026-10-29",
      "weightsByExercise": {
        "ex-1793307761409-1": "70",
        "ex-1793307778969-2": "60",
        "ex-1793307780747-3": "45",
        "ex-1793307782526-4": "50",
        "ex-1793307785153-5": "45",
        "ex-1793307787016-6": "10",
        "ex-1793307788831-7": "10"
      },
      "weights2ByExercise": {},
      "setsByExercise": {
        "ex-1793307761409-1": 0,
        "ex-1793307778969-2": 0,
        "ex-1793307780747-3": 0,
        "ex-1793307782526-4": 0,
        "ex-1793307785153-5": 0,
        "ex-1793307787016-6": 0,
        "ex-1793307788831-7": 0
      },
      "repsByExercise": {
        "ex-1793307761409-1": 6,
        "ex-1793307778969-2": 8,
        "ex-1793307780747-3": 6,
        "ex-1793307782526-4": 10,
        "ex-1793307785153-5": 12,
        "ex-1793307787016-6": 8,
        "ex-1793307788831-7": 10
      },
      "reps2ByExercise": {}
    },
    {
      "id": "log-1793644957581-echv",
      "cardId": "card-1793307115366-lello-1",
      "athleteId": "ath-1793307115366",
      "dayId": "day-1793307128856-1",
      "date": "2026-11-02",
      "weightsByExercise": {
        "ex-1793307176270-1": "40",
        "ex-1793307181662-3": "37,5",
        "ex-1793307183489-4": "50",
        "ex-1793307185170-5": "50",
        "ex-1793307191671-6": "6",
        "ex-1793307179147-2": "",
        "ex-1793307193683-7": ""
      },
      "weights2ByExercise": {},
      "setsByExercise": {
        "ex-1793307176270-1": 5,
        "ex-1793307179147-2": 4,
        "ex-1793307181662-3": 4,
        "ex-1793307183489-4": 4,
        "ex-1793307185170-5": 4,
        "ex-1793307191671-6": 4,
        "ex-1793307193683-7": 3
      },
      "repsByExercise": {
        "ex-1793307176270-1": 8,
        "ex-1793307179147-2": 10,
        "ex-1793307181662-3": 10,
        "ex-1793307183489-4": 9,
        "ex-1793307185170-5": 10,
        "ex-1793307191671-6": 12,
        "ex-1793307193683-7": 10
      },
      "reps2ByExercise": {}
    },
    {
      "id": "log-1793728352155-9emr",
      "cardId": "card-1793307115366-lello-1",
      "athleteId": "ath-1793307115366",
      "dayId": "day-1793307161914-4",
      "date": "2026-11-03",
      "weightsByExercise": {
        "ex-1793307972715-1": "15"
      },
      "weights2ByExercise": {},
      "setsByExercise": {
        "ex-1793307972715-1": 4,
        "ex-1793307986687-2": 0,
        "ex-1793307990429-3": 0,
        "ex-1793307992385-4": 0,
        "ex-1793307994229-5": 0,
        "ex-1793307996044-6": 0,
        "ex-1793307998640-7": 0
      },
      "repsByExercise": {
        "ex-1793307972715-1": 10,
        "ex-1793307986687-2": 8,
        "ex-1793307990429-3": 12,
        "ex-1793307992385-4": 20,
        "ex-1793307994229-5": 8,
        "ex-1793307996044-6": 8,
        "ex-1793307998640-7": 8
      },
      "reps2ByExercise": {}
    },
    {
      "id": "log-1793785056810-iuyo",
      "cardId": "card-1793307115366-lello-1",
      "athleteId": "ath-1793307115366",
      "dayId": "day-1793307128856-2",
      "date": "2026-11-04",
      "weightsByExercise": {
        "ex-1793307441929-1": "50",
        "ex-1793307444570-2": "15",
        "ex-1793307450290-3": "35",
        "ex-1793307457311-4": "10",
        "ex-1793307459055-5": "10",
        "ex-1793307461997-6": "60",
        "ex-1793307464811-7": "35"
      },
      "weights2ByExercise": {},
      "setsByExercise": {
        "ex-1793307441929-1": 4,
        "ex-1793307444570-2": 4,
        "ex-1793307450290-3": 3,
        "ex-1793307457311-4": 4,
        "ex-1793307459055-5": 4,
        "ex-1793307461997-6": 4,
        "ex-1793307464811-7": 4,
        "ex-1793307466589-8": 0
      },
      "repsByExercise": {
        "ex-1793307441929-1": 10,
        "ex-1793307444570-2": 12,
        "ex-1793307450290-3": 15,
        "ex-1793307457311-4": 8,
        "ex-1793307459055-5": 15,
        "ex-1793307461997-6": 10,
        "ex-1793307464811-7": 15,
        "ex-1793307466589-8": 10
      },
      "reps2ByExercise": {}
    },
    {
      "id": "log-1793904319529-m7dj",
      "cardId": "card-1793307115366-lello-1",
      "athleteId": "ath-1793307115366",
      "dayId": "day-1793307159972-3",
      "date": "2026-11-05",
      "weightsByExercise": {
        "ex-1793307761409-1": "70",
        "ex-1793307778969-2": "60",
        "ex-1793307780747-3": "50",
        "ex-1793307782526-4": "50",
        "ex-1793307785153-5": "45",
        "ex-1793307787016-6": "12",
        "ex-1793307788831-7": "10"
      },
      "weights2ByExercise": {},
      "setsByExercise": {
        "ex-1793307761409-1": 3,
        "ex-1793307778969-2": 4,
        "ex-1793307780747-3": 4,
        "ex-1793307782526-4": 4,
        "ex-1793307785153-5": 0,
        "ex-1793307787016-6": 4,
        "ex-1793307788831-7": 4
      },
      "repsByExercise": {
        "ex-1793307761409-1": 8,
        "ex-1793307778969-2": 10,
        "ex-1793307780747-3": 8,
        "ex-1793307782526-4": 10,
        "ex-1793307785153-5": 12,
        "ex-1793307787016-6": 15,
        "ex-1793307788831-7": 10
      },
      "reps2ByExercise": {}
    }
  ],
};
