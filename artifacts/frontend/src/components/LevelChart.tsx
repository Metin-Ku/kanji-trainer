import { useState, useRef, useEffect } from "react";
import { themeVars } from "../theme";

interface Props {
  level: number;
  onChangeLevel: (level: number) => void;
  starred?: boolean;
  onToggleStar?: () => void;
}

const HEIGHTS = [28, 42, 56, 72, 88];

function getLevelColor(bar: number, level: number): string {
  if (bar > level) return "#e5e7eb";
  return themeVars.level(bar);
}

export function LevelChart({ level, onChangeLevel, starred = false, onToggleStar }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const starEnabled = level === 5 || starred;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-end gap-[1px] h-[17px]"
        style={{ padding: 0 }}
        aria-label="Seviye değiştir"
      >
        {[1, 2, 3, 4, 5].map((bar) => {
          const pct = HEIGHTS[bar - 1];
          const color = getLevelColor(bar, level);
          return (
            <div
              key={bar}
              className="w-[3px]"
              style={{
                height: `${(pct / 100) * 15}px`,
                background: color,
                borderRadius: "1px 1px 0 0",
                transition: "none",
              }}
            />
          );
        })}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3"
          style={{ minWidth: 216 }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-gray-400 mb-2.5 font-medium text-center">Öğrenme seviyesi</p>
          <div className="flex gap-2 justify-center items-center">
            {[1, 2, 3, 4, 5].map((l) => {
              const active = l === level;
              const color = getLevelColor(l, l);
              return (
                <button
                  key={l}
                  onClick={() => { onChangeLevel(l); setOpen(false); }}
                  className="w-9 h-9 rounded-full font-semibold text-sm border-2"
                  style={{
                    background: active ? color : "transparent",
                    borderColor: active ? color : "#e5e7eb",
                    color: active ? "white" : "#6b7280",
                    transform: active ? "scale(1.1)" : "scale(1)",
                    transition: "none",
                  }}
                >
                  {l}
                </button>
              );
            })}

            <button
              onClick={() => {
                if (starEnabled && onToggleStar) {
                  onToggleStar();
                  setOpen(false);
                }
              }}
              disabled={!starEnabled}
              className="w-9 h-9 rounded-full text-base border-2 flex items-center justify-center"
              style={{
                background: starred ? themeVars.star : "transparent",
                borderColor: starred ? themeVars.star : starEnabled ? themeVars.star : "#e5e7eb",
                color: starred ? "white" : starEnabled ? themeVars.star : "#d1d5db",
                cursor: starEnabled ? "pointer" : "not-allowed",
                opacity: starEnabled ? 1 : 0.4,
                transition: "none",
              }}
              aria-label={starred ? "Öğrenilenlerden çıkar" : "Öğrenildi olarak işaretle"}
            >
              ★
            </button>
          </div>
          {!starEnabled && (
            <p className="text-[10px] text-gray-300 text-center mt-2">5. seviyede yıldız atanabilir</p>
          )}
        </div>
      )}
    </div>
  );
}
