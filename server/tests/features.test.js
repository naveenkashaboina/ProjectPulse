const request = require('supertest');
const app = require('../src/app');
const { clearDatabase, createTestUser, createTestOrg } = require('./setup');
const { Project, ProjectMembership, Task, Sprint, Milestone, Issue, OrgMembership } = require('../src/models');

describe('Full Feature Suite: Updates, Invites, Search & Workflows', () => {
  let admin, dev;
  let org, project;

  beforeEach(async () => {
    await clearDatabase();

    const adminData = await createTestUser({ email: 'admin@pulse.com', name: 'Admin Lead' });
    admin = adminData;

    const devData = await createTestUser({ email: 'coder@pulse.com', name: 'Dev Coder' });
    dev = devData;

    const orgRes = await createTestOrg(admin.user, 'Pulse Enterprise');
    org = orgRes.org;

    // Add dev to org
    await OrgMembership.create({
      user: dev.user._id,
      organization: org._id,
      role: 'Developer',
      status: 'active',
    });

    // Create project
    project = await Project.create({
      name: 'Project Pulse Platform',
      organization: org._id,
      createdBy: admin.user._id,
      status: 'active',
      prefix: 'PPP',
    });

    await ProjectMembership.create({
      user: admin.user._id,
      project: project._id,
      role: 'OrgAdmin',
    });

    await ProjectMembership.create({
      user: dev.user._id,
      project: project._id,
      role: 'Developer',
    });
  });

  it('should allow partial task update via PUT /api/tasks/:id without title in body', async () => {
    const task = await Task.create({
      project: project._id,
      title: 'Initial Core Architecture',
      description: 'Setup database schemas',
      priority: 'medium',
      status: 'todo',
      createdBy: admin.user._id,
    });

    // Dev updates priority and marks as blocked
    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${dev.token}`)
      .send({
        priority: 'critical',
        isBlocked: true,
        blockReason: 'Waiting for cloud access',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.priority).toBe('critical');
    expect(res.body.data.isBlocked).toBe(true);
    expect(res.body.data.blockReason).toBe('Waiting for cloud access');
    expect(res.body.data.title).toBe('Initial Core Architecture');
  });

  it('should allow sprint status update via PUT /api/sprints/:id without full body', async () => {
    const sprint = await Sprint.create({
      project: project._id,
      name: 'Sprint 1 - Foundations',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'planned',
    });

    const res = await request(app)
      .put(`/api/sprints/${sprint._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('should allow milestone status update via PUT /api/milestones/:id', async () => {
    const milestone = await Milestone.create({
      project: project._id,
      title: 'Beta Release v1.0',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'pending',
    });

    const res = await request(app)
      .put(`/api/milestones/${milestone._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('should support issue filing, status transition, and notes', async () => {
    // 1. File issue
    const issueRes = await request(app)
      .post(`/api/projects/${project._id}/issues`)
      .set('Authorization', `Bearer ${dev.token}`)
      .send({
        title: 'Memory leak in real-time notification socket',
        description: 'Connection leak when unmounting notification panel',
        severity: 'high',
        stepsToReproduce: '1. Open app\n2. Rapidly toggle notifications\n3. Check memory',
      });

    expect(issueRes.status).toBe(201);
    const issueId = issueRes.body.data._id;
    expect(issueRes.body.data.status).toBe('open');

    // 2. Update issue to in-progress
    const updateRes = await request(app)
      .put(`/api/issues/${issueId}`)
      .set('Authorization', `Bearer ${dev.token}`)
      .send({
        status: 'in-progress',
        statusNote: 'Investigating unmount hook listeners',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('in-progress');

    // 3. Resolve issue
    const resolveRes = await request(app)
      .put(`/api/issues/${issueId}`)
      .set('Authorization', `Bearer ${dev.token}`)
      .send({
        status: 'resolved',
        resolution: 'Cleaned up setInterval in useEffect hook return function.',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('resolved');

    // 4. Verify issue status history
    const getRes = await request(app)
      .get(`/api/issues/${issueId}`)
      .set('Authorization', `Bearer ${dev.token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.statusHistory.length).toBeGreaterThanOrEqual(3);
  });

  it('should support invitation workflow: invite -> get details -> accept', async () => {
    // 1. Admin sends invitation
    const inviteRes = await request(app)
      .post(`/api/organizations/${org._id}/invitations`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        email: 'newhire@pulse.com',
        role: 'TeamLead',
      });

    expect(inviteRes.status).toBe(201);
    const token = inviteRes.body.data.inviteToken;
    expect(token).toBeDefined();

    // 2. Get invitation details (unauthenticated)
    const getInviteRes = await request(app)
      .get(`/api/invitations/${token}`);

    expect(getInviteRes.status).toBe(200);
    expect(getInviteRes.body.data.organization.name).toBe('Pulse Enterprise');
    expect(getInviteRes.body.data.role).toBe('TeamLead');

    // 3. New user registers and accepts
    const newUserData = await createTestUser({ email: 'newhire@pulse.com', name: 'New Hire Lead' });
    const acceptRes = await request(app)
      .post(`/api/invitations/${token}/accept`)
      .set('Authorization', `Bearer ${newUserData.token}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.message).toBe('Invitation accepted');

    // 4. Verify new user has active membership
    const membership = await OrgMembership.findOne({
      user: newUserData.user._id,
      organization: org._id,
      status: 'active',
    });
    expect(membership).not.toBeNull();
    expect(membership.role).toBe('TeamLead');
  });

  it('should search project tasks and issues via GET /api/projects/:id/search', async () => {
    await Task.create({
      project: project._id,
      title: 'Authentication microservice migration',
      description: 'Migrate to Docker container',
      createdBy: admin.user._id,
    });

    await Issue.create({
      project: project._id,
      title: 'Authentication token expiration bug',
      description: 'Tokens expiring prematurely',
      reportedBy: dev.user._id,
    });

    const searchRes = await request(app)
      .get(`/api/projects/${project._id}/search?q=authentication`)
      .set('Authorization', `Bearer ${dev.token}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.tasks.length).toBe(1);
    expect(searchRes.body.data.issues.length).toBe(1);
    expect(searchRes.body.data.tasks[0].title).toContain('Authentication microservice');
    expect(searchRes.body.data.issues[0].title).toContain('Authentication token');
  });
});
