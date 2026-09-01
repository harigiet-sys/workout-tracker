const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'entries.json');

// Ensure data dir + file exist
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

function readEntries() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeEntries(entries) {
  // Write to a temp file then rename — avoids a corrupted file if the process dies mid-write
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/entries', (req, res) => {
  res.json(readEntries().sort((a, b) => a.date.localeCompare(b.date)));
});

app.post('/api/entries', (req, res) => {
  const { id, date, bodypart, exercise, sets, notes } = req.body;
  if (!id || !date || !bodypart || !exercise || !sets) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const entries = readEntries();
  if (entries.some(e => e.id === id)) {
    return res.status(409).json({ error: 'Entry with this id already exists' });
  }
  entries.push({ id, date, bodypart, exercise, sets, notes: notes || '' });
  writeEntries(entries);
  res.json({ ok: true });
});

app.put('/api/entries/:id', (req, res) => {
  const { date, bodypart, exercise, sets, notes } = req.body;
  const entries = readEntries();
  const idx = entries.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  entries[idx] = { id: req.params.id, date, bodypart, exercise, sets, notes: notes || '' };
  writeEntries(entries);
  res.json({ ok: true });
});

app.delete('/api/entries/:id', (req, res) => {
  const entries = readEntries().filter(e => e.id !== req.params.id);
  writeEntries(entries);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Workout tracker running on port ${PORT}`));
