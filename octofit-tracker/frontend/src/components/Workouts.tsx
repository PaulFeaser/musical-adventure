import { CapabilityCard } from './CapabilityCard.js';
import { useApiData } from '../api/useApiData.js';

type Workout = { _id?: string; title: string; reason: string; minutes?: number; difficulty?: string };

export default function Workouts() {
  const { data, loading, error } = useApiData<{ suggestions: Workout[] }>(
    `/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`,
  );
  const suggestions = data?.suggestions ?? [];
  return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns."
    loading={loading} error={error} empty={suggestions.length === 0} emptyText="No workout suggestions yet.">
    <ul className="list-group">
      {suggestions.map((workout, index) => <li className="list-group-item" key={workout._id ?? index}>
        <h3 className="h5">{workout.title}</h3>
        <p>{workout.reason}</p>
        {workout.minutes !== undefined && <p>{workout.minutes} minutes</p>}
        {workout.difficulty && <p>Difficulty: {workout.difficulty}</p>}
      </li>)}
    </ul>
  </CapabilityCard>;
}
