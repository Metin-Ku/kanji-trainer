import { Word } from "../types";

export type StudyMode = "kelime" | "okunuş" | "anlam";

interface StudySession {
  words: Word[];
  mode: StudyMode;
  title: string;
  backPath: string;
}

let session: StudySession = { words: [], mode: "kelime", title: "", backPath: "/" };

export function startStudy(words: Word[], mode: StudyMode, title: string, backPath: string) {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  session = { words: shuffled, mode, title, backPath };
}

export function getStudySession(): StudySession {
  return session;
}
