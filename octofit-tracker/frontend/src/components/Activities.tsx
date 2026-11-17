import { FormEvent, useEffect, useState } from 'react';
import { getJson, postJson } from '../api/client.js';

type Activity = { _id?: string; type: string; minutes: number; points: number; occurredAt?: string };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [type, setType] = useState('run');
  const [minutes, setMinutes] = useState('30');
  const [saving, setSaving] = useState(false);

  async function loadActivities() {
    setLoading(true);
    setError('');
    try {
      const result = await getJson<{ activities: Activity[] }>('/api/activities');
      setActivities(result.activities);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load activities.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadActivities();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await postJson('/api/activities', { userId, teamId, type, minutes: Number(minutes) });
      setUserId('');
      setTeamId('');
      await loadActivities();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to record activity.');
    } finally {
      setSaving(false);
    }
  }

  return <section aria-labelledby="activities-heading">
    <h2 id="activities-heading">Activities</h2>
    <p>Track student activity minutes and points.</p>
    {error && <p role="alert">Unable to load or save activities: {error}</p>}
    <form className="card card-body mb-4" onSubmit={handleSubmit}>
      <h3 className="h5">Record an activity</h3>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label" htmlFor="activity-user">Student ID</label><input id="activity-user" className="form-control" value={userId} onChange={(event) => setUserId(event.target.value)} required /></div>
        <div className="col-md-6"><label className="form-label" htmlFor="activity-team">Team ID</label><input id="activity-team" className="form-control" value={teamId} onChange={(event) => setTeamId(event.target.value)} required /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="activity-type">Activity</label><input id="activity-type" className="form-control" value={type} onChange={(event) => setType(event.target.value)} required /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="activity-minutes">Minutes</label><input id="activity-minutes" className="form-control" type="number" min="1" value={minutes} onChange={(event) => setMinutes(event.target.value)} required /></div>
        <div className="col-md-4 d-flex align-items-end"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Record activity'}</button></div>
      </div>
    </form>
    {loading ? <p role="status">Loading activities…</p> : activities.length === 0
      ? <p>No activities have been recorded yet.</p>
      : <ul className="list-group">{activities.map((activity) => <li className="list-group-item" key={activity._id ?? `${activity.type}-${activity.minutes}`}>
        <strong>{activity.type}</strong> · {activity.minutes} minutes · {activity.points} points
        {activity.occurredAt && <span className="text-muted"> · {new Date(activity.occurredAt).toLocaleDateString()}</span>}
      </li>)}</ul>}
  </section>;
}
