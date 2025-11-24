
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, Menu, X, Moon, Sun, Monitor, Settings, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import BrasiliaClock from './BrasiliaClock';

// Logo Padrão (SVG Data URI)
const LOGO_URL = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 80'%3E%3Cpath d='M40 15 C 15 15 5 40 5 40 C 5 40 15 65 40 65 C 65 65 75 40 75 40 C 75 40 65 15 40 15 Z' fill='none' stroke='%23002d72' stroke-width='4' /%3E%3Ccircle cx='40' cy='40' r='10' fill='%23002d72' /%3E%3Ctext x='85' y='52' font-family='Arial, sans-serif' font-weight='bold' font-size='42' fill='%23002d72'%3Eatrasorb%3C/text%3E%3Ctext x='88' y='72' font-family='Arial, sans-serif' font-size='12' fill='%23000'%3EAbsorvedores de CO%E2%82%82%3C/text%3E%3C/svg%3E`;

const Header: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Helper function for desktop active state
  const isActive = (path: string) => {
    const current = location.pathname;
    if (path === '/' && current === '/') return 'bg-blue-600 text-white shadow-md';
    if (path !== '/' && current.startsWith(path)) return 'bg-blue-600 text-white shadow-md';
    
    return 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white';
  };

  const isMobileActive = (path: string) => {
    const current = location.pathname;
    if (path === '/' && current === '/') return 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-semibold';
    if (path !== '/' && current.startsWith(path)) return 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-semibold';
    return 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800';
  };

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo / Title */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={closeMenu}>
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={LOGO_URL} 
                alt="Atrasorb" 
                className="h-10 sm:h-12 w-auto object-contain hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/')}`}
            >
              <Monitor size={18} />
              Máquinas
            </Link>
            <Link
              to="/overview"
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/overview')}`}
            >
              <LayoutDashboard size={18} />
              Visão Geral
            </Link>
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/dashboard')}`}
            >
              <Activity size={18} />
              Dashboard
            </Link>
             <Link
              to="/supervisor"
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/supervisor')}`}
              title="Modo Supervisor"
            >
              <Lock size={18} />
            </Link>
            <Link
              to="/settings"
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/settings')}`}
              title="Configurações"
            >
              <Settings size={18} />
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
               <BrasiliaClock />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'light' ? "Ativar modo noturno" : "Ativar modo claro"}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              onClick={toggleMenu}
              aria-label="Menu principal"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 absolute w-full shadow-lg animate-in slide-in-from-top-2 duration-200 z-40">
          <nav className="flex flex-col p-4 space-y-2">
             <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
               <span className="text-sm font-medium text-slate-500">Horário de Brasília</span>
               <BrasiliaClock />
             </div>

            <Link
              to="/"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isMobileActive('/')}`}
            >
              <Monitor size={20} />
              <span className="font-medium">Máquinas</span>
            </Link>
            <Link
              to="/overview"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isMobileActive('/overview')}`}
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Visão Geral</span>
            </Link>
            <Link
              to="/dashboard"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isMobileActive('/dashboard')}`}
            >
              <Activity size={20} />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              to="/supervisor"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isMobileActive('/supervisor')}`}
            >
              <Lock size={20} />
              <span className="font-medium">Modo Supervisor</span>
            </Link>
             <Link
              to="/settings"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isMobileActive('/settings')}`}
            >
              <Settings size={20} />
              <span className="font-medium">Configurações</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
