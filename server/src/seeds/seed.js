const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const connectDB = require('../config/db');

const {
  User, Organization, OrgMembership, Team, Project, ProjectMembership,
  Milestone, Sprint, Task, Issue, Comment, Attachment, ActivityLog,
  Notification, Label,
} = require('../models');

const PASSWORD = 'Password123!';

// Helper to create dates relative to today
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function seed() {
  await connectDB();
  console.log('🌱 Starting seed...\n');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}), Organization.deleteMany({}), OrgMembership.deleteMany({}),
    Team.deleteMany({}), Project.deleteMany({}), ProjectMembership.deleteMany({}),
    Milestone.deleteMany({}), Sprint.deleteMany({}), Task.deleteMany({}),
    Issue.deleteMany({}), Comment.deleteMany({}), Attachment.deleteMany({}),
    ActivityLog.deleteMany({}), Notification.deleteMany({}), Label.deleteMany({}),
  ]);
  console.log('  Cleared all collections');

  // =================== USERS ===================
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const usersData = [
    { name: 'Sarah Chen', email: 'sarah.chen@acmecorp.com', passwordHash, avatar: null },
    { name: 'Marcus Williams', email: 'marcus.williams@acmecorp.com', passwordHash, avatar: null },
    { name: 'Elena Rodriguez', email: 'elena.rodriguez@acmecorp.com', passwordHash, avatar: null },
    { name: 'David Kim', email: 'david.kim@acmecorp.com', passwordHash, avatar: null },
    { name: 'Priya Patel', email: 'priya.patel@acmecorp.com', passwordHash, avatar: null },
    { name: 'James O\'Brien', email: 'james.obrien@acmecorp.com', passwordHash, avatar: null },
    { name: 'Aisha Johnson', email: 'aisha.johnson@acmecorp.com', passwordHash, avatar: null },
    { name: 'Tom Nakamura', email: 'tom.nakamura@stellarlabs.com', passwordHash, avatar: null },
    { name: 'Lisa Fernandez', email: 'lisa.fernandez@stellarlabs.com', passwordHash, avatar: null },
    { name: 'Robert Chang', email: 'robert.chang@stellarlabs.com', passwordHash, avatar: null },
  ];

  const users = await User.insertMany(usersData.map(u => ({ ...u })));
  console.log(`  Created ${users.length} users`);

  // =================== ORGANIZATIONS ===================
  const orgs = await Organization.insertMany([
    { name: 'Acme Corporation', owner: users[0]._id, description: 'Leading software solutions company focused on enterprise platforms' },
    { name: 'Stellar Labs', owner: users[7]._id, description: 'Innovative startup building next-gen developer tools' },
  ]);
  console.log(`  Created ${orgs.length} organizations`);

  // =================== ORG MEMBERSHIPS ===================
  const orgMemberships = await OrgMembership.insertMany([
    // Acme Corp members
    { user: users[0]._id, organization: orgs[0]._id, role: 'OrgAdmin', status: 'active' },
    { user: users[1]._id, organization: orgs[0]._id, role: 'ProjectManager', status: 'active' },
    { user: users[2]._id, organization: orgs[0]._id, role: 'TeamLead', status: 'active' },
    { user: users[3]._id, organization: orgs[0]._id, role: 'Developer', status: 'active' },
    { user: users[4]._id, organization: orgs[0]._id, role: 'Developer', status: 'active' },
    { user: users[5]._id, organization: orgs[0]._id, role: 'Developer', status: 'active' },
    { user: users[6]._id, organization: orgs[0]._id, role: 'Stakeholder', status: 'active' },
    // Stellar Labs members  
    { user: users[7]._id, organization: orgs[1]._id, role: 'OrgAdmin', status: 'active' },
    { user: users[8]._id, organization: orgs[1]._id, role: 'ProjectManager', status: 'active' },
    { user: users[9]._id, organization: orgs[1]._id, role: 'Developer', status: 'active' },
    // Cross-org: Sarah is also in Stellar Labs as PM
    { user: users[0]._id, organization: orgs[1]._id, role: 'ProjectManager', status: 'active' },
    // Cross-org: David is also in Stellar as Developer
    { user: users[3]._id, organization: orgs[1]._id, role: 'Developer', status: 'active' },
  ]);
  console.log(`  Created ${orgMemberships.length} org memberships`);

  // =================== TEAMS ===================
  const teams = await Team.insertMany([
    { organization: orgs[0]._id, name: 'Backend Team', members: [users[3]._id, users[5]._id], lead: users[2]._id, description: 'API and server development' },
    { organization: orgs[0]._id, name: 'Frontend Team', members: [users[4]._id], lead: users[2]._id, description: 'UI/UX implementation' },
    { organization: orgs[0]._id, name: 'QA Team', members: [users[5]._id], lead: users[2]._id, description: 'Quality assurance and testing' },
    { organization: orgs[1]._id, name: 'Core Team', members: [users[9]._id, users[3]._id], lead: users[8]._id, description: 'Core platform development' },
  ]);
  console.log(`  Created ${teams.length} teams`);

  // =================== PROJECTS ===================
  const projects = await Project.insertMany([
    { organization: orgs[0]._id, team: teams[0]._id, name: 'Phoenix Platform', description: 'Next-generation enterprise platform with microservices architecture', startDate: daysAgo(60), endDate: daysFromNow(90), status: 'active', createdBy: users[1]._id, prefix: 'PHX' },
    { organization: orgs[0]._id, team: teams[1]._id, name: 'Atlas Mobile App', description: 'Cross-platform mobile application for field service management', startDate: daysAgo(30), endDate: daysFromNow(120), status: 'active', createdBy: users[1]._id, prefix: 'ATL' },
    { organization: orgs[0]._id, team: teams[0]._id, name: 'Mercury API Gateway', description: 'High-performance API gateway with rate limiting and analytics', startDate: daysAgo(90), endDate: daysAgo(5), status: 'active', createdBy: users[0]._id, prefix: 'MRC' },
    { organization: orgs[1]._id, team: teams[3]._id, name: 'Nova Dashboard', description: 'Real-time analytics dashboard with customizable widgets', startDate: daysAgo(20), endDate: daysFromNow(60), status: 'active', createdBy: users[8]._id, prefix: 'NVA' },
  ]);
  console.log(`  Created ${projects.length} projects`);

  // =================== PROJECT MEMBERSHIPS ===================
  const projMemberships = await ProjectMembership.insertMany([
    // Phoenix Platform
    { user: users[1]._id, project: projects[0]._id, role: 'ProjectManager' },
    { user: users[2]._id, project: projects[0]._id, role: 'TeamLead' },
    { user: users[3]._id, project: projects[0]._id, role: 'Developer' },
    { user: users[5]._id, project: projects[0]._id, role: 'Developer' },
    { user: users[6]._id, project: projects[0]._id, role: 'Stakeholder' },
    // Atlas Mobile App
    { user: users[1]._id, project: projects[1]._id, role: 'ProjectManager' },
    { user: users[2]._id, project: projects[1]._id, role: 'TeamLead' },
    { user: users[4]._id, project: projects[1]._id, role: 'Developer' },
    { user: users[6]._id, project: projects[1]._id, role: 'Stakeholder' },
    // Mercury API — demonstrates different role
    { user: users[0]._id, project: projects[2]._id, role: 'ProjectManager' },
    { user: users[3]._id, project: projects[2]._id, role: 'TeamLead' },  // David is TL here, Dev elsewhere
    { user: users[5]._id, project: projects[2]._id, role: 'Developer' },
    // Nova Dashboard (Stellar Labs)
    { user: users[8]._id, project: projects[3]._id, role: 'ProjectManager' },
    { user: users[9]._id, project: projects[3]._id, role: 'Developer' },
    { user: users[0]._id, project: projects[3]._id, role: 'Stakeholder' },  // Sarah is Stakeholder here
    { user: users[3]._id, project: projects[3]._id, role: 'Developer' },
  ]);
  console.log(`  Created ${projMemberships.length} project memberships`);

  // =================== LABELS ===================
  const labelsData = [];
  const labelDefs = [
    { name: 'bug', color: '#EF4444' },
    { name: 'feature', color: '#6366F1' },
    { name: 'enhancement', color: '#06B6D4' },
    { name: 'documentation', color: '#F59E0B' },
    { name: 'performance', color: '#10B981' },
    { name: 'security', color: '#F97316' },
    { name: 'ui/ux', color: '#EC4899' },
    { name: 'backend', color: '#8B5CF6' },
  ];
  for (const project of projects) {
    for (const ld of labelDefs) {
      labelsData.push({ project: project._id, ...ld });
    }
  }
  const labels = await Label.insertMany(labelsData);
  console.log(`  Created ${labels.length} labels`);

  // Helper to get labels for a project
  const getProjectLabels = (projectIdx) => labels.filter(l => l.project.toString() === projects[projectIdx]._id.toString());

  // =================== MILESTONES ===================
  const milestones = await Milestone.insertMany([
    // Phoenix Platform milestones
    { project: projects[0]._id, title: 'Architecture Design Complete', dueDate: daysAgo(40), status: 'completed', completedAt: daysAgo(42), description: 'Complete microservices architecture design and tech stack decisions' },
    { project: projects[0]._id, title: 'Core API v1.0', dueDate: daysAgo(10), status: 'completed', completedAt: daysAgo(8), description: 'First version of core REST APIs ready for integration' },
    { project: projects[0]._id, title: 'Beta Release', dueDate: daysFromNow(30), status: 'in-progress', description: 'Feature-complete beta ready for stakeholder testing' },
    { project: projects[0]._id, title: 'Production Launch', dueDate: daysFromNow(80), status: 'pending', description: 'Full production deployment with monitoring' },
    // Atlas milestones
    { project: projects[1]._id, title: 'UI Wireframes Approved', dueDate: daysAgo(15), status: 'completed', completedAt: daysAgo(16), description: 'All wireframes approved by stakeholders' },
    { project: projects[1]._id, title: 'MVP Feature Set', dueDate: daysFromNow(20), status: 'in-progress', description: 'Core mobile features implemented' },
    { project: projects[1]._id, title: 'App Store Submission', dueDate: daysFromNow(100), status: 'pending', description: 'Submit to iOS App Store and Google Play' },
    // Mercury milestones (one overdue)
    { project: projects[2]._id, title: 'Rate Limiting Engine', dueDate: daysAgo(30), status: 'completed', completedAt: daysAgo(28), description: 'Implement token bucket rate limiting' },
    { project: projects[2]._id, title: 'Analytics Dashboard', dueDate: daysAgo(3), status: 'in-progress', description: 'Real-time API analytics dashboard' },  // OVERDUE
    { project: projects[2]._id, title: 'v2.0 Release', dueDate: daysFromNow(15), status: 'pending', description: 'Major version release with breaking changes' },
    // Nova milestones
    { project: projects[3]._id, title: 'Widget Framework', dueDate: daysFromNow(10), status: 'in-progress', description: 'Extensible widget system for custom dashboards' },
    { project: projects[3]._id, title: 'Public Beta', dueDate: daysFromNow(45), status: 'pending', description: 'Open beta for early adopters' },
  ]);
  console.log(`  Created ${milestones.length} milestones`);

  // =================== SPRINTS ===================
  const sprints = await Sprint.insertMany([
    // Phoenix Platform sprints
    { project: projects[0]._id, name: 'Sprint 1 - Foundation', startDate: daysAgo(42), endDate: daysAgo(28), goal: 'Set up project infrastructure and core models', status: 'completed' },
    { project: projects[0]._id, name: 'Sprint 2 - Core APIs', startDate: daysAgo(28), endDate: daysAgo(14), goal: 'Implement authentication and CRUD APIs', status: 'completed' },
    { project: projects[0]._id, name: 'Sprint 3 - Integration', startDate: daysAgo(14), endDate: daysFromNow(0), goal: 'Third-party integrations and testing', status: 'active' },
    { project: projects[0]._id, name: 'Sprint 4 - Polish', startDate: daysFromNow(1), endDate: daysFromNow(15), goal: 'Bug fixes and performance optimization', status: 'planned' },
    // Atlas sprints
    { project: projects[1]._id, name: 'Sprint 1 - Setup', startDate: daysAgo(28), endDate: daysAgo(14), goal: 'React Native project setup and navigation', status: 'completed' },
    { project: projects[1]._id, name: 'Sprint 2 - Core Screens', startDate: daysAgo(14), endDate: daysFromNow(0), goal: 'Build main screens and data layer', status: 'active' },
    { project: projects[1]._id, name: 'Sprint 3 - Features', startDate: daysFromNow(1), endDate: daysFromNow(15), goal: 'Advanced features and offline sync', status: 'planned' },
    // Mercury sprints
    { project: projects[2]._id, name: 'Sprint 5 - Final', startDate: daysAgo(14), endDate: daysFromNow(0), goal: 'Final features and documentation', status: 'active' },
    // Nova sprints
    { project: projects[3]._id, name: 'Sprint 1 - Bootstrap', startDate: daysAgo(14), endDate: daysFromNow(0), goal: 'Dashboard framework and auth', status: 'active' },
    { project: projects[3]._id, name: 'Sprint 2 - Widgets', startDate: daysFromNow(1), endDate: daysFromNow(15), goal: 'Core widget implementations', status: 'planned' },
  ]);
  console.log(`  Created ${sprints.length} sprints`);

  // =================== TASKS ===================
  const statuses = ['backlog', 'todo', 'in-progress', 'in-review', 'done'];
  const priorities = ['low', 'medium', 'high', 'critical'];

  const tasksData = [];
  const phoenixLabels = getProjectLabels(0);

  // Phoenix Platform tasks (30 tasks)
  const phoenixTasks = [
    { title: 'Set up MongoDB schemas and indexes', status: 'done', priority: 'high', storyPoints: 5, sprint: sprints[0]._id, assignee: users[3]._id },
    { title: 'Implement JWT authentication flow', status: 'done', priority: 'critical', storyPoints: 8, sprint: sprints[0]._id, assignee: users[3]._id },
    { title: 'Create user registration endpoint', status: 'done', priority: 'high', storyPoints: 3, sprint: sprints[0]._id, assignee: users[5]._id },
    { title: 'Build organization CRUD API', status: 'done', priority: 'high', storyPoints: 5, sprint: sprints[1]._id, assignee: users[3]._id },
    { title: 'Implement RBAC middleware', status: 'done', priority: 'critical', storyPoints: 8, sprint: sprints[1]._id, assignee: users[3]._id },
    { title: 'Create project management endpoints', status: 'done', priority: 'high', storyPoints: 5, sprint: sprints[1]._id, assignee: users[5]._id },
    { title: 'Build task CRUD with filtering', status: 'done', priority: 'high', storyPoints: 5, sprint: sprints[1]._id, assignee: users[3]._id },
    { title: 'Implement sprint management API', status: 'done', priority: 'medium', storyPoints: 5, sprint: sprints[1]._id, assignee: users[5]._id },
    { title: 'Integrate Stripe payment gateway', status: 'in-progress', priority: 'high', storyPoints: 13, sprint: sprints[2]._id, assignee: users[3]._id },
    { title: 'Set up SendGrid email service', status: 'in-progress', priority: 'medium', storyPoints: 5, sprint: sprints[2]._id, assignee: users[5]._id },
    { title: 'Build notification websocket layer', status: 'todo', priority: 'medium', storyPoints: 8, sprint: sprints[2]._id, assignee: users[3]._id },
    { title: 'Create file upload service (S3)', status: 'in-review', priority: 'medium', storyPoints: 5, sprint: sprints[2]._id, assignee: users[5]._id },
    { title: 'Implement search with Elasticsearch', status: 'todo', priority: 'low', storyPoints: 8, sprint: sprints[2]._id, assignee: users[3]._id },
    { title: 'Add Redis caching layer', status: 'backlog', priority: 'medium', storyPoints: 5, sprint: sprints[3]._id, assignee: users[3]._id },
    { title: 'Write comprehensive API documentation', status: 'backlog', priority: 'medium', storyPoints: 5, sprint: sprints[3]._id, assignee: users[5]._id },
    { title: 'Set up CI/CD pipeline with GitHub Actions', status: 'backlog', priority: 'high', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Implement rate limiting per tenant', status: 'backlog', priority: 'high', storyPoints: 3, sprint: null, assignee: null },
    { title: 'Add OpenAPI/Swagger documentation', status: 'backlog', priority: 'low', storyPoints: 3, sprint: null, assignee: null },
    { title: 'Create database migration scripts', status: 'backlog', priority: 'medium', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Implement audit log export feature', status: 'backlog', priority: 'low', storyPoints: 3, sprint: null, assignee: null },
    { title: 'Build admin dashboard analytics', status: 'todo', priority: 'medium', storyPoints: 8, sprint: sprints[2]._id, assignee: users[5]._id, isBlocked: true, blockReason: 'Waiting for analytics service API key from vendor' },
    { title: 'Set up monitoring with Prometheus', status: 'backlog', priority: 'medium', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Implement data export (CSV/PDF)', status: 'backlog', priority: 'low', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Add two-factor authentication', status: 'backlog', priority: 'high', storyPoints: 8, sprint: null, assignee: null },
    { title: 'Create onboarding wizard for new orgs', status: 'todo', priority: 'medium', storyPoints: 8, sprint: sprints[2]._id, assignee: users[5]._id },
  ];

  for (const t of phoenixTasks) {
    tasksData.push({
      project: projects[0]._id,
      createdBy: users[1]._id,
      labels: [phoenixLabels[Math.floor(Math.random() * phoenixLabels.length)]._id],
      ...t,
    });
  }

  // Atlas Mobile App tasks (20 tasks)
  const atlasLabels = getProjectLabels(1);
  const atlasTasks = [
    { title: 'Initialize React Native project', status: 'done', priority: 'high', storyPoints: 3, sprint: sprints[4]._id, assignee: users[4]._id },
    { title: 'Set up navigation structure', status: 'done', priority: 'high', storyPoints: 5, sprint: sprints[4]._id, assignee: users[4]._id },
    { title: 'Design and implement login screen', status: 'done', priority: 'high', storyPoints: 5, sprint: sprints[4]._id, assignee: users[4]._id },
    { title: 'Build work order list screen', status: 'in-progress', priority: 'high', storyPoints: 8, sprint: sprints[5]._id, assignee: users[4]._id },
    { title: 'Create work order detail view', status: 'in-progress', priority: 'high', storyPoints: 8, sprint: sprints[5]._id, assignee: users[4]._id },
    { title: 'Implement photo capture for reports', status: 'todo', priority: 'medium', storyPoints: 5, sprint: sprints[5]._id, assignee: users[4]._id },
    { title: 'Build offline data sync engine', status: 'todo', priority: 'critical', storyPoints: 13, sprint: sprints[6]._id, assignee: users[4]._id },
    { title: 'Add push notification support', status: 'backlog', priority: 'medium', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Implement GPS location tracking', status: 'backlog', priority: 'medium', storyPoints: 8, sprint: null, assignee: null },
    { title: 'Create time tracking feature', status: 'backlog', priority: 'low', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Build customer signature capture', status: 'backlog', priority: 'medium', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Design and build settings screen', status: 'todo', priority: 'low', storyPoints: 3, sprint: sprints[5]._id, assignee: users[4]._id },
    { title: 'Implement dark mode support', status: 'backlog', priority: 'low', storyPoints: 3, sprint: null, assignee: null },
    { title: 'Add biometric authentication', status: 'backlog', priority: 'medium', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Create inventory scanning feature', status: 'todo', priority: 'high', storyPoints: 8, sprint: sprints[5]._id, assignee: users[4]._id, isBlocked: true, blockReason: 'Barcode scanner SDK license pending approval' },
  ];

  for (const t of atlasTasks) {
    tasksData.push({
      project: projects[1]._id,
      createdBy: users[1]._id,
      labels: [atlasLabels[Math.floor(Math.random() * atlasLabels.length)]._id],
      ...t,
    });
  }

  // Mercury API tasks (15 tasks)
  const mercuryLabels = getProjectLabels(2);
  const mercuryTasks = [
    { title: 'Implement token bucket algorithm', status: 'done', priority: 'critical', storyPoints: 8, sprint: sprints[7]._id, assignee: users[5]._id },
    { title: 'Build request proxying engine', status: 'done', priority: 'high', storyPoints: 8, sprint: sprints[7]._id, assignee: users[3]._id },
    { title: 'Create API analytics collector', status: 'in-progress', priority: 'high', storyPoints: 8, sprint: sprints[7]._id, assignee: users[5]._id },
    { title: 'Build real-time metrics dashboard', status: 'in-review', priority: 'medium', storyPoints: 8, sprint: sprints[7]._id, assignee: users[3]._id },
    { title: 'Implement circuit breaker pattern', status: 'todo', priority: 'high', storyPoints: 5, sprint: sprints[7]._id, assignee: users[5]._id },
    { title: 'Add WebSocket gateway support', status: 'backlog', priority: 'medium', storyPoints: 8, sprint: null, assignee: null },
    { title: 'Create load testing suite', status: 'backlog', priority: 'high', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Implement API versioning strategy', status: 'done', priority: 'medium', storyPoints: 3, sprint: sprints[7]._id, assignee: users[3]._id },
    { title: 'Build developer portal', status: 'backlog', priority: 'low', storyPoints: 13, sprint: null, assignee: null },
    { title: 'Add GraphQL gateway support', status: 'backlog', priority: 'low', storyPoints: 13, sprint: null, assignee: null },
  ];

  for (const t of mercuryTasks) {
    tasksData.push({
      project: projects[2]._id,
      createdBy: users[0]._id,
      labels: [mercuryLabels[Math.floor(Math.random() * mercuryLabels.length)]._id],
      ...t,
    });
  }

  // Nova Dashboard tasks (15 tasks)
  const novaLabels = getProjectLabels(3);
  const novaTasks = [
    { title: 'Set up Next.js project with TypeScript', status: 'done', priority: 'high', storyPoints: 3, sprint: sprints[8]._id, assignee: users[9]._id },
    { title: 'Implement authentication with NextAuth', status: 'done', priority: 'high', storyPoints: 5, sprint: sprints[8]._id, assignee: users[9]._id },
    { title: 'Build dashboard layout system', status: 'in-progress', priority: 'high', storyPoints: 8, sprint: sprints[8]._id, assignee: users[9]._id },
    { title: 'Create chart widget component', status: 'in-progress', priority: 'high', storyPoints: 8, sprint: sprints[8]._id, assignee: users[3]._id },
    { title: 'Implement drag-and-drop widget placement', status: 'todo', priority: 'medium', storyPoints: 8, sprint: sprints[8]._id, assignee: users[9]._id },
    { title: 'Build data source connector', status: 'todo', priority: 'high', storyPoints: 13, sprint: sprints[9]._id, assignee: users[3]._id },
    { title: 'Create KPI metric widget', status: 'backlog', priority: 'medium', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Add real-time data streaming', status: 'backlog', priority: 'medium', storyPoints: 8, sprint: null, assignee: null },
    { title: 'Implement dashboard sharing/export', status: 'backlog', priority: 'low', storyPoints: 5, sprint: null, assignee: null },
    { title: 'Build custom theme editor', status: 'backlog', priority: 'low', storyPoints: 5, sprint: null, assignee: null },
  ];

  for (const t of novaTasks) {
    tasksData.push({
      project: projects[3]._id,
      createdBy: users[8]._id,
      labels: [novaLabels[Math.floor(Math.random() * novaLabels.length)]._id],
      ...t,
    });
  }

  const tasks = await Task.insertMany(tasksData);
  console.log(`  Created ${tasks.length} tasks`);

  // Add some dependencies
  const phoenixTaskObjs = tasks.filter(t => t.project.toString() === projects[0]._id.toString());
  if (phoenixTaskObjs.length >= 10) {
    await Task.findByIdAndUpdate(phoenixTaskObjs[8]._id, { dependsOn: [phoenixTaskObjs[4]._id] });
    await Task.findByIdAndUpdate(phoenixTaskObjs[11]._id, { dependsOn: [phoenixTaskObjs[9]._id] });
  }

  // =================== ISSUES ===================
  const issuesData = [
    // Phoenix Platform issues
    { project: projects[0]._id, title: 'Memory leak in websocket connections', severity: 'critical', status: 'investigating', description: 'Server memory usage increases steadily when many websocket connections are open', stepsToReproduce: '1. Open 50+ websocket connections\n2. Send messages for 10 minutes\n3. Monitor memory with process.memoryUsage()', assignee: users[3]._id, reportedBy: users[2]._id, statusHistory: [{ status: 'open', changedBy: users[2]._id, changedAt: daysAgo(5) }, { status: 'investigating', changedBy: users[3]._id, changedAt: daysAgo(4) }] },
    { project: projects[0]._id, title: 'CORS headers missing on error responses', severity: 'high', status: 'resolved', description: 'Error responses from the API do not include CORS headers', stepsToReproduce: '1. Make a request that triggers a 400 error\n2. Check response headers\n3. No Access-Control-Allow-Origin header present', assignee: users[5]._id, reportedBy: users[4]._id, resolution: 'Added CORS middleware before error handler', statusHistory: [{ status: 'open', changedBy: users[4]._id, changedAt: daysAgo(10) }, { status: 'in-progress', changedBy: users[5]._id, changedAt: daysAgo(9) }, { status: 'resolved', changedBy: users[5]._id, changedAt: daysAgo(7) }] },
    { project: projects[0]._id, title: 'Rate limiter not resetting correctly', severity: 'medium', status: 'open', description: 'Rate limit counter does not reset after the window expires for some users', stepsToReproduce: '1. Exceed rate limit\n2. Wait for window to expire\n3. Try again — still rate limited', assignee: null, reportedBy: users[3]._id, statusHistory: [{ status: 'open', changedBy: users[3]._id, changedAt: daysAgo(2) }] },
    { project: projects[0]._id, title: 'Password reset email contains wrong link', severity: 'high', status: 'in-progress', description: 'The password reset link in emails points to the wrong domain', stepsToReproduce: '1. Request password reset\n2. Check email\n3. Link goes to localhost instead of production URL', assignee: users[5]._id, reportedBy: users[1]._id, statusHistory: [{ status: 'open', changedBy: users[1]._id, changedAt: daysAgo(3) }, { status: 'in-progress', changedBy: users[5]._id, changedAt: daysAgo(2) }] },
    { project: projects[0]._id, title: 'Dashboard charts flicker on data refresh', severity: 'low', status: 'open', description: 'Charts briefly disappear and reappear when data is refreshed', assignee: null, reportedBy: users[6]._id, statusHistory: [{ status: 'open', changedBy: users[6]._id, changedAt: daysAgo(1) }] },
    // Atlas issues
    { project: projects[1]._id, title: 'App crashes on iOS 16 when taking photos', severity: 'critical', status: 'in-progress', description: 'Camera functionality crashes the app on older iOS versions', stepsToReproduce: '1. Open work order\n2. Tap "Add Photo"\n3. App crashes immediately', assignee: users[4]._id, reportedBy: users[1]._id, statusHistory: [{ status: 'open', changedBy: users[1]._id, changedAt: daysAgo(4) }, { status: 'in-progress', changedBy: users[4]._id, changedAt: daysAgo(3) }] },
    { project: projects[1]._id, title: 'Offline data not syncing after reconnection', severity: 'high', status: 'open', description: 'Data entered while offline is not automatically synced when connection is restored', assignee: users[4]._id, reportedBy: users[2]._id, statusHistory: [{ status: 'open', changedBy: users[2]._id, changedAt: daysAgo(2) }] },
    { project: projects[1]._id, title: 'Login screen keyboard covers input fields', severity: 'medium', status: 'resolved', description: 'On smaller devices, the keyboard hides the password field and login button', assignee: users[4]._id, reportedBy: users[1]._id, resolution: 'Added KeyboardAvoidingView wrapper', statusHistory: [{ status: 'open', changedBy: users[1]._id, changedAt: daysAgo(12) }, { status: 'resolved', changedBy: users[4]._id, changedAt: daysAgo(10) }] },
    // Mercury issues
    { project: projects[2]._id, title: 'Gateway returns 502 under high load', severity: 'critical', status: 'investigating', description: 'Under load testing with 10k req/s, gateway starts returning 502 errors', stepsToReproduce: '1. Run load test with k6\n2. Ramp to 10,000 req/s\n3. After ~2 minutes, 502 errors appear', assignee: users[3]._id, reportedBy: users[5]._id, statusHistory: [{ status: 'open', changedBy: users[5]._id, changedAt: daysAgo(3) }, { status: 'investigating', changedBy: users[3]._id, changedAt: daysAgo(2) }] },
    { project: projects[2]._id, title: 'API key rotation causes brief downtime', severity: 'high', status: 'open', description: 'When rotating API keys, there is a brief window where old keys are rejected before new ones are active', assignee: null, reportedBy: users[0]._id, statusHistory: [{ status: 'open', changedBy: users[0]._id, changedAt: daysAgo(1) }] },
    // Nova issues
    { project: projects[3]._id, title: 'Widget resize handles not visible on dark backgrounds', severity: 'medium', status: 'open', description: 'Drag handles for resizing widgets blend into dark-themed dashboards', assignee: users[9]._id, reportedBy: users[8]._id, statusHistory: [{ status: 'open', changedBy: users[8]._id, changedAt: daysAgo(2) }] },
    { project: projects[3]._id, title: 'Chart data labels overlap at small sizes', severity: 'low', status: 'open', description: 'When widgets are resized to minimum, chart labels overlap and become unreadable', assignee: null, reportedBy: users[3]._id, statusHistory: [{ status: 'open', changedBy: users[3]._id, changedAt: daysAgo(1) }] },
  ];

  const issues = await Issue.insertMany(issuesData);
  console.log(`  Created ${issues.length} issues`);

  // =================== COMMENTS ===================
  const commentsData = [
    { parentType: 'Task', parentId: tasks[8]._id, author: users[3]._id, body: 'Started integrating the Stripe SDK. The webhook setup is more complex than expected. @elena.rodriguez can you review the payment flow diagram?', mentions: [users[2]._id] },
    { parentType: 'Task', parentId: tasks[8]._id, author: users[2]._id, body: 'Sure, I\'ll review it today. Make sure we handle idempotency keys for retry scenarios.', mentions: [] },
    { parentType: 'Task', parentId: tasks[8]._id, author: users[1]._id, body: '@david.kim How\'s the progress on this? We need this for the beta milestone.', mentions: [users[3]._id] },
    { parentType: 'Task', parentId: tasks[10]._id, author: users[3]._id, body: 'Should we use Socket.io or native WebSockets? @james.obrien thoughts from the backend perspective?', mentions: [users[5]._id] },
    { parentType: 'Task', parentId: tasks[10]._id, author: users[5]._id, body: 'I\'d recommend Socket.io for the fallback mechanisms. Native WS is faster but Socket.io handles edge cases better.', mentions: [] },
    { parentType: 'Task', parentId: tasks[11]._id, author: users[5]._id, body: 'File upload service is ready for review. I used pre-signed URLs for direct browser-to-S3 uploads. @elena.rodriguez', mentions: [users[2]._id] },
    { parentType: 'Task', parentId: tasks[20]._id, author: users[5]._id, body: 'Still waiting on the API key. I\'ve escalated with the vendor. @marcus.williams can you follow up from the PM side?', mentions: [users[1]._id] },
    { parentType: 'Issue', parentId: issues[0]._id, author: users[3]._id, body: 'I think the leak is in the event listener cleanup. When connections close, we\'re not removing all listeners. Working on a fix.', mentions: [] },
    { parentType: 'Issue', parentId: issues[0]._id, author: users[2]._id, body: 'Good catch. Let\'s also add memory monitoring alerts. @priya.patel can you check if this affects the frontend connection pool?', mentions: [users[4]._id] },
    { parentType: 'Issue', parentId: issues[5]._id, author: users[4]._id, body: 'This is related to the deprecated camera API on iOS 16. I need to migrate to the new PHPicker API. @marcus.williams ETA is 2 days.', mentions: [users[1]._id] },
    { parentType: 'Task', parentId: tasks[3]._id, author: users[3]._id, body: 'Organization CRUD is complete. All endpoints tested with Postman. Moving on to RBAC middleware next.', mentions: [] },
    { parentType: 'Task', parentId: tasks[4]._id, author: users[3]._id, body: 'RBAC middleware now supports both org-level and project-level role checks. @sarah.chen please review the permission matrix.', mentions: [users[0]._id] },
    // Nova comments
    { parentType: 'Task', parentId: tasks[tasks.length - 8]._id, author: users[9]._id, body: 'Dashboard layout system is taking shape. Using CSS Grid with named areas. @robert.chang any thoughts on mobile layout?', mentions: [users[9]._id] },
    { parentType: 'Issue', parentId: issues[10]._id, author: users[9]._id, body: 'I can fix this by adding a semi-transparent backdrop to the handles. Should be a quick CSS change.', mentions: [] },
  ];

  const comments = await Comment.insertMany(commentsData);
  console.log(`  Created ${comments.length} comments`);

  // =================== ACTIVITY LOGS ===================
  const activityData = [];
  const actions = ['created', 'updated', 'status_changed', 'comment_added', 'assigned', 'member_added'];
  const entityTypes = ['Task', 'Issue', 'Sprint', 'Milestone', 'Project'];

  // Generate realistic activity logs
  for (let i = 0; i < 120; i++) {
    const projIdx = Math.floor(Math.random() * projects.length);
    const project = projects[projIdx];
    const org = projIdx < 3 ? orgs[0] : orgs[1];
    const actorPool = projIdx < 3
      ? [users[0], users[1], users[2], users[3], users[4], users[5]]
      : [users[7], users[8], users[9], users[3]];
    const actor = actorPool[Math.floor(Math.random() * actorPool.length)];

    activityData.push({
      organization: org._id,
      project: project._id,
      actor: actor._id,
      action: actions[Math.floor(Math.random() * actions.length)],
      entityType: entityTypes[Math.floor(Math.random() * entityTypes.length)],
      entityId: tasks[Math.floor(Math.random() * tasks.length)]._id,
      metadata: { generated: true },
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
    });
  }

  await ActivityLog.insertMany(activityData);
  console.log(`  Created ${activityData.length} activity log entries`);

  // =================== NOTIFICATIONS ===================
  const notificationsData = [
    { user: users[3]._id, type: 'assignment', title: 'New Task Assignment', message: 'You\'ve been assigned to "Integrate Stripe payment gateway"', read: false, link: `/tasks/${tasks[8]._id}` },
    { user: users[5]._id, type: 'assignment', title: 'New Task Assignment', message: 'You\'ve been assigned to "Set up SendGrid email service"', read: true, link: `/tasks/${tasks[9]._id}` },
    { user: users[2]._id, type: 'mention', title: 'You were mentioned', message: 'David Kim mentioned you in a comment on "Integrate Stripe payment gateway"', read: false, link: `/tasks/${tasks[8]._id}` },
    { user: users[1]._id, type: 'mention', title: 'You were mentioned', message: 'James O\'Brien mentioned you in a comment', read: false, link: `/tasks/${tasks[20]._id}` },
    { user: users[4]._id, type: 'mention', title: 'You were mentioned', message: 'Elena Rodriguez mentioned you in a comment on a critical issue', read: false, link: `/issues/${issues[0]._id}` },
    { user: users[0]._id, type: 'mention', title: 'You were mentioned', message: 'David Kim mentioned you in a comment about RBAC middleware', read: true, link: `/tasks/${tasks[4]._id}` },
    { user: users[3]._id, type: 'status_change', title: 'Task Status Updated', message: '"Create file upload service" moved to In Review', read: false, link: `/tasks/${tasks[11]._id}` },
    { user: users[4]._id, type: 'assignment', title: 'Issue Assigned', message: 'Issue "App crashes on iOS 16 when taking photos" assigned to you', read: true, link: `/issues/${issues[5]._id}` },
    { user: users[1]._id, type: 'status_change', title: 'Milestone Completed', message: '"Core API v1.0" milestone has been marked as completed', read: true },
    { user: users[9]._id, type: 'comment', title: 'New Comment', message: 'Lisa Fernandez commented on "Build dashboard layout system"', read: false },
  ];

  await Notification.insertMany(notificationsData);
  console.log(`  Created ${notificationsData.length} notifications`);

  console.log('\n✅ Seed completed successfully!\n');
  console.log('Demo accounts (all passwords: Password123!):');
  console.log('─'.repeat(60));
  console.log('  OrgAdmin:        sarah.chen@acmecorp.com');
  console.log('  ProjectManager:  marcus.williams@acmecorp.com');
  console.log('  TeamLead:        elena.rodriguez@acmecorp.com');
  console.log('  Developer:       david.kim@acmecorp.com');
  console.log('  Developer:       priya.patel@acmecorp.com');
  console.log('  Developer:       james.obrien@acmecorp.com');
  console.log('  Stakeholder:     aisha.johnson@acmecorp.com');
  console.log('  OrgAdmin (SL):   tom.nakamura@stellarlabs.com');
  console.log('  PM (SL):         lisa.fernandez@stellarlabs.com');
  console.log('  Dev (SL):        robert.chang@stellarlabs.com');
  console.log('─'.repeat(60));

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
