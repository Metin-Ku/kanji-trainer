import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Word } from "../types";
import { RelatedWordsSelect } from "./RelatedWordsSelect";

interface SaveData {
  kanji: string;
  pronunciation: string;
  meaning: string;
  description: string;
  level: number;
  jlptLevel: string | null;
  date: string;
  relatedWordIds: number[];
}

interface Props {
  initial?: Word;
  allWords?: Word[];
  onSave: (data: SaveData) => void;
  onClose: () => void;
}

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const levelColors = [
  "rgb(220,180,60)", "rgb(235,158,35)", "rgb(245,135,20)", "rgb(252,110,15)", "rgb(255,90,10)",
];

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

export function WordFormModal({ initial, allWords = [], onSave, onClose }: Props) {
  const [kanji, setKanji] = useState(initial?.kanji ?? "");
  const [pronunciation, setPronunciation] = useState(initial?.pronunciation ?? "");
  const [meaning, setMeaning] = useState(initial?.meaning ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [level, setLevel] = useState(initial?.level ?? 1);
  const [jlptLevel, setJlptLevel] = useState<string | null>(initial?.jlptLevel ?? null);
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [relatedWordIds, setRelatedWordIds] = useState<number[]>(initial?.relatedWordIds ?? []);
  const backdropRef = useRef<HTMLDivElement>(null);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kanji.trim()) return;
    onSave({ kanji: kanji.trim(), pronunciation, meaning, description, level, jlptLevel, date, relatedWordIds });
    onClose();
  }

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-sheet">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            {initial ? "Kelimeyi Düzenle" : "Yeni Kelime Ekle"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Japonca Kelime</label>
            <input
              type="text"
              value={kanji}
              onChange={(e) => setKanji(e.target.value)}
              placeholder="例: 工事"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xl text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Okunuş</label>
            <input
              type="text"
              value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
              placeholder="こうじ (kouji)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Anlam</label>
            <input
              type="text"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="TR: İnşaat | EN: Construction"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Örnek Cümleler & Notlar</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={"工事中です。\n--> Kouji-chuu desu.\n--> İnşaat çalışması var."}
              rows={5}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all font-mono"
            />
          </div>

          {allWords.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                İlişkili Kelimeler <span className="normal-case font-normal text-gray-300">(A ≡ B)</span>
              </label>
              <RelatedWordsSelect
                allWords={allWords}
                selectedIds={relatedWordIds}
                currentWordId={initial?.id}
                onChange={setRelatedWordIds}
              />
            </div>
          )}

          {/* JLPT Level picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
              JLPT Seviyesi <span className="normal-case font-normal text-gray-300">(isteğe bağlı)</span>
            </label>
            <div className="flex gap-1.5">
              {JLPT_LEVELS.map((lvl) => {
                const active = jlptLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setJlptLevel(active ? null : lvl)}
                    className="flex-1 h-[38px] rounded-xl font-semibold text-sm border-2 transition-all duration-150"
                    style={{
                      background: active ? "linear-gradient(135deg, rgb(255,150,30), rgb(255,90,10))" : "transparent",
                      borderColor: active ? "rgb(255,120,20)" : "#e5e7eb",
                      color: active ? "white" : "#9ca3af",
                    }}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Tarih</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Seviye</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    className="w-9 h-[42px] rounded-xl font-bold text-sm border-2 transition-all duration-150"
                    style={{
                      background: level === l ? levelColors[l - 1] : "transparent",
                      borderColor: level === l ? levelColors[l - 1] : "#e5e7eb",
                      color: level === l ? "white" : "#9ca3af",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-white text-base active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(135deg, rgb(255,150,30), rgb(255,90,10))" }}
          >
            {initial ? "Güncelle" : "Ekle"}
          </button>
        </form>
      </div>
    </div>
  );
}
