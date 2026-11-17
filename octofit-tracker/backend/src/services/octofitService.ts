import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw badRequest('Activity details are required');
  const { userId, teamId, type, minutes } = input;
  if (!isObjectId(userId) || !isObjectId(teamId)) throw badRequest('Valid userId and teamId are required');
  if (typeof type !== 'string' || !type.trim()) throw badRequest('Activity type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw badRequest('Minutes must be a positive number');
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw badRequest('Activity user and team must exist');

  try {
    return await Activity.create({
      user: user._id,
      team: team._id,
      type: type.trim(),
      minutes,
      points: Math.round(minutes),
      occurredAt: new Date(),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') throw badRequest(error.message);
    throw error;
  }
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw badRequest('Team details are required');
  const { name, mascot } = input;
  if (typeof name !== 'string' || !name.trim()) throw badRequest('Team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw badRequest('Team mascot is required');

  const memberIds = input.members ?? [];
  if (!Array.isArray(memberIds) || !memberIds.every(isObjectId)) {
    throw badRequest('Team members must be valid user IDs');
  }
  const uniqueMemberIds = [...new Set(memberIds)];
  const users = await User.find({ _id: { $in: uniqueMemberIds } });
  if (users.length !== uniqueMemberIds.length) throw badRequest('Every team member must exist');

  try {
    const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members: uniqueMemberIds });
    if (uniqueMemberIds.length) {
      await User.updateMany({ _id: { $in: uniqueMemberIds } }, { $set: { team: team._id } });
    }
    return team;
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') throw badRequest(error.message);
    throw error;
  }
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: unknown; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [String(_id), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(String(team._id)) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).lean(),
    Workout.find().lean(),
  ]);
  const activityFocus = activities.map(({ type }) => {
    const normalized = type.toLowerCase();
    if (/strength|weight|resistance/.test(normalized)) return 'strength';
    if (/run|walk|cycle|swim|cardio|endurance/.test(normalized)) return 'endurance';
    return normalized;
  });
  const preferredFocus = [user.fitnessGoal.toLowerCase(), ...activityFocus];
  const orderedWorkouts = [...workouts].sort((left, right) => {
    const leftIndex = preferredFocus.indexOf(left.focus.toLowerCase());
    const rightIndex = preferredFocus.indexOf(right.focus.toLowerCase());
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
  return orderedWorkouts.map((workout) => {
    const focus = workout.focus.toLowerCase();
    const reason = focus === user.fitnessGoal.toLowerCase()
      ? `Matches your ${user.fitnessGoal} fitness goal`
      : activityFocus.includes(focus)
        ? `Builds on your recent ${focus} activity`
        : `A balanced workout to support your ${user.fitnessGoal} goal`;
    return { ...workout, reason };
  });
}

export { User };
