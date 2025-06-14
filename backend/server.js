const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database/expenses.db', (err) => {
    if (err) return console.error(err.message);
    console.log('Conectado ao banco SQLite.');
});

db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    description TEXT,
    amount REAL,
    date TEXT
)`);

app.post('/api/expenses', (req, res) => {
    const { type, description, amount, date } = req.body;
    db.run(`INSERT INTO expenses (type, description, amount, date) VALUES (?, ?, ?, ?)`,
        [type, description, amount, date],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
});

app.get('/api/summary/:date', (req, res) => {
    const date = req.params.date;
    db.all(`SELECT type, SUM(amount) as total FROM expenses WHERE date = ? GROUP BY type`, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        let summary = { Produto: 0, Conta: 0, Funcionario: 0 };
        rows.forEach(row => { summary[row.type] = row.total; });
        res.json(summary);
    });
});

app.get('/api/weekly-summary', (req, res) => {
    const today = new Date();
    const first = today.getDate() - today.getDay(); // Domingo
    const weekDates = [...Array(7).keys()].map(i => {
        const d = new Date(today.getFullYear(), today.getMonth(), first + i);
        return d.toISOString().split('T')[0];
    });

    const placeholders = weekDates.map(() => '?').join(',');
    db.all(`SELECT date, SUM(amount) as total FROM expenses WHERE date IN (${placeholders}) GROUP BY date`, weekDates, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const result = weekDates.map(date => {
            const row = rows.find(r => r.date === date);
            const dayName = new Date(date).toLocaleDateString('pt-BR', { weekday: 'long' });
            return { date, day: dayName.charAt(0).toUpperCase() + dayName.slice(1), total: row ? row.total : 0 };
        });

        res.json(result);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
