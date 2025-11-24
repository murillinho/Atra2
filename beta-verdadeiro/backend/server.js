
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper para ler o DB
const readDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    // Seed inicial se não existir
    const initialData = {
      machines: Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: `Modeladora ${i + 1}`,
        status: 'FUNCIONANDO',
        reason: null,
        lastUpdated: new Date().toISOString(),
        accumulatedDowntimeMs: 0,
        notes: '',
        lastOperator: 'Sistema',
        productionCount: 0,
        scrapCount: 0,
        cycleTimeValue: 30,
        cycleTimeUnit: 'segundos'
      })),
      history: [],
      workHours: { enabled: true, start: "08:00", end: "18:49" },
      tvConfig: { intervalSeconds: 10 }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

// Helper para salvar o DB
const writeDb = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- ROTAS ---

// Obter todos os dados (Carga inicial)
app.get('/api/full-data', (req, res) => {
  const db = readDb();
  res.json(db);
});

// Atualizar Status da Máquina
app.post('/api/machines/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, reason, notes, operator } = req.body;
  
  const db = readDb();
  const machineIndex = db.machines.findIndex(m => m.id === parseInt(id));
  
  if (machineIndex === -1) return res.status(404).json({ error: 'Machine not found' });
  
  const oldMachine = db.machines[machineIndex];
  
  // Lógica de Log Histórico
  const logEntry = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    machineId: parseInt(id),
    previousStatus: oldMachine.status,
    newStatus: status,
    reason: status === 'PARADA' ? reason : null,
    timestamp: new Date().toISOString()
  };
  
  db.history.push(logEntry);
  
  // Atualizar Máquina
  db.machines[machineIndex] = {
    ...oldMachine,
    status,
    reason: status === 'FUNCIONANDO' ? null : reason,
    lastUpdated: new Date().toISOString(),
    notes: status === 'FUNCIONANDO' ? '' : notes,
    lastOperator: operator || 'Sistema'
  };
  
  writeDb(db);
  res.json({ machine: db.machines[machineIndex], log: logEntry });
});

// Atualizar Configurações Gerais (Turno e TV)
app.put('/api/config', (req, res) => {
  const { workHours, tvConfig } = req.body;
  const db = readDb();
  
  if (workHours) db.workHours = workHours;
  if (tvConfig) db.tvConfig = tvConfig;
  
  writeDb(db);
  res.json({ success: true });
});

// Atualizar Tempo Acumulado (Edição Manual)
app.put('/api/machines/:id/accumulated', (req, res) => {
  const { id } = req.params;
  const { ms } = req.body;
  
  const db = readDb();
  const idx = db.machines.findIndex(m => m.id === parseInt(id));
  if (idx > -1) {
    db.machines[idx].accumulatedDowntimeMs = ms;
    db.machines[idx].lastOperator = 'Supervisor (Ajuste Manual)';
    writeDb(db);
    res.json(db.machines[idx]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Reset Geral (Novo Turno)
app.post('/api/reset', (req, res) => {
  const db = readDb();
  db.machines = db.machines.map(m => ({
    ...m,
    productionCount: 0,
    scrapCount: 0,
    accumulatedDowntimeMs: 0,
    lastUpdated: new Date().toISOString()
  }));
  writeDb(db);
  res.json({ success: true, machines: db.machines });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
