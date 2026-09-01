const express = require('express');
const path = require('path');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables.');
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function init() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      bodypart TEXT NOT NULL,
      exercise TEXT NOT NULL,
      sets TEXT NOT NULL,
      notes TEXT
    )
  `);
}
init().catch(err => console.error('DB init failed:', err));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/entries', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM entries ORDER BY date ASC');
    const rows = result.rows.map(r => ({
      id: r.id, date: r.date, bodypart: r.bodypart, exercise: r.exercise,
      sets: JSON.parse(r.sets), notes: r.notes || ''
    }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB read failed' });
  }
});

app.post('/api/entries', async (req, res) => {
  try {
    const { id, date, bodypart, exercise, sets, notes } = req.body;
    if (!id || !date || !bodypart || !exercise || !sets) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await db.execute({
      sql: 'INSERT INTO entries (id, date, bodypart, exercise, sets, notes) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, date, bodypart, exercise, JSON.stringify(sets), notes || '']
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB write failed' });
  }
});

app.put('/api/entries/:id', async (req, res) => {
  try {
    const { date, bodypart, exercise, sets, notes } = req.body;
    const result = await db.execute({
      sql: 'UPDATE entries SET date=?, bodypart=?, exercise=?, sets=?, notes=? WHERE id=?',
      args: [date, bodypart, exercise, JSON.stringify(sets), notes || '', req.params.id]
    });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB update failed' });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM entries WHERE id=?', args: [req.params.id] });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB delete failed' });
  }
});

app.listen(PORT, () => console.log(`Workout tracker running on port ${PORT}`));
