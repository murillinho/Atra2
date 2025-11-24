
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMachines } from '../context/MachineContext';
import { calculateFleetMetrics, calculatePareto, generateAIInsights } from '../utils/analytics';
import { Save, Download, Upload, Clock, MonitorPlay, Timer, FileSpreadsheet, FileText, BrainCircuit } from 'lucide-react';
import TimePicker from '../components/TimePicker';

const Settings: React.FC = () => {
  const { machines, workHours, history, updateWorkHours, exportData, importData, tvConfig, updateTvConfig } = useMachines();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // --- BACKUP FUNCTIONS ---
  const handleBackupDownload = () => {
    const jsonString = exportData();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_modeladoras_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackupUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const success = importData(content);
        if (!success) {
          alert('Erro ao restaurar backup. Arquivo inválido ou corrompido.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- REPORT FUNCTIONS ---

  const handleExportExcel = () => {
    // Calcular métricas atuais
    const metrics = calculateFleetMetrics(machines, history, workHours);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR');

    // Cabeçalho do CSV
    const headers = ["Maquina", "Status", "Motivo Parada", "Producao (Pcs)", "Refugo (Pcs)", "OEE (%)", "Disponibilidade (%)", "Performance (%)", "Qualidade (%)", "MTBF (h)", "Tempo Parado Hoje (ms)"];
    
    // Linhas de dados
    const rows = metrics.map(m => {
        const machine = machines.find(mac => mac.id === m.machineId);
        return [
            m.machineName,
            machine?.status || 'N/A',
            machine?.status === 'PARADA' ? machine?.reason : 'N/A',
            machine?.productionCount || 0,
            machine?.scrapCount || 0,
            m.oee.toFixed(2),
            m.availability.toFixed(2),
            m.performance.toFixed(2),
            m.quality.toFixed(2),
            m.mtbf.toFixed(2),
            m.totalDowntimeMs
        ].join(';');
    });

    // Unir com BOM para o Excel abrir corretamente acentos
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_producao_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const metrics = calculateFleetMetrics(machines, history, workHours);
    const pareto = calculatePareto(machines, history, workHours);
    const insights = generateAIInsights(metrics, pareto);
    const dateStr = new Date().toLocaleDateString('pt-BR');

    // Criar uma janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor, permita popups para gerar o PDF.");
        return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Produção - IA</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
          h1 { color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .insights { background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 20px; margin-bottom: 30px; border-radius: 4px; }
          .insights h3 { margin-top: 0; color: #4338ca; display: flex; align-items: center; gap: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th { background-color: #1e293b; color: white; text-align: left; padding: 10px; }
          td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
          tr:nth-child(even) { background-color: #f1f5f9; }
          .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          .badge { padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
          .good { background-color: #dcfce7; color: #166534; }
          .bad { background-color: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Relatório Operacional</h1>
            <p>Gestão de Modeladoras</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Data:</strong> ${dateStr}</p>
            <p><strong>Gerado por:</strong> IA System</p>
          </div>
        </div>

        <div class="insights">
          <h3>⚡ Análise de IA</h3>
          <ul>
            ${insights.map(i => `<li>${i}</li>`).join('')}
            ${insights.length === 0 ? '<li>Nenhuma anomalia crítica detectada no momento.</li>' : ''}
          </ul>
        </div>

        <h3>Indicadores Detalhados (OEE)</h3>
        <table>
          <thead>
            <tr>
              <th>Máquina</th>
              <th>OEE</th>
              <th>Disponibilidade</th>
              <th>Performance</th>
              <th>Qualidade</th>
              <th>MTBF (h)</th>
              <th>Falhas</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.map(m => `
              <tr>
                <td><strong>${m.machineName}</strong></td>
                <td><span class="badge ${m.oee >= 70 ? 'good' : 'bad'}">${m.oee.toFixed(1)}%</span></td>
                <td>${m.availability.toFixed(1)}%</td>
                <td>${m.performance.toFixed(1)}%</td>
                <td>${m.quality.toFixed(1)}%</td>
                <td>${m.mtbf}</td>
                <td>${m.failureCount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>Top Causas de Parada (Pareto)</h3>
         <table>
          <thead>
            <tr>
              <th>Motivo</th>
              <th>Tempo Total</th>
              <th>Impacto (%)</th>
            </tr>
          </thead>
          <tbody>
            ${pareto.slice(0, 5).map(p => `
              <tr>
                <td>${p.reason}</td>
                <td>${(p.durationMs / 1000 / 60).toFixed(0)} min</td>
                <td>${p.accumulatedPercent ? (p.durationMs / (pareto[pareto.length-1]?.accumulatedPercent || 1) * 100).toFixed(1) : '-'}%</td>
              </tr>
            `).join('')}
             ${pareto.length === 0 ? '<tr><td colspan="3">Sem dados de paradas registrados.</td></tr>' : ''}
          </tbody>
        </table>

        <div class="footer">
          Este documento foi gerado automaticamente pelo sistema de gestão industrial inteligente.
        </div>
        <script>
          window.onload = () => { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 w-full max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Configurações do Sistema</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Gerencie horários, dados e relatórios.</p>
      </header>

      <div className="space-y-8">
        
        {/* 1. TV Mode Config */}
        <section className="bg-slate-900 text-white rounded-xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
           <div className="absolute right-0 top-0 p-20 bg-blue-600 rounded-full blur-3xl opacity-10"></div>
           <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
              <MonitorPlay size={24} />
            </div>
            <div>
               <h2 className="text-lg font-bold text-white">Modo TV (Chão de Fábrica)</h2>
               <p className="text-sm text-slate-400">Rotação automática de telas para grandes monitores.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
             <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Timer size={16} />
                  Intervalo de Rotação (segundos)
                </label>
                <input 
                  type="number" 
                  min="5"
                  max="300"
                  value={tvConfig.intervalSeconds}
                  onChange={(e) => updateTvConfig({...tvConfig, intervalSeconds: Number(e.target.value)})}
                  className="w-full p-3 rounded bg-slate-800 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                />
             </div>
             <button 
               onClick={() => navigate('/tv')}
               className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
             >
               <MonitorPlay size={20} />
               INICIAR MODO TV
             </button>
          </div>
        </section>

        {/* 2. Relatórios Inteligentes */}
        <section className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/50 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-indigo-100 dark:border-indigo-900/50 pb-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
              <BrainCircuit size={24} />
            </div>
            <div>
               <h2 className="text-lg font-bold text-slate-900 dark:text-white">Relatórios Inteligentes</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400">Exportação de dados com análise automática de IA.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
             <button 
               onClick={handleExportExcel}
               className="flex-1 flex items-center justify-center gap-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 py-4 px-4 rounded-xl transition-all border border-emerald-100 dark:border-emerald-800 font-bold shadow-sm hover:shadow-md"
             >
               <FileSpreadsheet size={24} />
               <div>
                 <span className="block text-sm">Exportar Excel</span>
                 <span className="text-[10px] font-normal opacity-80 uppercase">Dados Brutos (CSV)</span>
               </div>
             </button>

             <button 
               onClick={handleExportPDF}
               className="flex-1 flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 py-4 px-4 rounded-xl transition-all border border-red-100 dark:border-red-800 font-bold shadow-sm hover:shadow-md"
             >
               <FileText size={24} />
               <div>
                 <span className="block text-sm">Relatório PDF (IA)</span>
                 <span className="text-[10px] font-normal opacity-80 uppercase">Com Análise de OEE</span>
               </div>
             </button>
          </div>
        </section>

        {/* 3. Work Hours Logic */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
              <Clock size={24} />
            </div>
            <div>
               <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lógica de Congelamento (Turno)</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400">Defina quando o contador de paradas deve congelar automaticamente.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
               <label className="flex items-center gap-3 cursor-pointer bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                 <input 
                   type="checkbox" 
                   checked={workHours.enabled}
                   onChange={(e) => updateWorkHours({...workHours, enabled: e.target.checked})}
                   className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                 />
                 <span className="text-slate-700 dark:text-slate-300 font-medium">Ativar Congelamento Automático</span>
               </label>
               <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">
                 * O contador congela no fim do turno e retoma no início do próximo.
               </p>
            </div>

            <div className="flex flex-wrap gap-6 items-start">
               <TimePicker 
                  label="Início do Turno" 
                  value={workHours.start} 
                  onChange={(val) => updateWorkHours({...workHours, start: val})}
                  disabled={!workHours.enabled}
               />
               <TimePicker 
                  label="Fim do Turno" 
                  value={workHours.end} 
                  onChange={(val) => updateWorkHours({...workHours, end: val})}
                  disabled={!workHours.enabled}
               />
            </div>
          </div>
        </section>

        {/* 4. Backup & Restore */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Save size={24} />
            </div>
            <div>
               <h2 className="text-lg font-bold text-slate-900 dark:text-white">Backup e Restauração</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400">Exporte seus dados para segurança ou importe em outro dispositivo.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
             <button 
               onClick={handleBackupDownload}
               className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white py-3 px-4 rounded-lg transition-colors border border-slate-200 dark:border-slate-600"
             >
               <Download size={20} />
               Baixar Backup (JSON)
             </button>

             <div className="flex-1 relative">
               <input 
                 type="file" 
                 ref={fileInputRef}
                 accept=".json"
                 onChange={handleBackupUpload}
                 className="hidden"
               />
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 py-3 px-4 rounded-lg transition-colors border border-blue-100 dark:border-blue-800"
               >
                 <Upload size={20} />
                 Restaurar Backup
               </button>
             </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;
