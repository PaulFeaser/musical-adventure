import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Entry[] }>('/api/leaderboard')
      .then(({ leaderboard }) => { if (active) setEntries(leaderboard); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load leaderboard.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section aria-labelledby="leaderboard-heading">
    <h2 id="leaderboard-heading">Leaderboard</h2>
    <p>Compare team point totals and celebrate your progress.</p>
    {error && <p role="alert">Unable to load leaderboard: {error}</p>}
    {loading ? <p role="status">Loading leaderboard…</p> : entries.length === 0
      ? <p>No leaderboard rankings or scores yet.</p>
      : <ol className="list-group list-group-numbered">{entries.map((entry) => <li className="list-group-item d-flex justify-content-between" key={`${entry.rank}-${entry.teamName}`}>
        <span>{entry.teamName} <span className="text-muted">(rank {entry.rank})</span></span><strong>{entry.totalPoints} points</strong>
      </li>)}</ol>}
  </section>;
}
