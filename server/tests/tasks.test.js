const request = require('supertest');
const app = require('../src/app');
const { clearDatabase, createTestUser, createTestOrg } = require('./setup');
const { Project, ProjectMembership, Task } = require('../src/models');

describe('Task Management & Transitions', () => {
  let user, token, org, project;

  beforeEach(async () => {
    await clearDatabase();

    const userData = await createTestUser({ email: 'taskmaster@acme.com' });
    user = userData.user;
    token = userData.token;

    const orgData = await createTestOrg(user, 'Acme Tasks Org');
    org = orgData.org;

    project = await Project.create({
      name: 'Task Test Project',
      organization: org._id,
      createdBy: user._id,
      status: 'active',
    });

    await ProjectMembership.create({
      user: user._id,
      project: project._id,
      role: 'OrgAdmin',
    });
  });

  it('should create a new task successfully', async () => {
    const res = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Implement OAuth Flow',
        description: 'Set up Google and GitHub OAuth providers',
        priority: 'high',
        status: 'todo',
        storyPoints: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Implement OAuth Flow');
    expect(res.body.data.storyPoints).toBe(5);
    expect(res.body.data.status).toBe('todo');
  });

  it('should filter tasks by status and priority', async () => {
    await Task.create([
      { project: project._id, title: 'Task 1', status: 'backlog', priority: 'low', createdBy: user._id },
      { project: project._id, title: 'Task 2', status: 'in-progress', priority: 'critical', createdBy: user._id },
      { project: project._id, title: 'Task 3', status: 'done', priority: 'high', createdBy: user._id },
    ]);

    const res = await request(app)
      .get(`/api/projects/${project._id}/tasks?status=in-progress`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Task 2');
  });

  it('should update task status via PATCH /api/tasks/:id/status', async () => {
    const task = await Task.create({
      project: project._id,
      title: 'Status Transition Task',
      status: 'todo',
      priority: 'medium',
      createdBy: user._id,
    });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in-progress' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in-progress');

    // Move to done
    const doneRes = await request(app)
      .patch(`/api/tasks/${task._id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' });

    expect(doneRes.status).toBe(200);
    expect(doneRes.body.data.status).toBe('done');
  });

  it('should delete a task via DELETE /api/tasks/:id', async () => {
    const task = await Task.create({
      project: project._id,
      title: 'Disposable Task',
      status: 'backlog',
      createdBy: user._id,
    });

    const res = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const check = await Task.findById(task._id);
    expect(check).toBeNull();
  });
});
