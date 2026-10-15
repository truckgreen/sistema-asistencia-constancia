import React from 'react';
import { useApp } from '../context/AppContext';

interface ThemeCustomizerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ isOpen, onClose }) => {
  const {
    palettes = [],
    currentPaletteId = 'institucional',
    primaryColor = '#0C5528',
    accentColor = '#DF5C12',
    cambiarPaleta = () => {},
    cambiarColoresPersonalizados = () => {},
    resetearColoresInstitucionales = () => {},
  } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-slate-800">Personalización de Colores</h3>
        <div className="space-y-2">
          {palettes.map((palette: any) => (
            <button
              key={palette.id}
              onClick={() => cambiarPaleta(palette.id)}
              className="w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between"
            >
              <span>{palette.nombre}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
