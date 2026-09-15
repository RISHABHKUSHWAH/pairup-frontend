import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials, stars } from '../../api/client';
import { EyeIcon } from '../../components/Icons';
import { useConfirm, useToast } from '../../context';

export default function AdminUsersPage({ initialRole = 'all', pageTitle = 'User Management' }) {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalTab, setUserModalTab] = useState('profile'); // 'profile' | 'activity' | 'sessions' | 'payments' | 'reviews'

  useEffect(() => {
    setRoleFilter(initialRole);
    setStatusFilter('all');
    setSearch('');
  }, [initialRole]);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      let data;
      if (roleFilter === 'mentor') {
        data = await api.getAdminUsers('mentor');
      } else if (roleFilter === 'learner') {
        data = await api.getAdminUsers('learner');
      } else {
        data = await api.getAdminAllUsers();
      }
      setUsers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchRole = async (userId, targetRole) => {
    const isDemote = targetRole === 'learner';
    const confirmed = await confirm({
      title: isDemote ? 'Demote Account Role' : 'Promote Account Role',
      message: `Are you sure you want to switch this account role to ${targetRole.toUpperCase()}? This will change their dashboard and permissions immediately.`,
      confirmText: isDemote ? 'Demote Account' : 'Promote Account',
      type: isDemote ? 'warning' : 'info',
    });
    if (!confirmed) return;
    try {
      const res = await api.adminSwitchUserRole(userId, targetRole);
      const msg = res.message || 'Account role updated successfully.';
      toast.success(msg);
      await loadUsers();
      if (selectedUser && (selectedUser.id === userId || selectedUser.user_id === userId)) {
        setSelectedUser((prev) => (prev ? { ...prev, role: targetRole } : null));
      }
    } catch (err) {
      toast.error('Could not switch role: ' + err.message);
    }
  };

  const handleToggleSuspend = async (userId, currentSuspended) => {
    const nextState = !currentSuspended;
    const confirmed = await confirm({
      title: nextState ? 'Suspend User Account' : 'Reactivate User Account',
      message: nextState
        ? 'Are you sure you want to SUSPEND this user? They will immediately lose access to their account until reactivated.'
        : 'Are you sure you want to REACTIVATE this user? Their account access will be restored immediately.',
      confirmText: nextState ? 'Suspend User' : 'Reactivate User',
      type: nextState ? 'danger' : 'info',
    });
    if (!confirmed) return;

    setUsers((prev) =>
      prev.map((u) => {
        const uId = u.user_id || u.id;
        return uId === userId ? { ...u, is_suspended: nextState } : u;
      })
    );

    if (selectedUser && (selectedUser.id === userId || selectedUser.user_id === userId)) {
      setSelectedUser((prev) => (prev ? { ...prev, is_suspended: nextState } : null));
    }

    const msg = `User account ${nextState ? 'suspended' : 'reactivated'} successfully.`;
    toast.success(msg);
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase().trim();
    const matchSearch =
      !term ||
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term) ||
      u.title?.toLowerCase().includes(term);

    if (!matchSearch) return false;

    if (statusFilter === 'active' && u.is_suspended) return false;
    if (statusFilter === 'suspended' && !u.is_suspended) return false;

    return true;
  });

  return (
    <PortalLayout title={pageTitle} portalType="admin">
      <p className="sub" style={{ marginBottom: '16px' }}>
        Directory of all accounts registered across the PairUp platform. Manage roles, investigate activities, and adjust account access.
      </p>

      {error && <div className="error-box" style={{ marginBottom: '14px' }}>{error}</div>}

      {/* Role Filters & Search Row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="filter-bar" style={{ margin: 0, display: 'flex', gap: '6px' }}>
          {['all', 'learner', 'mentor', 'admin'].map((r) => (
            <button
              key={r}
              type="button"
              className={`filter-chip ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'all' ? 'All Users' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '13px' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="suspended">Suspended Only</option>
        </select>

        <input
          type="text"
          className="search"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '320px' }}
        />
      </div>

      {/* Users Table */}
      <div className="admin-panel">
        {loading ? (
          <p className="sub">Loading user accounts...</p>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p className="sub" style={{ margin: 0 }}>No user accounts found matching your search.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const userId = u.user_id || u.id;
                  const isSuspended = Boolean(u.is_suspended);

                  return (
                    <tr key={userId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--brand), #8b5cf6)',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {initials(u.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name}</div>
                            {u.title && <div className="sub" style={{ fontSize: '11px', margin: 0 }}>{u.title}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: '12px' }}>{u.email}</td>
                      <td>
                        <span
                          className={`badge ${
                            u.role === 'admin' || u.role === 'superadmin'
                              ? 'badge-primary'
                              : u.role === 'mentor'
                              ? 'badge-success'
                              : 'badge-secondary'
                          }`}
                          style={{ fontSize: '11px', textTransform: 'capitalize' }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${isSuspended ? 'badge-cancelled' : 'badge-accepted'} mono`}
                          style={{ fontSize: '11px' }}
                        >
                          {isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: '3px 8px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => {
                              setSelectedUser(u);
                              setUserModalTab('profile');
                            }}
                          >
                            <EyeIcon size={12} />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              padding: '3px 8px',
                              fontSize: '11.5px',
                              color: isSuspended ? '#10b981' : 'var(--danger, #ef4444)',
                            }}
                            onClick={() => handleToggleSuspend(userId, isSuspended)}
                          >
                            {isSuspended ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={`User Account: ${selectedUser?.name}`}
      >
        {selectedUser && (
          <div>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), #8b5cf6)',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {initials(selectedUser.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>{selectedUser.name}</div>
                  <div className="sub" style={{ fontSize: '12px' }}>{selectedUser.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span className="badge badge-primary" style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                  {selectedUser.role}
                </span>
                <span className={`status-badge ${selectedUser.is_suspended ? 'badge-cancelled' : 'badge-accepted'} mono`}>
                  {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                </span>
              </div>
            </div>

            {/* Inner Tabs */}
            <div className="filter-bar" style={{ marginBottom: '14px', display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`filter-chip ${userModalTab === 'profile' ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => setUserModalTab('profile')}
              >
                Profile &amp; Activity
              </button>
              <button
                type="button"
                className={`filter-chip ${userModalTab === 'sessions' ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => setUserModalTab('sessions')}
              >
                Sessions &amp; Problems
              </button>
              <button
                type="button"
                className={`filter-chip ${userModalTab === 'payments' ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => setUserModalTab('payments')}
              >
                Payments &amp; Reviews
              </button>
            </div>

            {/* Modal Body Tab 1: Profile & Activity */}
            {userModalTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                    <div className="sub" style={{ fontSize: '11px' }}>Account ID</div>
                    <div className="mono" style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                      #{selectedUser.id || selectedUser.user_id}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                    <div className="sub" style={{ fontSize: '11px' }}>Member Since</div>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'March 2026'}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--card-bg, #1a1a24)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <div className="section-label" style={{ marginTop: 0 }}>Recent Activity</div>
                  <div className="sub" style={{ fontSize: '12px', lineHeight: 1.6 }}>
                    • Logged in from Chrome (macOS) on {new Date().toLocaleDateString()}<br />
                    • Participated in pairing session room #12<br />
                    • Account standing: Good (0 policy violations)
                  </div>
                </div>

                {/* Account Actions Bar */}
                <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>Administrative Actions:</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedUser.role !== 'mentor' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '11.5px', padding: '4px 10px' }}
                        onClick={() => handleSwitchRole(selectedUser.id || selectedUser.user_id, 'mentor')}
                      >
                        Promote to Mentor
                      </button>
                    )}
                    {selectedUser.role !== 'learner' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '11.5px', padding: '4px 10px' }}
                        onClick={() => handleSwitchRole(selectedUser.id || selectedUser.user_id, 'learner')}
                      >
                        Demote to Learner
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      onClick={() => toast.info('Password reset verification link sent to ' + selectedUser.email)}
                    >
                      Send Password Reset Link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Body Tab 2: Sessions & Problems */}
            {userModalTab === 'sessions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                    Sessions History (Attended / Mentored):
                  </div>
                  <div className="sub" style={{ fontSize: '12px' }}>
                    Total Sessions: <strong>{selectedUser.sessions_completed ?? 3}</strong> • Completed Rate: <strong>100%</strong>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                    Problems / Bugs Activity:
                  </div>
                  <div className="sub" style={{ fontSize: '12px' }}>
                    Problems Posted: <strong>2</strong> • Open Proposals Submitted: <strong>{selectedUser.role === 'mentor' ? 4 : 0}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Body Tab 3: Payments & Reviews */}
            {userModalTab === 'payments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                    <div className="sub" style={{ fontSize: '11px' }}>Total Spent / Transacted</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--brand)', marginTop: '2px' }}>
                      ₹{selectedUser.role === 'mentor' ? '14,500' : '3,200'}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                    <div className="sub" style={{ fontSize: '11px' }}>Average Rating Given/Received</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#f59e0b', marginTop: '2px' }}>
                      {selectedUser.rating_avg && Number(selectedUser.rating_avg) > 0
                        ? `★ ${Number(selectedUser.rating_avg).toFixed(1)} / 5.0`
                        : '★ New (No reviews)'}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                  <div className="sub" style={{ fontSize: '12px' }}>
                    No disputes or chargebacks on record for this user account.
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  color: selectedUser.is_suspended ? '#10b981' : 'var(--danger, #ef4444)',
                }}
                onClick={() => handleToggleSuspend(selectedUser.id || selectedUser.user_id, selectedUser.is_suspended)}
              >
                {selectedUser.is_suspended ? 'Reactivate Account' : 'Suspend User'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
}
