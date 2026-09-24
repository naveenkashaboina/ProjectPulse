import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';

const SEVERITY_COLORS = {
  critical: 'var(--accent-red)',
  high: 'var(--accent-amber)',
  medium: 'var(--accent-cyan)',
  low: 'var(--accent-green)',
};

export default function ReportsView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, repRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/reports/summary`),
      ]);
      setProject(projRes.data.data);
      setSummary(repRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg"></div></div>;

  const totalTasks = summary?.tasks?.total || 0;
  const completedTasks = summary?.tasks?.completed || 0;
  const completionRate = summary?.tasks?.completionPercentage || (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
  const totalPoints = summary?.tasks?.totalPoints || 0;
  const overdueTasks = summary?.tasks?.overdue || 0;

  const totalIssues = summary?.issues?.total || 0;
  const burndown = summary?.burndown;
  const milestones = summary?.milestones;

  return (
    <div className="animate-slide-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Reports & Analytics</h1>
          <p className="page-subtitle">{project?.name} · Health, delivery velocity, and risk analysis</p>
        </div>
        <div className="page-actions">
          <Link to={`/projects/${projectId}/board`} className="btn btn-outline btn-sm">
            ← Project Board
          </Link>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card">
          <span className="stat-card-label">Total Tasks</span>
          <span className="stat-card-value" style={{ color: 'var(--primary-hover)' }}>{totalTasks}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: overdueTasks > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
            {overdueTasks > 0 ? `⚠️ ${overdueTasks} overdue` : 'All tasks on schedule'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Completion Velocity</span>
          <span className="stat-card-value" style={{ color: 'var(--accent-green)' }}>{completionRate}%</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {completedTasks} of {totalTasks} finished
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Story Points</span>
          <span className="stat-card-value" style={{ color: 'var(--accent-cyan)' }}>{totalPoints}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Committed scope
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Defects / Issues</span>
          <span className="stat-card-value" style={{ color: totalIssues > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
            {totalIssues}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Logged defects
          </span>
        </div>
      </div>

      {/* Sprint Burndown & Milestone Health */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
        {/* Active Sprint Burndown & Velocity */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Active Sprint Burndown</h3>
            {burndown?.sprintName && <span className="badge badge-purple">{burndown.sprintName}</span>}
          </div>
          {burndown && burndown.sprintName ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)', textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--primary-hover)' }}>{burndown.totalPoints}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Points</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--accent-green)' }}>{burndown.completedPoints}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Points Done</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--accent-amber)' }}>
                    {Math.max(0, burndown.totalPoints - burndown.completedPoints)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Remaining</div>
                </div>
              </div>

              {/* Points Progress */}
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>Sprint Burn Progress</span>
                  <span>{burndown.totalPoints > 0 ? Math.round((burndown.completedPoints / burndown.totalPoints) * 100) : 0}%</span>
                </div>
                <div style={{ height: 10, background: 'var(--bg-secondary)', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${burndown.totalPoints > 0 ? Math.min(100, Math.round((burndown.completedPoints / burndown.totalPoints) * 100)) : 0}%`,
                      background: 'linear-gradient(90deg, var(--primary), var(--accent-green))',
                    }}
                  />
                </div>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {burndown.completedTasks} of {burndown.totalTasks} tasks finished in current sprint.
              </p>
            </div>
          ) : (
            <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No active sprint currently running.
              <div style={{ marginTop: 8 }}>
                <Link to={`/projects/${projectId}/backlog`} className="btn btn-primary btn-sm">
                  Go to Sprint Planning
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Milestone Delivery Health */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Milestones & Deadlines</h3>
            <Link to={`/projects/${projectId}/timeline`} className="btn btn-ghost btn-sm">View Timeline →</Link>
          </div>
          {milestones ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)', textAlign: 'center', marginBottom: 'var(--space-md)' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--primary-hover)' }}>{milestones.total}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Milestones</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--accent-green)' }}>{milestones.completed}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Achieved</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: milestones.overdue > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                    {milestones.overdue}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Overdue Risk</div>
                </div>
              </div>

              {milestones.overdue > 0 ? (
                <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--accent-red)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                    ⚠️ {milestones.overdue} target release milestone(s) have passed their due date without completion.
                  </span>
                </div>
              ) : (
                <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 500, fontSize: 'var(--text-xs)' }}>
                    ✓ All milestones are tracked and on schedule.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>No milestone data available.</p>
          )}
        </div>
      </div>

      {/* Task Distributions & Issue Severities */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
        {/* Status Distribution */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
            Tasks by Workflow Stage
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {(summary?.tasks?.byStatus || []).map((st) => {
              const pct = totalTasks > 0 ? Math.round((st.count / totalTasks) * 100) : 0;
              return (
                <div key={st._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{st._id}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{st.count} tasks ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
            Tasks by Priority Level
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {(summary?.tasks?.byPriority || []).map((pr) => {
              const pct = totalTasks > 0 ? Math.round((pr.count / totalTasks) * 100) : 0;
              const color =
                pr._id === 'critical' ? 'var(--accent-red)' :
                pr._id === 'high' ? 'var(--accent-amber)' :
                pr._id === 'medium' ? 'var(--accent-cyan)' : 'var(--text-muted)';
              return (
                <div key={pr._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{pr._id}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{pr.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Issues by Severity */}
        <div className="card">
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
            Issues by Severity Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {(summary?.issues?.bySeverity || []).map((sev) => {
              const pct = totalIssues > 0 ? Math.round((sev.count / totalIssues) * 100) : 0;
              const color = SEVERITY_COLORS[sev._id] || 'var(--primary)';
              return (
                <div key={sev._id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{sev._id}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{sev.count} defects ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
            {(!summary?.issues?.bySeverity || summary.issues.bySeverity.length === 0) && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textAlign: 'center', padding: 'var(--space-md)' }}>
                No defects or issues reported for this project.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
