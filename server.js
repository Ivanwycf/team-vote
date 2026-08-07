const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'vote_data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// In-memory vote store, persisted to file
let votes = {};

try {
  if (fs.existsSync(DATA_FILE)) {
    votes = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    console.log('Loaded ' + Object.keys(votes).length + ' votes from disk');
  }
} catch(e) {
  console.error('Failed to load vote data:', e.message);
}

function persist() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(votes), 'utf-8'); }
  catch(e) { console.error('Failed to persist votes:', e.message); }
}

// GET /api/votes
app.get('/api/votes', (req, res) => {
  const counts = { taizhou: 0, lishui: 0, yangzhou: 0 };
  for (const uid of Object.keys(votes)) {
    const d = votes[uid];
    if (counts[d] !== undefined) counts[d]++;
  }
  res.json({
    records: votes,
    counts,
    total: counts.taizhou + counts.lishui + counts.yangzhou,
    timestamp: Date.now()
  });
});

// POST /api/vote
app.post('/api/vote', (req, res) => {
  const { userId, destination } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!['taizhou', 'lishui', 'yangzhou'].includes(destination)) {
    return res.status(400).json({ error: 'Invalid destination' });
  }
  votes[userId] = destination;
  persist();
  console.log('VOTE: ' + userId + ' -> ' + destination + ' (total: ' + Object.keys(votes).length + ')');

  const counts = { taizhou: 0, lishui: 0, yangzhou: 0 };
  for (const uid of Object.keys(votes)) {
    const d = votes[uid];
    if (counts[d] !== undefined) counts[d]++;
  }
  res.json({ success: true, counts, total: counts.taizhou + counts.lishui + counts.yangzhou, userVoted: destination });
});

// DELETE /api/vote
app.delete('/api/vote', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  delete votes[userId];
  persist();
  console.log('CANCEL: ' + userId + ' (total: ' + Object.keys(votes).length + ')');

  const counts = { taizhou: 0, lishui: 0, yangzhou: 0 };
  for (const uid of Object.keys(votes)) {
    const d = votes[uid];
    if (counts[d] !== undefined) counts[d]++;
  }
  res.json({ success: true, counts, total: counts.taizhou + counts.lishui + counts.yangzhou });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', votes: Object.keys(votes).length });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('团建投票服务器已启动: port ' + PORT);
  console.log('已有 ' + Object.keys(votes).length + ' 条投票记录');
});
