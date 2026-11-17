import { CapabilityCard } from './CapabilityCard.js';
import { useApiData } from '../api/useApiData.js';

type Activity = { _id?: string; type: string; minutes: number; points: number };

export default function Activities() {
  const { data, loading, error } = useApiData<{ activities: Activity[] }>('/api/activities');
  const activities = data?.activities ?? [];
  return <CapabilityCard title="Activities" description="Track student activity minutes and points."
    loading={loading} error={error} empty={activities.length === 0} emptyText="No activities yet.">
    <ul className="list-group">
      {activities.map((activity, index) => <li className="list-group-item" key={activity._id ?? index}>
        {activity.type}: {activity.minutes} minutes, {activity.points} points
      </li>)}
    </ul>
  </CapabilityCard>;
}
