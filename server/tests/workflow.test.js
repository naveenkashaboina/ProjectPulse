const request = require('supertest');
const app = require('../src/app');
const { clearDatabase } = require('./setup');

describe('Full Agile Collaboration Workflow', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('completes the entire end-to-end lifecycle: org -> project -> sprint -> task -> comment -> reports', async () => {
    // 1. Signup user
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Sprint Lead',
        email: 'sprintlead@acme.com',
        password: 'Password123!',
        organizationName: 'Agile Innovations',
      });

    expect(signupRes.status).toBe(201);
    const token = signupRes.body.data.accessToken;
    const orgId = signupRes.body.data.organization._id;

    // 2. Create Project
    const projRes = await request(app)
      .post(`/api/organizations/${orgId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Phoenix Cloud Platform',
        description: 'Next gen cloud platform',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

    expect(projRes.status).toBe(201);
    const projectId = projRes.body.data._id;

    // 3. Create Sprint
    const sprintRes = await request(app)
      .post(`/api/projects/${projectId}/sprints`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sprint 1 - Foundation',
        goal: 'Scaffold infrastructure and base API',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

    expect(sprintRes.status).toBe(201);
    const sprintId = sprintRes.body.data._id;

    // 4. Create Task
    const taskRes = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Design DB Schemas',
        description: 'Create Mongoose models and indexes',
        priority: 'high',
        status: 'todo',
        storyPoints: 8,
        sprint: sprintId,
      });

    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.data._id;

    // 5. Update Task Status
    const statusRes = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in-progress' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('in-progress');

    // 6. Post Comment
    const commentRes = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        body: 'Completed schema designs for User, Org, and Project models.',
      });

    expect(commentRes.status).toBe(201);

    // 7. Verify Activity Logs
    const actRes = await request(app)
      .get(`/api/projects/${projectId}/activity`)
      .set('Authorization', `Bearer ${token}`);

    expect(actRes.status).toBe(200);
    expect(actRes.body.data.length).toBeGreaterThan(0);

    // 8. Verify Reports Summary
    const repRes = await request(app)
      .get(`/api/projects/${projectId}/reports/summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(repRes.status).toBe(200);
    expect(repRes.body.data.tasks.total).toBe(1);
    expect(repRes.body.data.tasks.totalPoints).toBe(8);
  });
});
