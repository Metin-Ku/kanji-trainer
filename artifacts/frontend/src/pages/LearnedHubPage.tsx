import { ArrowLeft, Languages, Waves, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

const ICON_BG = "linear-gradient(135deg, rgba(255,150,30,0.13), rgba(255,90,10,0.08))";

export function LearnedHubPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-widest">Öğrenilenler</span>
          </button>
        </div>
      </div>

      {/* 3 equal-width section buttons */}
      <div className="flex-1 flex">
        <button
          onClick={() => navigate("/learned/words")}
          className="flex-1 flex flex-col items-center justify-center gap-3 active:bg-gray-50 transition-colors border-r border-gray-100"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: ICON_BG }}
          >
            <Languages size={22} className="text-orange-400" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              Word
            </p>
            <p className="text-base font-bold text-gray-900 leading-tight">Kelimeler</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/learned/pronunciation")}
          className="flex-1 flex flex-col items-center justify-center gap-3 active:bg-gray-50 transition-colors border-r border-gray-100"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: ICON_BG }}
          >
            <Waves size={22} className="text-orange-400" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              Pronunciation
            </p>
            <p className="text-base font-bold text-gray-900 leading-tight">Okunuş</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/learned/meaning")}
          className="flex-1 flex flex-col items-center justify-center gap-3 active:bg-gray-50 transition-colors"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: ICON_BG }}
          >
            <BookOpen size={22} className="text-orange-400" strokeWidth={1.8} />
          </div>
          <div className="text-center">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
              Meaning
            </p>
            <p className="text-base font-bold text-gray-900 leading-tight">Anlam</p>
          </div>
        </button>
      </div>
    </div>
  );
}
