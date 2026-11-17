import { CapabilityCard } from './CapabilityCard.js';
import { useApiData } from '../api/useApiData.js';

type Team = { _id?: string; name: string; mascot?: string; members: string[] };

export default function Teams() {
  const { data, loading, error } = useApiData<{ teams: Team[] }>('/api/teams');
  const teams = data?.teams ?? [];
  return <CapabilityCard title="Teams" description="Manage teams and members."
    loading={loading} error={error} empty={teams.length === 0} emptyText="No teams yet.">
    <ul className="list-group">
      {teams.map((team, index) => <li className="list-group-item" key={team._id ?? index}>
        <h3 className="h5">{team.name}</h3>
        {team.mascot && <p>Mascot: {team.mascot}</p>}
        <p>Members: {team.members.length}</p>
      </li>)}
    </ul>
  </CapabilityCard>;
}
