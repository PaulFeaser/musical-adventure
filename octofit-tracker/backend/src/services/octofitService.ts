import { isObjectIdOrHexString } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function validateInput(input: unknown): asserts input is Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw httpError('Expected a JSON object');
  }
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(`${field} is required`);
  }
  return value.trim();
}

function requiredId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !isObjectIdOrHexString(value)) {
    throw httpError(`${field} must be a valid ID`);
  }
  return value;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  validateInput(input);
  const body = input;
  const user = requiredId(body.userId, 'userId');
  const team = requiredId(body.teamId, 'teamId');
  const type = requiredText(body.type, 'type');
  const minutes = body.minutes;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw httpError('minutes must be a finite number of at least 1');
  }
  const [existingUser, existingTeam] = await Promise.all([User.exists({ _id: user }), Team.exists({ _id: team })]);
  if (!existingUser || !existingTeam) throw httpError('User or team does not exist');
  return Activity.create({ user, team, type, minutes, points: minutes, occurredAt: new Date() });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  validateInput(input);
  const body = input;
  const name = requiredText(body.name, 'name');
  const mascot = requiredText(body.mascot, 'mascot');
  const submittedMembers = body.members === undefined ? [] : body.members;
  if (!Array.isArray(submittedMembers)) throw httpError('members must be an array of user IDs');
  const members = [...new Set(submittedMembers.map((member) => requiredId(member, 'member')))];
  if (await User.countDocuments({ _id: { $in: members } }) !== members.length) {
    throw httpError('One or more members do not exist');
  }
  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ teamName: string; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: Team.collection.name, localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { teamName: '$team.name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1, _id: 1 } },
  ]);
  return totals.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) throw httpError('User not found', 404);
  const activities = await Activity.find({ user: user._id }).sort({ occurredAt: -1, _id: -1 }).limit(10).lean();
  const activityFocus = new Map([
    ['run', 'endurance'], ['cycle', 'endurance'], ['walk', 'endurance'], ['swim', 'endurance'],
    ['strength', 'strength'], ['yoga', 'mobility'], ['stretch', 'mobility'],
  ]);
  const focusMinutes = new Map<string, number>();
  for (const activity of activities) {
    const focus = activityFocus.get(activity.type.toLowerCase());
    if (focus) focusMinutes.set(focus, (focusMinutes.get(focus) ?? 0) + activity.minutes);
  }
  const recentFocus = [...focusMinutes].sort((a, b) => b[1] - a[1])[0]?.[0];
  const focus = recentFocus ?? user.fitnessGoal;
  const workouts = await Workout.find().sort({ title: 1, _id: 1 }).lean();
  return workouts
    .sort((a, b) => Number(b.focus === focus) - Number(a.focus === focus))
    .map((workout) => ({
      ...workout,
      reason: workout.focus === focus
        ? recentFocus ? `Build ${focus} based on your recent activity.` : `Support your ${focus} fitness goal.`
        : `Explore ${workout.focus} to complement your ${focus} focus.`,
    }));
}

export { User };
