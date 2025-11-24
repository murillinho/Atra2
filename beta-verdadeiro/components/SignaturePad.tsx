
import React, { useRef, useEffect, useState } from 'react';
import { Eraser, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onEnd: (dataUrl: string | null) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Ajustar resolução para telas de alta densidade
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a'; // Slate 900
    }
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Previne scroll em touch
    if ('touches' in e) {
      // e.preventDefault(); // Comentado pois pode bloquear scroll da pagina inteira se mal implementado, usar touch-action css
    }

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    
    if (!hasSignature) setHasSignature(true);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      onEnd(canvas.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onEnd(null);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <PenTool size={16} />
          Assinatura do Operador (Obrigatório)
        </label>
        <button 
          onClick={clear}
          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
        >
          <Eraser size={12} /> Limpar
        </button>
      </div>
      <div className="relative w-full h-40 bg-white dark:bg-slate-200 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-500 overflow-hidden touch-none">
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
             <span className="text-slate-500 font-handwriting text-2xl">Assine aqui</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          style={{ touchAction: 'none' }} 
        />
      </div>
    </div>
  );
};

export default SignaturePad;
