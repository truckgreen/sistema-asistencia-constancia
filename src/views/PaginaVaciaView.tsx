import React from 'react';
import { useApp } from '../context/AppContext';

export const PaginaVaciaView: React.FC = () => {
  const {
    cargarDatosDemostracion = () => {},
    vaciarRegistros = () => {},
    primaryColor = '#0C5528',
    accentColor = '#DF5C12',
  } = useApp();

  return (
    <div className="p-8 text-center text-slate-500">
      <h2 className="text-xl font-bold text-slate-800">Sistema Limpio</h2>
      <p className="text-xs mt-2">La base de datos se encuentra vacía y lista para registrar personal.</p>
    </div>
  );
};
