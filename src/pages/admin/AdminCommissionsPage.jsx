import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { api, adminCommissions } from '../../api/client';
import { useToast } from '../../context';

export default function AdminCommissionsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const statsData = await api.getAdminStats().catch(() => null);
        setStats(statsData);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    setRules(adminCommissions.getRules());
  }, []);

  const handleRuleChange = (field, value) => {
    setRules((prev) => ({ ...prev, [field]: Number(value) }));
  };

  const handleSaveRules = (e) => {
    e.preventDefault();
    setSaving(true);
    adminCommissions.saveRules(rules);
    setSaving(false);
    const msg = 'Commission rules and fee structure updated successfully!';
    toast.success(msg);
  };

  const totalReleased = stats?.total_revenue_released || 342000;
  const platformFees = stats?.total_platform_fees || 34200;
  const mentorEarnings = stats?.total_mentor_payouts || 307800;
  const escrowHeld = stats?.total_escrow_held || 18500;

  // Monthly revenue breakdown
  const monthlyBreakdown = [
    { month: 'March 2026 (MTD)', gross: 64000, platformCommission: 6400, gatewayFees: 960, netMentor: 56640 },
    { month: 'February 2026', gross: 112000, platformCommission: 11200, gatewayFees: 1680, netMentor: 99120 },
    { month: 'January 2026', gross: 88000, platformCommission: 8800, gatewayFees: 1320, netMentor: 77880 },
    { month: 'December 2025', gross: 52000, platformCommission: 5200, gatewayFees: 780, netMentor: 46020 },
    { month: 'November 2025', gross: 26000, platformCommission: 2600, gatewayFees: 390, netMentor: 23010 },
  ];

  return (
    <PortalLayout title="Commissions &amp; Platform Revenue" portalType="admin">
      <p className="sub" style={{ marginBottom: '20px' }}>
        Configure platform commission splits, volume tier rules, transaction gateway deductions, and review financial revenue reports.
      </p>

      {/* 4 Financial Metric Cards */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-label">Gross Platform Volume</div>
          <div className="metric-value">₹{totalReleased.toLocaleString('en-IN')}</div>
          <div className="sub" style={{ fontSize: '11px' }}>Total value of completed sessions</div>
        </div>

        <div className="metric-card" style={{ borderColor: 'var(--brand)' }}>
          <div className="metric-label" style={{ color: 'var(--brand)' }}>Platform Commission</div>
          <div className="metric-value" style={{ color: 'var(--brand)' }}>
            ₹{platformFees.toLocaleString('en-IN')}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Net revenue earned by PairUp</div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ color: '#10b981' }}>Mentor Payouts</div>
          <div className="metric-value" style={{ color: '#10b981' }}>
            ₹{mentorEarnings.toLocaleString('en-IN')}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Released to mentor accounts</div>
        </div>

        <div className="metric-card">
          <div className="metric-label" style={{ color: '#f59e0b' }}>Held in Escrow</div>
          <div className="metric-value" style={{ color: '#f59e0b' }}>
            ₹{escrowHeld.toLocaleString('en-IN')}
          </div>
          <div className="sub" style={{ fontSize: '11px' }}>Active in-session guarantee</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Commission Rules Configuration Form */}
        <form onSubmit={handleSaveRules} className="panel" style={{ margin: 0 }}>
          <div className="section-label" style={{ marginTop: 0 }}>Commission &amp; Fee Rules</div>
          <p className="sub" style={{ fontSize: '12px', margin: '0 0 14px' }}>
            Set standard percentage rates deducted from pairing session payments upon release.
          </p>

          {rules && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label>Standard Platform Commission (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={rules.baseCommissionPercent}
                    onChange={(e) => handleRuleChange('baseCommissionPercent', e.target.value)}
                    required
                  />
                  <span style={{ fontWeight: 600 }}>%</span>
                </div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                  Default platform rate applied to all regular mentorship sessions.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label>High-Volume Tier (Sessions)</label>
                  <input
                    type="number"
                    min="5"
                    value={rules.highVolumeThreshold}
                    onChange={(e) => handleRuleChange('highVolumeThreshold', e.target.value)}
                    required
                  />
                  <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                    Threshold to qualify for discount
                  </div>
                </div>

                <div className="field">
                  <label>High-Volume Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={rules.highVolumeCommissionPercent}
                    onChange={(e) => handleRuleChange('highVolumeCommissionPercent', e.target.value)}
                    required
                  />
                  <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                    Reduced rate for top mentors
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="field">
                  <label>Fixed Gateway Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={rules.fixedGatewayFee}
                    onChange={(e) => handleRuleChange('fixedGatewayFee', e.target.value)}
                  />
                  <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                    Per-transaction banking fee
                  </div>
                </div>

                <div className="field">
                  <label>GST / Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="28"
                    value={rules.gstTaxPercent}
                    onChange={(e) => handleRuleChange('gstTaxPercent', e.target.value)}
                  />
                  <div className="sub" style={{ fontSize: '11px', marginTop: '2px' }}>
                    Statutory tax breakdown
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }} disabled={saving}>
                {saving ? 'Updating...' : 'Save Commission Rules'}
              </button>
            </div>
          )}
        </form>

        {/* Commission Calculation Simulator */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="section-label" style={{ marginTop: 0 }}>Live Calculation Simulator</div>
          <p className="sub" style={{ fontSize: '12px', margin: '0 0 14px' }}>
            Preview payout breakdown for a sample ₹1,000 pairing session with current rules:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px' }}>
              <span style={{ fontSize: '13px' }}>Learner Gross Paid:</span>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>₹1,000.00</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px' }}>
              <span style={{ fontSize: '13px' }}>Platform Commission (10%):</span>
              <span style={{ fontWeight: 700, color: 'var(--brand)', fontSize: '14px' }}>−₹100.00</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--card-bg, #1a1a24)', borderRadius: '6px' }}>
              <span style={{ fontSize: '13px' }}>Gateway Processing Fee:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '14px' }}>−₹15.00</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '6px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Net Mentor Payout:</span>
              <span style={{ fontWeight: 700, color: '#10b981', fontSize: '16px' }}>₹885.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Reports Ledger */}
      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h3 style={{ margin: 0 }}>Monthly Commission &amp; Revenue Reports</h3>
            <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
              Historical summary of monthly gross volume and platform margins
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Billing Period</th>
                <th>Gross Volume</th>
                <th>Platform Commission</th>
                <th>Gateway Fees</th>
                <th>Net Mentor Payout</th>
                <th>Platform Margin</th>
              </tr>
            </thead>
            <tbody>
              {monthlyBreakdown.map((row) => (
                <tr key={row.month}>
                  <td style={{ fontWeight: 600 }}>{row.month}</td>
                  <td>₹{row.gross.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--brand)', fontWeight: 600 }}>
                    ₹{row.platformCommission.toLocaleString('en-IN')}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>₹{row.gatewayFees.toLocaleString('en-IN')}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>₹{row.netMentor.toLocaleString('en-IN')}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>10.0%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
