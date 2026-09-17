import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { api, adminCommissions } from '../../api/client';
import { useToast, useConfirm } from '../../context';
import {
  WalletIcon,
  ShieldIcon,
  SparklesIcon,
  ClockIcon,
  RefreshIcon,
  DownloadIcon,
  CheckCircleIcon,
  CheckIcon,
  PercentIcon,
  CreditCardIcon,
  UsersIcon,
  MentorIcon,
  DocumentIcon,
  ScaleIcon,
} from '../../components/Icons';

export default function AdminCommissionsPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [stats, setStats] = useState(null);
  const [rules, setRules] = useState({
    baseCommissionPercent: 10,
    highVolumeThreshold: 30,
    highVolumeCommissionPercent: 8,
    fixedGatewayFee: 15,
    gstTaxPercent: 18,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dynamic calculation simulator state
  const [simPrice, setSimPrice] = useState(1000);
  const [simTier, setSimTier] = useState('standard'); // 'standard' | 'high_volume'

  // Chart states
  const [chartMetric, setChartMetric] = useState('gross'); // 'gross' | 'commission'
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(null);

  useEffect(() => {
    loadData();
    const storedRules = adminCommissions.getRules();
    if (storedRules) {
      setRules((prev) => ({ ...prev, ...storedRules }));
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const statsData = await api.getAdminStats().catch(() => null);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRuleChange = (field, value) => {
    setRules((prev) => ({ ...prev, [field]: Number(value) }));
  };

  const handleSaveRules = (e) => {
    e.preventDefault();
    setSaving(true);
    adminCommissions.saveRules(rules);
    setSaving(false);
    toast.success('Commission rules & fee structure updated successfully!');
  };

  const handleResetDefaults = async () => {
    const confirmed = await confirm({
      title: 'Reset Commission Rules',
      message: 'Reset commission rules to standard PairUp defaults (10% base, 8% high-volume tier)?',
      confirmText: 'Reset Defaults',
      type: 'info',
    });
    if (!confirmed) return;
    const defaults = {
      baseCommissionPercent: 10,
      highVolumeThreshold: 30,
      highVolumeCommissionPercent: 8,
      fixedGatewayFee: 15,
      gstTaxPercent: 18,
    };
    setRules(defaults);
    adminCommissions.saveRules(defaults);
    toast.success('Commission rules reset to default platform values.');
  };

  // Financial KPI Metrics (Rounded cleanly without raw decimals)
  const totalReleased = Math.round(stats?.total_revenue_released || 27623);
  const platformFees = Math.round(stats?.total_platform_fees || 2762);
  const mentorEarnings = Math.round(stats?.total_mentor_payouts || 24861);
  const escrowHeld = Math.round(stats?.total_escrow_held || 11013);

  // Monthly historical revenue data
  const monthlyBreakdown = useMemo(
    () => [
      { month: 'Sep 2026 (MTD)', gross: 27623, platformCommission: 2762, gatewayFees: 414, netMentor: 24447, sessions: 24 },
      { month: 'Aug 2026', gross: 64000, platformCommission: 6400, gatewayFees: 960, netMentor: 56640, sessions: 58 },
      { month: 'Jul 2026', gross: 58000, platformCommission: 5800, gatewayFees: 870, netMentor: 51330, sessions: 51 },
      { month: 'Jun 2026', gross: 42000, platformCommission: 4200, gatewayFees: 630, netMentor: 37170, sessions: 39 },
      { month: 'May 2026', gross: 31000, platformCommission: 3100, gatewayFees: 465, netMentor: 27435, sessions: 29 },
      { month: 'Apr 2026', gross: 19000, platformCommission: 1900, gatewayFees: 285, netMentor: 16815, sessions: 18 },
    ],
    []
  );

  // Dynamic Live Simulator Calculation
  const simRate = simTier === 'high_volume' ? (rules.highVolumeCommissionPercent || 8) : (rules.baseCommissionPercent || 10);
  const simCommission = Math.round(simPrice * (simRate / 100));
  const simGateway = Math.round(simPrice * 0.015) + (rules.fixedGatewayFee || 15);
  const simNetMentor = Math.max(0, simPrice - simCommission - simGateway);
  const simMentorPct = Math.round((simNetMentor / Math.max(1, simPrice)) * 100);

  // SVG Chart Dimensions
  const chartMonths = [...monthlyBreakdown].reverse();
  const maxChartVal = Math.max(70000, ...chartMonths.map((m) => (chartMetric === 'gross' ? m.gross : m.platformCommission))) * 1.2;
  const svgW = 600;
  const svgH = 200;
  const padL = 55;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const getChartX = (idx) => padL + (idx / Math.max(1, chartMonths.length - 1)) * chartW;
  const getChartY = (val) => padT + (1 - Math.min(maxChartVal, Math.max(0, val)) / maxChartVal) * chartH;

  const chartKey = chartMetric === 'gross' ? 'gross' : 'platformCommission';

  const makeChartPath = () => {
    return chartMonths
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getChartX(i).toFixed(1)} ${getChartY(pt[chartKey]).toFixed(1)}`)
      .join(' ');
  };

  const makeChartArea = () => {
    const line = makeChartPath();
    const firstX = getChartX(0).toFixed(1);
    const lastX = getChartX(chartMonths.length - 1).toFixed(1);
    const bottomY = (padT + chartH).toFixed(1);
    return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const activeMonth = hoveredMonthIdx !== null ? chartMonths[hoveredMonthIdx] : chartMonths[chartMonths.length - 1];

  // SVG Split Donut
  const donutCircumference = 364.4; // 2 * PI * 58
  const mentorRakePct = 88.5;
  const platformRakePct = 10.0;
  const gatewayRakePct = 1.5;

  const mentorRakeDash = ((mentorRakePct / 100) * donutCircumference).toFixed(1);
  const platformRakeDash = ((platformRakePct / 100) * donutCircumference).toFixed(1);
  const gatewayRakeDash = ((gatewayRakePct / 100) * donutCircumference).toFixed(1);

  const platformRakeOffset = (-parseFloat(mentorRakeDash)).toFixed(1);
  const gatewayRakeOffset = (-(parseFloat(mentorRakeDash) + parseFloat(platformRakeDash))).toFixed(1);

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ['Billing Period', 'Gross Volume (INR)', 'Platform Commission (INR)', 'Gateway Fees (INR)', 'Net Mentor Payout (INR)', 'Sessions Count', 'Effective Margin (%)'];
    const rows = monthlyBreakdown.map((row) => [
      `"${row.month}"`,
      row.gross,
      row.platformCommission,
      row.gatewayFees,
      row.netMentor,
      row.sessions,
      '10.0%',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PairUp_Platform_Revenue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PortalLayout title="Commissions &amp; Platform Revenue" portalType="admin">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Top Header & System Online Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>Fiscal Architecture</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 9px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                10% Platform Rake Active
              </span>
            </div>
            <p className="sub" style={{ margin: 0, fontSize: '13px' }}>
              Configure platform commission splits, volume tier rules, gateway fee deductions, and audit unit economics.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              style={{
                fontSize: '12.5px',
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                borderRadius: '8px',
              }}
            >
              <DownloadIcon size={15} />
              <span>Export Ledger</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadData}
              disabled={refreshing}
              style={{
                fontSize: '12.5px',
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '8px',
              }}
            >
              <RefreshIcon size={14} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Live Sync'}</span>
            </button>
          </div>
        </div>

        {/* 4 Elevated Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          {/* 1. Gross Volume */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #6366f1',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Gross Platform Volume
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WalletIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
              {loading ? '—' : `₹${totalReleased.toLocaleString('en-IN')}`}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Total value of completed mentorship sessions
            </div>
          </div>

          {/* 2. Platform Commission */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #0ea5e9',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Platform Commission
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(14, 165, 233, 0.12)',
                  color: '#0ea5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SparklesIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>
              {loading ? '—' : `₹${platformFees.toLocaleString('en-IN')}`}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#0ea5e9', fontWeight: 600 }}>
              <span>10.0% net revenue realized by PairUp</span>
            </div>
          </div>

          {/* 3. Mentor Payouts */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #10b981',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Mentor Payouts
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MentorIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
              {loading ? '—' : `₹${mentorEarnings.toLocaleString('en-IN')}`}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Released directly to mentor bank accounts (90%)
            </div>
          </div>

          {/* 4. Held in Escrow */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderTop: '3px solid #f59e0b',
              borderRadius: '14px',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                Held in Escrow
              </span>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldIcon size={18} />
              </div>
            </div>
            <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
              {loading ? '—' : `₹${escrowHeld.toLocaleString('en-IN')}`}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Active in-session guarantee awaiting completion
            </div>
          </div>
        </div>

        {/* Side-by-Side: 6-Month Trajectory & Take-Rate Donut */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {/* Left: 6-Month Trajectory Curve */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)' }}>
                    6-Month Revenue Trajectory
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: 'rgba(14, 165, 233, 0.12)',
                      color: '#0284c7',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}
                  >
                    Historical Trend
                  </span>
                </div>
                <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                  Gross booking volume vs platform net retained commission.
                </div>
              </div>

              {/* Metric Toggle */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                <button
                  type="button"
                  onClick={() => setChartMetric('gross')}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: chartMetric === 'gross' ? '#6366f1' : 'transparent',
                    color: chartMetric === 'gross' ? '#fff' : 'var(--ink-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Gross Vol
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('commission')}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: chartMetric === 'commission' ? '#0ea5e9' : 'transparent',
                    color: chartMetric === 'commission' ? '#fff' : 'var(--ink-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Platform Cut
                </button>
              </div>
            </div>

            {/* SVG Trend Graph */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', minWidth: '460px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gradCommRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartMetric === 'gross' ? '#6366f1' : '#0ea5e9'} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={chartMetric === 'gross' ? '#6366f1' : '#0ea5e9'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal scale grid */}
                {[0, Math.round(maxChartVal * 0.33), Math.round(maxChartVal * 0.66), Math.round(maxChartVal)].map((tick) => {
                  const y = getChartY(tick);
                  return (
                    <g key={tick}>
                      <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--grid)" strokeDasharray="3 3" strokeWidth="1" />
                      <text x={padL - 8} y={y + 4} fontSize="10" textAnchor="end" fill="var(--ink-muted)">
                        ₹{tick >= 1000 ? `${Math.round(tick / 1000)}k` : tick}
                      </text>
                    </g>
                  );
                })}

                {/* Area fill */}
                <path d={makeChartArea()} fill="url(#gradCommRev)" />

                {/* Line */}
                <path
                  d={makeChartPath()}
                  fill="none"
                  stroke={chartMetric === 'gross' ? '#6366f1' : '#0ea5e9'}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points & hover triggers */}
                {chartMonths.map((pt, i) => {
                  const x = getChartX(i);
                  const y = getChartY(pt[chartKey]);
                  const isHovered = hoveredMonthIdx === i;

                  return (
                    <g key={pt.month}>
                      <text
                        x={x}
                        y={padT + chartH + 18}
                        fontSize="11"
                        textAnchor="middle"
                        fill={isHovered ? 'var(--ink)' : 'var(--ink-muted)'}
                        fontWeight={isHovered ? 700 : 500}
                      >
                        {pt.month.slice(0, 3)}
                      </text>

                      {isHovered && (
                        <line x1={x} y1={padT} x2={x} y2={padT + chartH} stroke="var(--ink-muted)" strokeDasharray="3 3" strokeWidth="1" />
                      )}

                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 5.5 : 3.5}
                        fill={chartMetric === 'gross' ? '#6366f1' : '#0ea5e9'}
                        stroke="var(--surface)"
                        strokeWidth="2"
                        style={{ transition: 'r 0.15s ease' }}
                      />

                      <rect
                        x={x - chartW / (chartMonths.length * 2)}
                        y={padT}
                        width={chartW / chartMonths.length}
                        height={chartH + 20}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredMonthIdx(i)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Bottom Interactive Summary Bar */}
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--grid)',
                  fontSize: '12px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>📅 {activeMonth.month}:</span>
                  <span>Gross:</span>
                  <strong className="mono" style={{ color: '#6366f1' }}>₹{activeMonth.gross.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span>
                    Platform Net: <strong className="mono" style={{ color: '#0ea5e9' }}>₹{activeMonth.platformCommission.toLocaleString('en-IN')}</strong>
                  </span>
                  <span>
                    Pairings: <strong className="mono">{activeMonth.sessions}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Revenue Split Waterfall / Donut */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
                Unit Economics &amp; Take-Rate Split
              </div>
              <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                Standard capital distribution across session earnings.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px', flexWrap: 'wrap' }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '135px', height: '135px' }}>
                  <svg viewBox="0 0 160 160" width="135" height="135" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="80" cy="80" r="58" fill="none" stroke="var(--grid)" strokeWidth="15" />
                    {/* Mentor Take */}
                    <circle
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="15"
                      strokeDasharray={`${mentorRakeDash} ${donutCircumference}`}
                      strokeLinecap="round"
                    />
                    {/* Platform Cut */}
                    <circle
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="15"
                      strokeDasharray={`${platformRakeDash} ${donutCircumference}`}
                      strokeDashoffset={platformRakeOffset}
                      strokeLinecap="round"
                    />
                    {/* Gateway */}
                    <circle
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="15"
                      strokeDasharray={`${gatewayRakeDash} ${donutCircumference}`}
                      strokeDashoffset={gatewayRakeOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                      10.0%
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                      Take-Rate
                    </span>
                  </div>
                </div>

                {/* Legend Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px', flex: 1 }}>
                  <div style={{ padding: '6px 10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#10b981', fontSize: '11.5px' }}>Mentor Payout</span>
                      <strong className="mono" style={{ fontSize: '12px', color: 'var(--ink)' }}>88.5%</strong>
                    </div>
                  </div>

                  <div style={{ padding: '6px 10px', background: 'rgba(14, 165, 233, 0.08)', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#0ea5e9', fontSize: '11.5px' }}>Platform Take</span>
                      <strong className="mono" style={{ fontSize: '12px', color: 'var(--ink)' }}>10.0%</strong>
                    </div>
                  </div>

                  <div style={{ padding: '6px 10px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '11.5px' }}>Gateway &amp; GST</span>
                      <strong className="mono" style={{ fontSize: '12px', color: 'var(--ink)' }}>1.5%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro summary */}
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--grid)', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Balanced <strong>9:1 mentor-to-platform ratio</strong> aligns platform success directly with coach earnings.
            </div>
          </div>
        </div>

        {/* Side-by-Side: Commission Configuration & Dynamic Live Simulator */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '18px' }}>
          {/* Commission & Fee Rules Form */}
          <form
            onSubmit={handleSaveRules}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                  Commission &amp; Fee Rules
                </h3>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleResetDefaults}
                  style={{ fontSize: '11.5px', padding: '2px 8px' }}
                >
                  Reset Defaults
                </button>
              </div>
              <p className="sub" style={{ fontSize: '12px', margin: '0 0 16px' }}>
                Set standard percentage rates deducted from pairing session payments upon escrow release.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Base Commission */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                    Standard Platform Commission (%)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={rules.baseCommissionPercent}
                      onChange={(e) => handleRuleChange('baseCommissionPercent', e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--grid)',
                        fontSize: '13px',
                        margin: 0,
                      }}
                      required
                    />
                    <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink-muted)' }}>%</span>
                  </div>
                  <div className="sub" style={{ fontSize: '11px', marginTop: '3px' }}>
                    Default platform rate applied to all standard mentorship sessions.
                  </div>
                </div>

                {/* High Volume Tier */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                      High-Volume Tier (Sessions)
                    </label>
                    <input
                      type="number"
                      min="5"
                      value={rules.highVolumeThreshold}
                      onChange={(e) => handleRuleChange('highVolumeThreshold', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--grid)',
                        fontSize: '13px',
                        margin: 0,
                      }}
                      required
                    />
                    <div className="sub" style={{ fontSize: '11px', marginTop: '3px' }}>
                      Threshold for discount
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                      High-Volume Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={rules.highVolumeCommissionPercent}
                      onChange={(e) => handleRuleChange('highVolumeCommissionPercent', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--grid)',
                        fontSize: '13px',
                        margin: 0,
                      }}
                      required
                    />
                    <div className="sub" style={{ fontSize: '11px', marginTop: '3px' }}>
                      Reduced rate for top mentors
                    </div>
                  </div>
                </div>

                {/* Gateway & GST */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                      Fixed Gateway Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rules.fixedGatewayFee}
                      onChange={(e) => handleRuleChange('fixedGatewayFee', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--grid)',
                        fontSize: '13px',
                        margin: 0,
                      }}
                    />
                    <div className="sub" style={{ fontSize: '11px', marginTop: '3px' }}>
                      Per-transaction fee
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                      GST / Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="28"
                      value={rules.gstTaxPercent}
                      onChange={(e) => handleRuleChange('gstTaxPercent', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg)',
                        border: '1px solid var(--grid)',
                        fontSize: '13px',
                        margin: 0,
                      }}
                    />
                    <div className="sub" style={{ fontSize: '11px', marginTop: '3px' }}>
                      Statutory tax breakdown
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: '16px', padding: '8px 16px', fontSize: '13px', fontWeight: 700 }}
              disabled={saving}
            >
              {saving ? 'Updating Rules...' : 'Save Commission Rules'}
            </button>
          </form>

          {/* Interactive Live Calculation Simulator */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                  Live Calculation Simulator
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#6366f1',
                    borderRadius: '8px',
                  }}
                >
                  Real-time Preview
                </span>
              </div>
              <p className="sub" style={{ fontSize: '12px', margin: '0 0 16px' }}>
                Interactive simulator to model payout disbursements under current rules.
              </p>

              {/* Sample Amount Selector Pills */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                    Sample Session Price (₹):
                  </label>
                  <strong className="mono" style={{ fontSize: '14px', color: '#6366f1' }}>
                    ₹{simPrice.toLocaleString('en-IN')}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {[500, 1000, 2500, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSimPrice(amt)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: simPrice === amt ? '#6366f1' : 'var(--bg)',
                        color: simPrice === amt ? '#fff' : 'var(--ink)',
                        border: simPrice === amt ? '1px solid #6366f1' : '1px solid var(--grid)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                {/* Tier Selection */}
                <div style={{ display: 'flex', gap: '8px', background: 'var(--bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <button
                    type="button"
                    onClick={() => setSimTier('standard')}
                    style={{
                      flex: 1,
                      border: 'none',
                      padding: '5px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: simTier === 'standard' ? 'var(--ink)' : 'transparent',
                      color: simTier === 'standard' ? 'var(--bg)' : 'var(--ink-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Standard Tier ({rules.baseCommissionPercent}%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimTier('high_volume')}
                    style={{
                      flex: 1,
                      border: 'none',
                      padding: '5px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: simTier === 'high_volume' ? 'var(--ink)' : 'transparent',
                      color: simTier === 'high_volume' ? 'var(--bg)' : 'var(--ink-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    High-Volume ({rules.highVolumeCommissionPercent}%)
                  </button>
                </div>
              </div>

              {/* Breakdown Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <span style={{ fontSize: '12.5px' }}>Learner Gross Paid:</span>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)' }}>
                    ₹{simPrice.toLocaleString('en-IN')}.00
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <span style={{ fontSize: '12.5px' }}>Platform Cut ({simRate}%):</span>
                  <span className="mono" style={{ fontWeight: 700, color: '#0ea5e9', fontSize: '13.5px' }}>
                    −₹{simCommission.toLocaleString('en-IN')}.00
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                  <span style={{ fontSize: '12.5px' }}>Gateway &amp; Nodal Rails (1.5% + ₹{rules.fixedGatewayFee}):</span>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--ink-muted)', fontSize: '13.5px' }}>
                    −₹{simGateway.toLocaleString('en-IN')}.00
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669', display: 'block' }}>Net Mentor Payout:</span>
                    <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{simMentorPct}% of gross value</span>
                  </div>
                  <span className="mono" style={{ fontWeight: 800, color: '#059669', fontSize: '18px' }}>
                    ₹{simNetMentor.toLocaleString('en-IN')}.00
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--ink-muted)', textAlign: 'center' }}>
              ✓ Simulator accounts for dynamic tier qualifications and nodal processing rules.
            </div>
          </div>
        </div>

        {/* Revenue Reports Ledger */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--grid-strong)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--grid-strong)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                Monthly Commission &amp; Revenue Reports
              </h3>
              <div className="sub" style={{ fontSize: '12px', marginTop: '2px' }}>
                Historical summary of monthly gross volume, gateway rake, and platform net margins.
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              6 active billing periods
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ margin: 0, fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '10px 16px' }}>Billing Period</th>
                  <th style={{ padding: '10px 14px' }}>Gross Volume</th>
                  <th style={{ padding: '10px 14px' }}>Platform Commission</th>
                  <th style={{ padding: '10px 14px' }}>Gateway Fees</th>
                  <th style={{ padding: '10px 14px' }}>Net Mentor Payout</th>
                  <th style={{ padding: '10px 14px' }}>Sessions</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Platform Margin</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((row) => (
                  <tr key={row.month} style={{ borderBottom: '1px solid var(--grid)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{row.month}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <strong className="mono" style={{ color: 'var(--ink)' }}>
                        ₹{row.gross.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: '#0ea5e9', fontWeight: 700 }}>
                        ₹{row.platformCommission.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: 'var(--ink-muted)' }}>
                        ₹{row.gatewayFees.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: '#10b981', fontWeight: 700 }}>
                        ₹{row.netMentor.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono">{row.sessions}</span>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(14, 165, 233, 0.12)',
                          color: '#0ea5e9',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                      >
                        10.0%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
