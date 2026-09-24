const request = require('supertest');
const app = require('../src/app');
const { clearDatabase, createTestUser, createTestOrg } = require('./setup');
const { Project, ProjectMembership, OrgMembership } = require('../src/models');

describe('RBAC & Permission Middleware', () => {
  let admin, dev, stakeholder, outsider;
  let org;
  let project;

  beforeEach(async () => {
    await clearDatabase();

    // Create users
    admin = await createTestUser({ email: 'admin@acme.com', name: 'Admin User' });
    dev = await createTestUser({ email: 'dev@acme.com', name: 'Dev User' });
    stakeholder = await createTestUser({ email: 'stakeholder@acme.com', name: 'Stakeholder User' });
    outsider = await createTestUser({ email: 'outsider@other.com', name: 'Outsider' });

    // Create organization with admin
    const orgRes = await createTestOrg(admin.user, 'Acme Corp');
    org = orgRes.org;

    // Add dev and stakeholder to org
    await OrgMembership.create({
      user: dev.user._id,
      organization: org._id,
      role: 'Developer',
      status: 'active',
    });
    await OrgMembership.create({
      user: stakeholder.user._id,
      organization: org._id,
      role: 'Stakeholder',
      status: 'active',
    });

    // Create project
    project = await Project.create({
      name: 'Alpha Project',
      organization: org._id,
      createdBy: admin.user._id,
      status: 'active',
    });

    // Add project memberships
    await ProjectMembership.create({ user: admin.user._id, project: project._id, role: 'OrgAdmin' });
    await ProjectMembership.create({ user: dev.user._id, project: project._id, role: 'Developer' });
    await ProjectMembership.create({ user: stakeholder.user._id, project: project._id, role: 'Stakeholder' });
  });

  it('should allow OrgAdmin to update project settings', async () => {
    const res = await request(app)
      .put(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Alpha Project Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Alpha Project Updated');
  });

  it('should forbid Developer from updating project settings (admin action)', async () => {
    const res = await request(app)
      .put(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${dev.token}`)
      .send({ name: 'Hacked Project Name' });

    expect(res.status).toBe(403);
  });

  it('should forbid Outsider from viewing project tasks', async () => {
    const res = await request(app)
      .get(`/api/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(res.status).toBe(403);
  });

  it('should forbid Stakeholder from creating tasks (edit action)', async () => {
    const res = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${stakeholder.token}`)
      .send({
        title: 'Unauthorized Task',
        priority: 'high',
      });

    expect(res.status).toBe(403);
  });

  it('should allow Developer to create a task in the project', async () => {
    const res = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${dev.token}`)
      .send({
        title: 'Developer Feature Task',
        priority: 'medium',
        status: 'todo',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Developer Feature Task');
  });
});
