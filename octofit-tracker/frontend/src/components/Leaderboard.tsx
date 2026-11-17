import { CapabilityCard } from './CapabilityCard.js';
import { useApiData } from '../api/useApiData.js';

type Entry = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const { data, loading, error } = useApiData<{ leaderboard: Entry[] }>('/api/leaderboard');
  const leaderboard = data?.leaderboard ?? [];
  return <CapabilityCard title="Leaderboard" description="Compare team point totals."
    loading={loading} error={error} empty={leaderboard.length === 0} emptyText="No leaderboard scores yet.">
    <table className="table">
      <caption>Team rankings by total activity points</caption>
      <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Points</th></tr></thead>
      <tbody>{leaderboard.map((entry) => <tr key={entry.rank}>
        <td>{entry.rank}</td><th scope="row">{entry.teamName}</th><td>{entry.totalPoints}</td>
      </tr>)}</tbody>
    </table>
  </CapabilityCard>;
}
