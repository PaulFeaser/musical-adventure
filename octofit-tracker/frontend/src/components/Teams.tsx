import { FormEvent, useEffect, useState } from 'react';
import { getJson, postJson } from '../api/client.js';

type Team = { _id?: string; name: string; mascot: string; members: string[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState('');
  const [mascot, setMascot] = useState('');
  const [memberIds, setMemberIds] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadTeams() {
    setLoading(true);
    setError('');
    try {
      const result = await getJson<{ teams: Team[] }>('/api/teams');
      setTeams(result.teams);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load teams.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeams();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await postJson('/api/teams', {
        name,
        mascot,
        members: memberIds.split(',').map((id) => id.trim()).filter(Boolean),
      });
      setName('');
      setMascot('');
      setMemberIds('');
      await loadTeams();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create team.');
    } finally {
      setSaving(false);
    }
  }

  return <section aria-labelledby="teams-heading">
    <h2 id="teams-heading">Teams</h2>
    <p>Join teams, find your teammates, and compete together.</p>
    {error && <p role="alert">Unable to load or save teams: {error}</p>}
    <form className="card card-body mb-4" onSubmit={handleSubmit}>
      <h3 className="h5">Create a team</h3>
      <div className="row g-3">
        <div className="col-md-3"><label className="form-label" htmlFor="team-name">Team name</label><input id="team-name" className="form-control" value={name} onChange={(event) => setName(event.target.value)} required /></div>
        <div className="col-md-3"><label className="form-label" htmlFor="team-mascot">Mascot</label><input id="team-mascot" className="form-control" value={mascot} onChange={(event) => setMascot(event.target.value)} required /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="team-members">Student IDs (comma-separated, optional)</label><input id="team-members" className="form-control" value={memberIds} onChange={(event) => setMemberIds(event.target.value)} /></div>
        <div className="col-md-2 d-flex align-items-end"><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create team'}</button></div>
      </div>
    </form>
    {loading ? <p role="status">Loading teams…</p> : teams.length === 0
      ? <p>No teams have been created yet.</p>
      : <div className="row g-3">{teams.map((team) => <div className="col-md-6" key={team._id ?? team.name}>
        <article className="card h-100"><div className="card-body">
          <h3 className="h5">{team.name}</h3><p>Mascot: {team.mascot}</p>
          <p>{team.members.length} {team.members.length === 1 ? 'member' : 'members'}</p>
          {team._id && <p className="small text-muted mb-1">Team ID: {team._id}</p>}
          {team.members.map((member) => <p className="small text-muted mb-1" key={member}>Student ID: {member}</p>)}
        </div></article>
      </div>)}</div>}
  </section>;
}
