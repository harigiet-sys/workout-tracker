const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, 'workout.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    bodypart TEXT NOT NULL,
    exercise TEXT NOT NULL,
    sets TEXT NOT NULL,
    notes TEXT
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get all entries
app.get('/api/entries', (req, res) => {
  const rows = db.prepare('SELECT * FROM entries ORDER BY date ASC').all();
  res.json(rows.map(r => ({ ...r, sets: JSON.parse(r.sets) })));
});

// Create entry
app.post('/api/entries', (req, res) => {
  const { id, date, bodypart, exercise, sets, notes } = req.body;
  if (!id || !date || !bodypart || !exercise || !sets) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.prepare(
    'INSERT INTO entries (id, date, bodypart, exercise, sets, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, date, bodypart, exercise, JSON.stringify(sets), notes || '');
  res.json({ ok: true });
});

// Update entry
app.put('/api/entries/:id', (req, res) => {
  const { date, bodypart, exercise, sets, notes } = req.body;
  const result = db.prepare(
    'UPDATE entries SET date=?, bodypart=?, exercise=?, sets=?, notes=? WHERE id=?'
  ).run(date, bodypart, exercise, JSON.stringify(sets), notes || '', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// Delete entry
app.delete('/api/entries/:id', (req, res) => {
  db.prepare('DELETE FROM entries WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Workout tracker running on port ${PORT}`));
