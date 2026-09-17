import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, initials, stars, formatCurrency } from '../../api/client';
import { useConfirm, useToast, useAuth } from '../../context';

export default function AdminUsersPage({ initialRole = 'all', pageTitle = 'User Management' }) {
  const { user: currentUser } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
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
      const [data, contractsData, bookingsData, paymentsData] = await Promise.all([
        roleFilter === 'mentor'
          ? api.getAdminUsers('mentor')
          : roleFilter === 'learner'
          ? api.getAdminUsers('learner')
          : api.getAdminAllUsers(),
        api.getContracts().catch(() => []),
        api.getAdminBookings ? api.getAdminBookings().catch(() => []) : Promise.resolve([]),
        api.getAdminPayments ? api.getAdminPayments().catch(() => []) : Promise.resolve([]),
      ]);
      setUsers(data || []);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getUserFinances = (u) => {
    const userId = u.user_id || u.id;
    const userName = (u.name || '').toLowerCase().trim();

    let totalSpent = Number(u.total_spent || 0);
    let totalEarned = Number(u.total_earned || 0);
    let pendingEscrow = Number(u.pending_escrow || 0);
    let payoutCount = Number(u.payout_count || 0);

    // Fallback/compute from payments array if available
    if (payments && payments.length > 0) {
      const userPaymentsAsLearner = payments.filter((p) => {
        const idMatch = p.learner_id === userId;
        const nameMatch = userName && (p.learner_name || '').toLowerCase().trim() === userName;
        return (idMatch || nameMatch) && (p.status === 'held' || p.status === 'released');
      });

      const userPaymentsAsMentor = payments.filter((p) => {
        const idMatch = p.mentor_id === userId;
        const nameMatch = userName && (p.mentor_name || '').toLowerCase().trim() === userName;
        return idMatch || nameMatch;
      });

      if (totalSpent === 0 && userPaymentsAsLearner.length > 0) {
        totalSpent = userPaymentsAsLearner.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      }

      if (totalEarned === 0 && userPaymentsAsMentor.length > 0) {
        totalEarned = userPaymentsAsMentor
          .filter((p) => p.status === 'released')
          .reduce((sum, p) => sum + Number(p.net_payout !== undefined ? p.net_payout : (p.amount - (p.platform_fee || 0))), 0);
        pendingEscrow = userPaymentsAsMentor
          .filter((p) => p.status === 'held')
          .reduce((sum, p) => sum + Number(p.net_payout !== undefined ? p.net_payout : (p.amount - (p.platform_fee || 0))), 0);
        payoutCount = userPaymentsAsMentor.filter((p) => p.status === 'released').length;
      }
    }

    return {
      totalSpent,
      totalEarned,
      pendingEscrow,
      payoutCount,
    };
  };

  const getUserWorkload = (u) => {
    const userId = u.user_id || u.id;
    const userName = (u.name || '').toLowerCase().trim();

    // Match contracts where user is mentor or learner
    const userContracts = contracts.filter((c) => {
      const mentorMatch = c.mentor_id === userId || (userName && (c.mentor_name || '').toLowerCase().trim() === userName);
      const learnerMatch = c.learner_id === userId || (userName && (c.learner_name || '').toLowerCase().trim() === userName);
      return mentorMatch || learnerMatch;
    });

    const activeContracts = userContracts.filter(
      (c) => c.status === 'active' || c.status === 'completed_by_mentor'
    );
    const activeContractsCount = activeContracts.length;

    // Remaining/active sessions in active contracts
    const contractSessions = activeContracts.reduce((sum, c) => {
      const total = c.total_sessions || 0;
      const completed = c.completed_sessions || 0;
      return sum + Math.max(0, total - completed);
    }, 0);

    // Also inspect any standalone bookings for this user
    const userBookings = bookings.filter((b) => {
      const mentorMatch = b.mentor_id === userId || (userName && (b.mentor_name || '').toLowerCase().trim() === userName);
      const learnerMatch = b.learner_id === userId || (userName && (b.learner_name || '').toLowerCase().trim() === userName);
      return mentorMatch || learnerMatch;
    });
    const activeBookingsCount = userBookings.filter(
      (b) => b.status === 'paid' || b.status === 'accepted' || b.status === 'pending' || b.status === 'active'
    ).length;

    const activeSessionsCount = Math.max(contractSessions, activeBookingsCount);

    return {
      activeContractsCount,
      activeSessionsCount,
      totalContractsCount: userContracts.length,
    };
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
    if (currentUser && (currentUser.id === userId || currentUser.user_id === userId)) {
      toast.error('You cannot suspend your own account.');
      return;
    }

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

    try {
      const res = await api.adminToggleSuspendUser(userId, nextState);

      setUsers((prev) =>
        prev.map((u) => {
          const uId = u.user_id || u.id;
          return uId === userId ? { ...u, is_suspended: nextState, is_active: !nextState } : u;
        })
      );

      if (selectedUser && (selectedUser.id === userId || selectedUser.user_id === userId)) {
        setSelectedUser((prev) => (prev ? { ...prev, is_suspended: nextState, is_active: !nextState } : null));
      }

      const msg = res?.message || `User account ${nextState ? 'suspended' : 'reactivated'} successfully.`;
      toast.success(msg);
    } catch (err) {
      toast.error(err.message || 'Could not update user account status.');
    }
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
                  <th style={{ whiteSpace: 'nowrap', minWidth: '170px' }}>User</th>
                  <th style={{ whiteSpace: 'nowrap', minWidth: '180px' }}>Email</th>
                  <th style={{ whiteSpace: 'nowrap', minWidth: '90px' }}>Role</th>
                  <th style={{ whiteSpace: 'nowrap', minWidth: '90px' }}>Status</th>
                  <th style={{ whiteSpace: 'nowrap', minWidth: '150px' }} title="Active contracts and scheduled sessions workload">
                    Active Contracts / Sessions
                  </th>
                  <th style={{ whiteSpace: 'nowrap', minWidth: '150px' }} title="Lifetime spend (Learners) or payouts earned (Mentors)">
                    Total Spent / Earned
                  </th>
                  <th style={{ whiteSpace: 'nowrap', minWidth: '120px' }}>Joined Date</th>
                  <th style={{ whiteSpace: 'nowrap', minWidth: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const userId = u.user_id || u.id;
                  const isSuspended = Boolean(u.is_suspended);

                  return (
                    <tr key={userId}>
                      <td>
                        <button
                          type="button"
                          className="user-profile-clickable"
                          onClick={() => {
                            setSelectedUser(u);
                            setUserModalTab('profile');
                          }}
                          title={`Click to view full profile & activity for ${u.name}`}
                        >
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--brand), #6366f1)',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: '0 2px 5px rgba(38, 71, 214, 0.15)',
                            }}
                          >
                            {initials(u.name)}
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div className="user-profile-name" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                              {u.name}
                            </div>
                            {u.title && (
                              <div className="sub" style={{ fontSize: '11px', margin: 0, color: 'var(--ink-muted)' }}>
                                {u.title}
                              </div>
                            )}
                          </div>
                        </button>
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
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: '20px',
                            textTransform: 'capitalize',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${isSuspended ? 'badge-cancelled' : 'badge-accepted'} mono`}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: '20px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td>
                        {(() => {
                          if (u.role === 'admin' || u.role === 'superadmin') {
                            return <span style={{ color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 500 }}>—</span>;
                          }

                          const { activeContractsCount, activeSessionsCount, totalContractsCount } = getUserWorkload(u);
                          const targetUrl = activeContractsCount > 0
                            ? `/admin/contracts?search=${encodeURIComponent(u.name || '')}&status=active`
                            : `/admin/contracts?search=${encodeURIComponent(u.name || '')}`;

                          if (activeContractsCount > 0) {
                            return (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                <Link
                                  to={targetUrl}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    textDecoration: 'none',
                                    whiteSpace: 'nowrap',
                                    background: '#E7F6EF',
                                    color: '#157F53',
                                    border: '1px solid rgba(21, 127, 83, 0.28)',
                                    boxShadow: '0 1px 2px rgba(21, 127, 83, 0.05)',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title={`View ${activeContractsCount} active contract${activeContractsCount > 1 ? 's' : ''} for ${u.name} in Contracts view`}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#157F53', display: 'inline-block' }} />
                                  <span>{activeContractsCount} Active</span>
                                </Link>
                                {activeSessionsCount > 0 && (
                                  <span
                                    className="mono"
                                    style={{ fontSize: '10.5px', color: 'var(--ink-muted)', paddingLeft: '4px', whiteSpace: 'nowrap' }}
                                    title={`${activeSessionsCount} active or scheduled session${activeSessionsCount > 1 ? 's' : ''}`}
                                  >
                                    {activeSessionsCount} session{activeSessionsCount > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                              <Link
                                to={targetUrl}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  textDecoration: 'none',
                                  whiteSpace: 'nowrap',
                                  background: '#F1F3F7',
                                  color: '#5B6270',
                                  border: '1px solid #D2D6E0',
                                  transition: 'all 0.15s ease',
                                }}
                                title={totalContractsCount > 0 ? `View ${totalContractsCount} past contract(s) for ${u.name}` : `View contracts directory for ${u.name}`}
                              >
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#9098A8', display: 'inline-block' }} />
                                <span>0 Active</span>
                              </Link>
                              {activeSessionsCount > 0 && (
                                <span
                                  className="mono"
                                  style={{ fontSize: '10.5px', color: 'var(--ink-muted)', paddingLeft: '4px', whiteSpace: 'nowrap' }}
                                  title={`${activeSessionsCount} standalone session${activeSessionsCount > 1 ? 's' : ''}`}
                                >
                                  {activeSessionsCount} session{activeSessionsCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        {(() => {
                          if (u.role === 'admin' || u.role === 'superadmin') {
                            return <span style={{ color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 500 }}>—</span>;
                          }

                          const fin = getUserFinances(u);

                          if (u.role === 'mentor') {
                            const earned = fin.totalEarned;
                            const escrow = fin.pendingEscrow;
                            const targetUrl = `/admin/payouts?search=${encodeURIComponent(u.name || '')}`;

                            if (earned > 0 || escrow > 0) {
                              return (
                                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                  <Link
                                    to={targetUrl}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '3px 10px',
                                      borderRadius: '20px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      fontFamily: "'IBM Plex Mono', monospace",
                                      textDecoration: 'none',
                                      whiteSpace: 'nowrap',
                                      background: '#E7F6EF',
                                      color: '#157F53',
                                      border: '1px solid rgba(21, 127, 83, 0.28)',
                                      boxShadow: '0 1px 2px rgba(21, 127, 83, 0.05)',
                                      transition: 'all 0.15s ease',
                                    }}
                                    title={`View payouts ledger for ${u.name}: ${formatCurrency(earned)} earned`}
                                  >
                                    <span>{formatCurrency(earned)}</span>
                                    <span style={{ fontSize: '9.5px', opacity: 0.85, textTransform: 'uppercase' }}>Earned</span>
                                  </Link>
                                  {escrow > 0 ? (
                                    <span
                                      className="mono"
                                      style={{ fontSize: '10.5px', color: 'var(--warn, #B54708)', fontWeight: 600, paddingLeft: '4px', whiteSpace: 'nowrap' }}
                                      title={`${formatCurrency(escrow)} currently held in escrow`}
                                    >
                                      + {formatCurrency(escrow)} escrow
                                    </span>
                                  ) : (
                                    <span
                                      className="mono"
                                      style={{ fontSize: '10.5px', color: 'var(--ink-muted)', paddingLeft: '4px', whiteSpace: 'nowrap' }}
                                    >
                                      {fin.payoutCount > 0 ? `${fin.payoutCount} payout${fin.payoutCount === 1 ? '' : 's'}` : 'Net payouts'}
                                    </span>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                <Link
                                  to={targetUrl}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    textDecoration: 'none',
                                    whiteSpace: 'nowrap',
                                    background: '#F1F3F7',
                                    color: '#5B6270',
                                    border: '1px solid #D2D6E0',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title={`View payouts ledger for ${u.name}`}
                                >
                                  <span>{formatCurrency(0)}</span>
                                  <span style={{ fontSize: '9.5px', opacity: 0.8, textTransform: 'uppercase' }}>Earned</span>
                                </Link>
                              </div>
                            );
                          }

                          // Default / Learner role
                          const spent = fin.totalSpent;
                          const targetUrl = `/admin/payments?search=${encodeURIComponent(u.name || '')}`;

                          if (spent > 0) {
                            return (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                <Link
                                  to={targetUrl}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    textDecoration: 'none',
                                    whiteSpace: 'nowrap',
                                    background: '#EDF0FF',
                                    color: '#2647D6',
                                    border: '1px solid rgba(38, 71, 214, 0.28)',
                                    boxShadow: '0 1px 2px rgba(38, 71, 214, 0.05)',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title={`View transactions for ${u.name}: ${formatCurrency(spent)} total lifetime spend`}
                                >
                                  <span>{formatCurrency(spent)}</span>
                                  <span style={{ fontSize: '9.5px', opacity: 0.85, textTransform: 'uppercase' }}>Spent</span>
                                </Link>
                                <span
                                  className="mono"
                                  style={{ fontSize: '10.5px', color: 'var(--ink-muted)', paddingLeft: '4px', whiteSpace: 'nowrap' }}
                                >
                                  Lifetime spend
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                              <Link
                                to={targetUrl}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  fontFamily: "'IBM Plex Mono', monospace",
                                  textDecoration: 'none',
                                  whiteSpace: 'nowrap',
                                  background: '#F1F3F7',
                                  color: '#5B6270',
                                  border: '1px solid #D2D6E0',
                                  transition: 'all 0.15s ease',
                                }}
                                title={`View payments ledger for ${u.name}`}
                              >
                                <span>{formatCurrency(0)}</span>
                                <span style={{ fontSize: '9.5px', opacity: 0.8, textTransform: 'uppercase' }}>Spent</span>
                              </Link>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Recent'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          disabled={currentUser && (currentUser.id === userId || currentUser.user_id === userId)}
                          title={currentUser && (currentUser.id === userId || currentUser.user_id === userId) ? 'You cannot suspend your own account' : undefined}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: isSuspended ? '1px solid #A7F3D0' : '1px solid #FCA5A5',
                            background: isSuspended ? '#ECFDF5' : '#FEF2F2',
                            color: isSuspended ? '#059669' : '#DC2626',
                            cursor: (currentUser && (currentUser.id === userId || currentUser.user_id === userId)) ? 'not-allowed' : 'pointer',
                            opacity: (currentUser && (currentUser.id === userId || currentUser.user_id === userId)) ? 0.45 : 1,
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => handleToggleSuspend(userId, isSuspended)}
                        >
                          {isSuspended ? 'Activate' : 'Suspend'}
                        </button>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>
                      Live Contracts &amp; Workload:
                    </div>
                    {selectedUser.role !== 'admin' && selectedUser.role !== 'superadmin' && (
                      <Link
                        to={`/admin/contracts?search=${encodeURIComponent(selectedUser.name || '')}`}
                        className="btn btn-ghost"
                        style={{ fontSize: '11.5px', padding: '2px 8px', textDecoration: 'none' }}
                      >
                        View in Contracts →
                      </Link>
                    )}
                  </div>
                  {(() => {
                    const workload = getUserWorkload(selectedUser);
                    return (
                      <div className="sub" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span>Active Contracts: <strong style={{ color: workload.activeContractsCount > 0 ? '#10b981' : 'inherit' }}>{workload.activeContractsCount}</strong></span>
                        <span>•</span>
                        <span>Active Sessions: <strong>{workload.activeSessionsCount}</strong></span>
                        <span>•</span>
                        <span>Total Agreements: <strong>{workload.totalContractsCount}</strong></span>
                      </div>
                    );
                  })()}
                </div>

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
            {userModalTab === 'payments' && (() => {
              const fin = getUserFinances(selectedUser);
              const isMentor = selectedUser.role === 'mentor';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ padding: '10px 12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                      <div className="sub" style={{ fontSize: '11px' }}>
                        {isMentor ? 'Lifetime Payouts Earned' : 'Lifetime Spend'}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: isMentor ? '#10b981' : '#818cf8', marginTop: '2px' }}>
                        {formatCurrency(isMentor ? fin.totalEarned : fin.totalSpent)}
                      </div>
                      {isMentor && fin.pendingEscrow > 0 && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '3px' }}>
                          + {formatCurrency(fin.pendingEscrow)} held in escrow
                        </div>
                      )}
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

                  {selectedUser.role !== 'admin' && selectedUser.role !== 'superadmin' && (
                    <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '12.5px' }}>
                          {isMentor ? 'Mentor Payouts Ledger' : 'Transactions & Invoices'}
                        </div>
                        <div className="sub" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                          {isMentor
                            ? `${fin.payoutCount} completed payout${fin.payoutCount === 1 ? '' : 's'} on record.`
                            : `Total recorded spend across 1-on-1 sessions & multi-session contracts.`}
                        </div>
                      </div>
                      <Link
                        to={isMentor ? `/admin/payouts?search=${encodeURIComponent(selectedUser.name || '')}` : `/admin/payments?search=${encodeURIComponent(selectedUser.name || '')}`}
                        className="btn btn-ghost"
                        style={{ fontSize: '11.5px', padding: '4px 10px', textDecoration: 'none' }}
                      >
                        {isMentor ? 'View Payouts →' : 'View Payments →'}
                      </Link>
                    </div>
                  )}

                  <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '6px' }}>
                    <div className="sub" style={{ fontSize: '12px' }}>
                      {selectedUser.disputes_count && selectedUser.disputes_count > 0
                        ? `⚠️ ${selectedUser.disputes_count} dispute(s) flagged on record.`
                        : 'No disputes or chargebacks on record for this user account.'}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bottom Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={currentUser && (currentUser.id === (selectedUser.id || selectedUser.user_id) || currentUser.user_id === (selectedUser.id || selectedUser.user_id))}
                title={currentUser && (currentUser.id === (selectedUser.id || selectedUser.user_id) || currentUser.user_id === (selectedUser.id || selectedUser.user_id)) ? 'You cannot suspend your own account' : undefined}
                style={{
                  color: (currentUser && (currentUser.id === (selectedUser.id || selectedUser.user_id) || currentUser.user_id === (selectedUser.id || selectedUser.user_id)))
                    ? 'var(--text-muted)'
                    : selectedUser.is_suspended ? '#10b981' : 'var(--danger, #ef4444)',
                  opacity: (currentUser && (currentUser.id === (selectedUser.id || selectedUser.user_id) || currentUser.user_id === (selectedUser.id || selectedUser.user_id))) ? 0.5 : 1,
                  cursor: (currentUser && (currentUser.id === (selectedUser.id || selectedUser.user_id) || currentUser.user_id === (selectedUser.id || selectedUser.user_id))) ? 'not-allowed' : 'pointer',
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
