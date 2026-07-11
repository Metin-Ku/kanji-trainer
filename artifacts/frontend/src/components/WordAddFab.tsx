import { useState, useRef, useEffect } from "react";
import { Copy, Plus } from "lucide-react";

interface Props {
  onNewWord: () => void;
  onBulkImport: () => void;
}

export function WordAddFab({ onNewWord, onBulkImport }: Props) {
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fabOpen) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [fabOpen]);

  return (
    <div ref={fabRef} className="fixed right-[max(1rem,calc((100vw-42rem)/2+1.2rem))] z-40" style={{ bottom: 32 }}>
      <div
        className={`flex items-center rounded-full w-[52px] transition-[height] duration-140 ease-in-out overflow-hidden 
            shadow-main-600 bg-linear-to-b 160deg from-main-400 to-main-600 flex-col-reverse ${fabOpen ? "h-[158px]" : "h-[52px]"}`}
      >
        <button
          onClick={() => setFabOpen((v) => !v)}
          className="flex items-center justify-center active:opacity-70 transition-opacity"
          style={{ width: 52, height: 52, flexShrink: 0 }}
        >
          <div
            style={{
              transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 0.12s ease",
            }}
          >
            <Plus size={22} strokeWidth={2.5} className="text-white" />
          </div>
        </button>
        <div
          style={{
            width: 28,
            height: 1,
            background: "rgba(255,255,255,0.3)",
            flexShrink: 0,
          }}
        />
        <button
          onClick={() => {
            setFabOpen(false);
            onNewWord();
          }}
          className="flex items-center justify-center active:opacity-70 transition-opacity"
          style={{ width: 52, height: 52, flexShrink: 0 }}
        >
          <Plus size={22} strokeWidth={2.5} className="text-white" />
        </button>
        <div
          style={{
            width: 28,
            height: 1,
            background: "rgba(255,255,255,0.3)",
            flexShrink: 0,
          }}
        />
        <button
          onClick={() => {
            setFabOpen(false);
            onBulkImport();
          }}
          className="flex items-center justify-center active:opacity-70 transition-opacity"
          style={{ width: 52, height: 52, flexShrink: 0 }}
        >
          <Copy size={19} strokeWidth={2} className="text-white" />
        </button>
      </div>
    </div>
  );
}
