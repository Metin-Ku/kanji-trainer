import { useState } from "react";
import { ArrowLeft, Check, Palette } from "lucide-react";
import { useLocation } from "wouter";
import {
  applyTheme,
  getPalette,
  getStoredPalette,
  PALETTE_NAMES,
  SHADES,
  type PaletteName,
} from "../theme";

type Section = "styling";

export function SettingsPage() {
  const [, navigate] = useLocation();
  const [section, setSection] = useState<Section>("styling");
  const [palette, setPalette] = useState<PaletteName>(() => getStoredPalette());

  function selectPalette(name: PaletteName) {
    applyTheme(name);
    setPalette(name);
  }

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-[11px] font-semibold text-main-400 uppercase tracking-widest">Ayarlar</span>
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        <aside className="w-44 shrink-0 bg-white border-r border-gray-100 p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Bölümler</p>
          <button
            onClick={() => setSection("styling")}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === "styling"
                ? "bg-main-50 text-main-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Palette size={16} strokeWidth={2} />
            Styling
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto p-4">
          {section === "styling" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Styling</h2>
              <p className="text-sm text-gray-500 mb-5">
                Ana tema rengini seçin. Seviye renkleri, yıldız ve vurgular buna göre güncellenir.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PALETTE_NAMES.map((name) => {
                  const colors = getPalette(name);
                  const selected = palette === name;
                  return (
                    <button
                      key={name}
                      onClick={() => selectPalette(name)}
                      className={`text-left rounded-xl border p-3 transition-all active:scale-[0.99] ${
                        selected
                          ? "border-main-400 ring-2 ring-main-200 bg-white"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-sm font-semibold text-gray-800 capitalize">{name}</span>
                        {selected && (
                          <span className="flex items-center gap-1 text-xs font-medium text-main-500">
                            <Check size={14} strokeWidth={2.5} />
                            Seçili
                          </span>
                        )}
                      </div>
                      <div className="flex rounded-lg overflow-hidden h-6">
                        {SHADES.map((shade) => (
                          <div
                            key={shade}
                            className="flex-1 min-w-0"
                            style={{ background: colors[shade] }}
                            title={`${name}-${shade}`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
