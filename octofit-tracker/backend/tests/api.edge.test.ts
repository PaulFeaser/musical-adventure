import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Activity, Team, User, Workout } from '../src/models/index.js';

const app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({}), User.deleteMany({}), Workout.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('API validation and recommendation edge cases', () => {
  it('rejects invalid activity values without persisting and computes server-owned fields', async () => {
    const user = await User.create({ name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance' });
    const team = await Team.create({ name: 'Octocats', mascot: 'Mona' });
    const input = { userId: user._id.toString(), teamId: team._id.toString(), type: 'run', minutes: 12 };
    for (const invalid of [{ minutes: 0 }, { minutes: -5 }, { minutes: '12' }, { type: '   ' }, { type: 42 }]) {
      const response = await request(app).post('/api/activities').send({ ...input, ...invalid });
      expect(response.status).toBe(400);
      expect(response.body.error).toEqual(expect.any(String));
    }
    expect(await Activity.countDocuments()).toBe(0);
    const response = await request(app).post('/api/activities').send({
      ...input, points: 9999, occurredAt: '2000-01-01T00:00:00.000Z',
    });
    expect(response.status).toBe(201);
    expect(response.body.activity.points).toBe(12);
    expect(Date.parse(response.body.activity.occurredAt)).toBeGreaterThan(Date.parse('2000-01-01'));
  });

  it('rejects invalid team members and defaults omitted members to an empty list', async () => {
    for (const members of ['not-an-array', null, ['bad-id'], [new mongoose.Types.ObjectId().toString()]]) {
      const response = await request(app).post('/api/teams').send({ name: 'Octocats', mascot: 'Mona', members });
      expect(response.status).toBe(400);
      expect(response.body.error).toEqual(expect.any(String));
    }
    const invalid = await request(app).post('/api/teams').send({ name: '   ', mascot: 'Mona' });
    expect(invalid.status).toBe(400);
    expect(await Team.countDocuments()).toBe(0);
    const response = await request(app).post('/api/teams').send({ name: 'Octocats', mascot: 'Mona' });
    expect(response.status).toBe(201);
    expect(response.body.team.members).toEqual([]);
  });

  it('uses the goal without activity history and recent activity when available', async () => {
    const user = await User.create({ name: 'Mona', email: 'mona@example.com', fitnessGoal: 'strength' });
    const team = await Team.create({ name: 'Octocats', mascot: 'Mona' });
    await Workout.create([
      { title: 'Intervals', focus: 'endurance', minutes: 30, difficulty: 'moderate' },
      { title: 'Strength Circuit', focus: 'strength', minutes: 30, difficulty: 'moderate' },
    ]);
    const goalResponse = await request(app).get('/api/workouts/suggestions/mona%40example.com');
    expect(goalResponse.body.suggestions[0]).toMatchObject({
      focus: 'strength', reason: expect.stringMatching(/goal/i),
    });
    await Activity.create({ user: user._id, team: team._id, type: 'constructor', minutes: 20, points: 20, occurredAt: new Date() });
    const unmappedResponse = await request(app).get('/api/workouts/suggestions/mona%40example.com');
    expect(unmappedResponse.body.suggestions[0].focus).toBe('strength');
    await Activity.create({ user: user._id, team: team._id, type: 'run', minutes: 20, points: 20, occurredAt: new Date() });
    const activityResponse = await request(app).get('/api/workouts/suggestions/mona%40example.com');
    expect(activityResponse.body.suggestions[0]).toMatchObject({
      focus: 'endurance', reason: expect.stringMatching(/activity/i),
    });
  });
});
