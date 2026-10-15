import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Palette, Check, RotateCcw, X, Sliders, Sparkles, Eye } from 'lucide-react';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ isOpen, onClose }) => {
  const {
    palettes,
    currentPaletteId,
    primaryColor,
    accentColor,
    cambiarPaleta,
    cambiarColoresPersonalizados,
    resetearColoresInstitucionales,
  } = useApp();

  const [customPrimary, setCustomPrimary] = useState(primaryColor);
  const [customAccent, setCustomAccent] = useState(accentColor);

  if (!isOpen) return null;

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    cambiarColoresPersonalizados(customPrimary, customAccent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                Personalizador de Colores Institucionales
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Herramienta en vivo para la Defensa de Tesis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* Note for the Jury / Student */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Ideal para responder solicitudes del Jurado:</strong> Si el jurado solicita cambiar los colores de la institución o evaluar la adaptabilidad del sistema a otro plantel educativo, puedes seleccionar una paleta predefinida o indicar cualquier color exacto en tiempo real.
            </div>
          </div>

          {/* Preset Palettes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Paletas Institucionales Preconfiguradas
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {palettes.map(palette => {
                const isSelected = currentPaletteId === palette.id;
                return (
                  <button
                    key={palette.id}
                    onClick={() => {
                      cambiarPaleta(palette.id);
                      setCustomPrimary(palette.primary);
                      setCustomAccent(palette.accent);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-800 bg-slate-50 shadow-md ring-2 ring-slate-800/10'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center -space-x-2">
                        <span
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm inline-block"
                          style={{ backgroundColor: palette.primary }}
                        />
                        <span
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm inline-block"
                          style={{ backgroundColor: palette.accent }}
                        />
                      </div>
                      <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                        {palette.name}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Selector (Color Pickers) */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Selector de Color Libre (Cualquier Color)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">Hex / RGB</span>
            </div>

            <form onSubmit={handleApplyCustom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Primary Color Picker */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                    Color Primario (Barra/Botones)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customPrimary}
                      onChange={e => {
                        setCustomPrimary(e.target.value);
                        cambiarColoresPersonalizados(e.target.value, customAccent);
                      }}
                      className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={customPrimary}
                      onChange={e => {
                        setCustomPrimary(e.target.value);
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                          cambiarColoresPersonalizados(e.target.value, customAccent);
                        }
                      }}
                      placeholder="#0C5528"
                      className="w-full text-xs font-mono font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                {/* Accent Color Picker */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                    Color Secundario / Acento
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customAccent}
                      onChange={e => {
                        setCustomAccent(e.target.value);
                        cambiarColoresPersonalizados(customPrimary, e.target.value);
                      }}
                      className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={customAccent}
                      onChange={e => {
                        setCustomAccent(e.target.value);
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                          cambiarColoresPersonalizados(customPrimary, e.target.value);
                        }
                      }}
                      placeholder="#DF5C12"
                      className="w-full text-xs font-mono font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Sample */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Eye className="w-4 h-4 text-slate-400" />
                  <span>Vista previa en vivo:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: customPrimary }}
                  >
                    Encabezado
                  </span>
                  <span
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: customAccent }}
                  >
                    Acción
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              resetearColoresInstitucionales();
              setCustomPrimary('#0C5528');
              setCustomAccent('#DF5C12');
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer px-3 py-2 rounded-xl hover:bg-slate-200/50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer Oficial La Constancia
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:brightness-110 transition cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            Listo / Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
