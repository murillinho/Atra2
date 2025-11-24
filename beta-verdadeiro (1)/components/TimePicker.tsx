
import React from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
}

const TimePicker: React.FC<TimePickerProps> = ({ label, value, onChange, disabled }) => {
  const [hours, minutes] = value.split(':').map(Number);

  const updateTime = (newH: number, newM: number) => {
    let h = newH;
    let m = newM;

    if (m > 59) {
      m = 0;
      h = (h + 1) % 24;
    } else if (m < 0) {
      m = 59;
      h = (h - 1 + 24) % 24;
    }

    if (h > 23) h = 0;
    if (h < 0) h = 23;

    const formattedH = h.toString().padStart(2, '0');
    const formattedM = m.toString().padStart(2, '0');
    onChange(`${formattedH}:${formattedM}`);
  };

  const adjustHour = (delta: number) => updateTime(hours + delta, minutes);
  const adjustMinute = (delta: number) => updateTime(hours, minutes + delta);

  return (
    <div className={`flex flex-col ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
        <Clock size={14} className="text-blue-500" />
        {label}
      </label>
      
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
        {/* Hours Column */}
        <div className="flex flex-col items-center">
          <button 
            onClick={() => adjustHour(1)}
            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            <ChevronUp size={16} />
          </button>
          <div className="bg-white dark:bg-slate-800 w-12 h-10 flex items-center justify-center rounded-lg border border-slate-100 dark:border-slate-700 font-mono text-xl font-bold text-slate-800 dark:text-white shadow-inner">
            {hours.toString().padStart(2, '0')}
          </div>
          <button 
            onClick={() => adjustHour(-1)}
            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        <span className="text-xl font-bold text-slate-300 dark:text-slate-600 pb-1">:</span>

        {/* Minutes Column */}
        <div className="flex flex-col items-center">
          <button 
            onClick={() => adjustMinute(1)}
             className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            <ChevronUp size={16} />
          </button>
          <div className="bg-white dark:bg-slate-800 w-12 h-10 flex items-center justify-center rounded-lg border border-slate-100 dark:border-slate-700 font-mono text-xl font-bold text-slate-800 dark:text-white shadow-inner">
            {minutes.toString().padStart(2, '0')}
          </div>
          <button 
            onClick={() => adjustMinute(-1)}
            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimePicker;
