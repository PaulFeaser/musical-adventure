import { FormEvent, useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = { _id?: string; title: string; focus: string; minutes: number; difficulty: string; reason: string };

export default function Workouts() {
  const [email, setEmail] = useState('mona@example.com');
  const [requestedEmail, setRequestedEmail] = useState('mona@example.com');
  const [suggestions, setSuggestions] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getJson<{ suggestions: Workout[] }>(`/api/workouts/suggestions/${encodeURIComponent(requestedEmail)}`)
      .then(({ suggestions: results }) => { if (active) setSuggestions(results); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load workout suggestions.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestedEmail]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestedEmail(email);
  }

  return <section aria-labelledby="workouts-heading">
    <h2 id="workouts-heading">Workout suggestions</h2>
    <p>Get workout recommendations based on your fitness goal and recent activity.</p>
    <form className="row g-3 mb-4" onSubmit={handleSubmit}>
      <div className="col-md-8"><label className="form-label" htmlFor="workout-email">Student email</label><input id="workout-email" className="form-control" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      <div className="col-md-4 d-flex align-items-end"><button className="btn btn-primary" type="submit">Find workouts</button></div>
    </form>
    {error && <p role="alert">Unable to load workout suggestions: {error}</p>}
    {loading ? <p role="status">Loading workout suggestions…</p> : suggestions.length === 0
      ? <p>No workout suggestions are available yet.</p>
      : <div className="row g-3">{suggestions.map((workout) => <div className="col-md-6" key={workout._id ?? workout.title}>
        <article className="card h-100"><div className="card-body">
          <h3 className="h5">{workout.title}</h3>
          <p>{workout.focus} · {workout.minutes} minutes · {workout.difficulty}</p>
          <p>{workout.reason}</p>
        </div></article>
      </div>)}</div>}
  </section>;
}
