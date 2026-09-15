import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { api, initials } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm, useToast } from '../../context';

export default function SuperadminPage() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await api.getSuperadminAdmins();
      setAdmins(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchSuperadminUsers(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePromote = async (userId) => {
    const confirmed = await confirm({
      title: 'Grant Administrator Access',
      message: 'Are you sure you want to promote this user to Administrator? They will gain platform-wide management access.',
      confirmText: 'Grant Admin Access',
      type: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.promoteAdmin(userId);
      setSearchQuery('');
      setSearchResults([]);
      toast.success('Administrator permissions granted successfully.');
      loadAdmins();
    } catch (err) {
      toast.error('Failed to promote user: ' + err.message);
    }
  };

  const handleRevoke = async (userId) => {
    const confirmed = await confirm({
      title: 'Revoke Administrator Access',
      message: 'Are you sure you want to revoke administrator permissions for this user? They will return to the learner role and lose admin access immediately.',
      confirmText: 'Revoke Access',
      type: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.revokeAdmin(userId);
      toast.success('Administrator permissions revoked.');
      loadAdmins();
    } catch (err) {
      toast.error('Failed to revoke admin: ' + err.message);
    }
  };

  return (
    <PortalLayout title="Super Admin Console" portalType="admin">
      <p className="sub" style={{ maxWidth: '640px', marginBottom: '20px' }}>
        Manage platform root permissions, promote trusted staff members to Administrator, and revoke admin rights.
      </p>

      {error && <div className="error-box" style={{ maxWidth: '640px' }}>{error}</div>}

      {/* Grant Admin Access */}
      <div className="panel" style={{ maxWidth: '640px', margin: '0 0 24px 0' }}>
        <div className="section-label" style={{ marginTop: 0 }}>Grant Admin Access</div>
        <div className="field">
          <label>Search user by name or email</label>
          <input
            type="text"
            placeholder="Type email or name to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {searching && <p className="sub" style={{ fontSize: '12px' }}>Searching users...</p>}

        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {searchResults.map((u) => (
              <div
                key={u.id}
                className="mini-card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.name}</div>
                  <div className="sub" style={{ fontSize: '11.5px' }}>{u.email} ({u.role})</div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => handlePromote(u.id)}
                >
                  Promote to Admin
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Admins List */}
      <div className="admin-panel" style={{ maxWidth: '640px' }}>
        <div className="admin-panel-head">
          <h3>Platform Administrators ({admins.length})</h3>
        </div>

        {loading ? (
          <p className="sub">Loading administrators...</p>
        ) : admins.length === 0 ? (
          <p className="sub">No admin accounts found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {admins.map((a) => (
              <div
                key={a.id}
                className="mini-card"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}
              >
                <div className="avatar-sm">{initials(a.name)}</div>
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                    {a.name} {a.id === user?.id && <span className="sub" style={{ fontSize: '11px' }}>(you)</span>}
                  </div>
                  <div className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                    {a.email}
                  </div>
                </div>

                <span className={`role-badge role-${a.role}`}>
                  {a.role}
                </span>

                {a.role === 'admin' && a.id !== user?.id && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: '#DC2626', borderColor: '#DC2626', padding: '4px 8px', fontSize: '11.5px' }}
                    onClick={() => handleRevoke(a.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
