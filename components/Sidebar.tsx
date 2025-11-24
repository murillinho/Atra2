import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Factory, Activity } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white';
  };

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen hidden md:flex flex-col p-4 fixed left-0 top-0 z-10">
      <div className="mb-10 flex items-center gap-2 px-2">
        <Factory className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="font-bold text-lg leading-tight">Produção</h1>
          <span className="text-xs text-slate-400">Gestão de Modeladoras</span>
        </div>
      </div>

      <nav className="space-y-2">
        <Link
          to="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/')}`}
        >
          <LayoutDashboard size={20} />
          <span className="font-medium">Visão Geral</span>
        </Link>
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/dashboard')}`}
        >
          <Activity size={20} />
          <span className="font-medium">Dashboard</span>
        </Link>
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800 text-xs text-slate-500 px-2">
        <p>Versão 1.0.0</p>
        <p className="mt-1">Operação: Turno A</p>
      </div>
    </div>
  );
};

export default Sidebar;