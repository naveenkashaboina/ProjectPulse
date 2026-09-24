const request = require('supertest');
const app = require('../src/app');
const { clearDatabase, createTestUser, createTestOrg } = require('./setup');
const { Project, ProjectMembership, Task, Sprint, Milestone, Issue, OrgMembership, Attachment, Comment, Label } = require('../src/models');

describe('Security Hardening Test Suite', () => {
  let user1, user2, dev1;
  let org1, org2, project1, project2;
  let task1, issue1;

  beforeEach(async () => {
    await clearDatabase();

    // User 1 in Org 1 / Project 1
    user1 = await createTestUser({ email: 'lead1@pulse.com', name: 'Lead One' });
    const orgRes1 = await createTestOrg(user1.user, 'Pulse Org One');
    org1 = orgRes1.org;

    project1 = await Project.create({
      name: 'Project One',
      organization: org1._id,
      createdBy: user1.user._id,
      status: 'active',
      prefix: 'PONE',
    });

    await ProjectMembership.create({
      user: user1.user._id,
      project: project1._id,
      role: 'ProjectManager',
    });

    // Developer in Project 1
    dev1 = await createTestUser({ email: 'dev1@pulse.com', name: 'Dev One' });
    await OrgMembership.create({
      user: dev1.user._id,
      organization: org1._id,
      role: 'Developer',
      status: 'active',
    });
    await ProjectMembership.create({
      user: dev1.user._id,
      project: project1._id,
      role: 'Developer',
    });

    // User 2 in Org 2 / Project 2 (Unrelated organization)
    user2 = await createTestUser({ email: 'lead2@pulse.com', name: 'Lead Two' });
    const orgRes2 = await createTestOrg(user2.user, 'Pulse Org Two');
    org2 = orgRes2.org;

    project2 = await Project.create({
      name: 'Project Two',
      organization: org2._id,
      createdBy: user2.user._id,
      status: 'active',
      prefix: 'PTWO',
    });

    await ProjectMembership.create({
      user: user2.user._id,
      project: project2._id,
      role: 'ProjectManager',
    });

    // Seed task and issue in Project 1
    task1 = await Task.create({
      project: project1._id,
      title: 'Security Hardening Task',
      description: 'Audit file uploads and regex',
      createdBy: user1.user._id,
      status: 'todo',
    });

    issue1 = await Issue.create({
      project: project1._id,
      title: 'Security Vulnerability Report',
      description: 'Check cross-project data isolation',
      reportedBy: user1.user._id,
      status: 'open',
    });
  });

  // =========================================================================
  // 1. FILE UPLOAD SECURITY
  // =========================================================================
  describe('File Upload Security', () => {
    it('should accept legitimate file uploads (valid mime and extension)', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task1._id}/attachments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .attach('file', Buffer.from('Valid text file content for documentation'), 'doc.txt');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileName).toBe('doc.txt');
      expect(res.body.data.fileType).toBe('text/plain');
    });

    it('should reject dangerous file types (e.g. .exe executables)', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task1._id}/attachments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .attach('file', Buffer.from('MZ\x90\x00executable'), {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload',
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
    });

    it('should reject MIME-type and extension mismatches', async () => {
      // Sending a text extension with image/png MIME type
      const res = await request(app)
        .post(`/api/tasks/${task1._id}/attachments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .attach('file', Buffer.from('malicious payload disguised'), {
          filename: 'exploit.sh',
          contentType: 'image/png',
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('MIME_EXTENSION_MISMATCH');
    });

    it('should reject SVG files containing embedded scripts (Stored XSS defense)', async () => {
      const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script></svg>';
      const res = await request(app)
        .post(`/api/tasks/${task1._id}/attachments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .attach('file', Buffer.from(maliciousSvg), {
          filename: 'vector.svg',
          contentType: 'image/svg+xml',
        });

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNSAFE_SVG_CONTENT');
    });
  });

  // =========================================================================
  // 2. AUTHORIZATION & CROSS-PROJECT DATA ISOLATION
  // =========================================================================
  describe('Authorization & Cross-Project Data Isolation', () => {
    let attachment1;

    beforeEach(async () => {
      attachment1 = await Attachment.create({
        parentType: 'Task',
        parentId: task1._id,
        uploadedBy: user1.user._id,
        fileUrl: '/uploads/test-file.txt',
        fileName: 'test-file.txt',
        fileType: 'text/plain',
        size: 1024,
      });
    });

    it('should block user from another project from accessing attachment details', async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachment1._id}`)
        .set('Authorization', `Bearer ${user2.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NO_PROJECT_ACCESS');
    });

    it('should block user from another project from deleting attachment', async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachment1._id}`)
        .set('Authorization', `Bearer ${user2.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NO_PROJECT_ACCESS');
    });

    it('should block non-author, non-PM member from deleting another user attachment', async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachment1._id}`)
        .set('Authorization', `Bearer ${dev1.token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow the uploader to delete their own attachment', async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachment1._id}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should block user from another project from modifying project labels', async () => {
      const label = await Label.create({
        project: project1._id,
        name: 'Urgent',
        color: '#ff0000',
      });

      const res = await request(app)
        .put(`/api/labels/${label._id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ name: 'Tampered' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NO_PROJECT_ACCESS');
    });
  });

  // =========================================================================
  // 3. SEARCH & REGEX / REDOS SECURITY
  // =========================================================================
  describe('Search & ReDoS Security', () => {
    it('should safely handle unescaped regex metacharacters without throwing 500 error', async () => {
      const dangerousQueries = [
        '([*+?^${}()|\\',
        '(a+)+$',
        'test.*.*.*',
        '[[[invalid regex',
      ];

      for (const q of dangerousQueries) {
        const res = await request(app)
          .get(`/api/projects/${project1._id}/search?q=${encodeURIComponent(q)}`)
          .set('Authorization', `Bearer ${user1.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.tasks)).toBe(true);
        expect(Array.isArray(res.body.data.issues)).toBe(true);
      }
    });

    it('should safely bound excessively long search input (>100 characters)', async () => {
      const longInput = 'a'.repeat(500);
      const res = await request(app)
        .get(`/api/projects/${project1._id}/search?q=${longInput}`)
        .set('Authorization', `Bearer ${user1.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should escape regex characters in comment @mentions', async () => {
      const res = await request(app)
        .post(`/api/tasks/${task1._id}/comments`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          body: 'Hello @(a+)+ and @user*?[test] please review',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // 4. REQUEST VALIDATION & PRIVILEGE ESCALATION
  // =========================================================================
  describe('Request Validation & Privilege Escalation', () => {
    it('should reject task creation with missing required fields or invalid enum', async () => {
      const res = await request(app)
        .post(`/api/projects/${project1._id}/tasks`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          title: '', // empty
          status: 'invalid_status_enum',
          priority: 'extreme_danger',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject sprint with startDate >= endDate', async () => {
      const today = new Date();
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const res = await request(app)
        .post(`/api/projects/${project1._id}/sprints`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          name: 'Sprint Backwards',
          startDate: today.toISOString(),
          endDate: past.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject milestone creation with missing required dueDate', async () => {
      const res = await request(app)
        .post(`/api/projects/${project1._id}/milestones`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          title: 'Milestone Without Due Date',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject issue creation with missing required title', async () => {
      const res = await request(app)
        .post(`/api/projects/${project1._id}/issues`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          description: 'No title provided',
          severity: 'high',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent demoting the organization owner from OrgAdmin', async () => {
      const res = await request(app)
        .put(`/api/organizations/${org1._id}/members/${user1.user._id}/role`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ role: 'Developer' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_DEMOTE_OWNER');
    });

    it('should reject invalid member role update with 400', async () => {
      const res = await request(app)
        .put(`/api/organizations/${org1._id}/members/${dev1.user._id}/role`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ role: 'SuperGodAdmin' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject editing comments by non-authors', async () => {
      const comment = await Comment.create({
        parentType: 'Task',
        parentId: task1._id,
        author: user1.user._id,
        body: 'Original author comment',
      });

      const res = await request(app)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${dev1.token}`)
        .send({ body: 'Tampered comment body' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_COMMENT_AUTHOR');
    });

    it('should reject updating comment with an empty body', async () => {
      const comment = await Comment.create({
        parentType: 'Task',
        parentId: task1._id,
        author: user1.user._id,
        body: 'Valid comment',
      });

      const res = await request(app)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ body: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
