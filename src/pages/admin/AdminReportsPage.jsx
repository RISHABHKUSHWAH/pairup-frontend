import React, { useState, useEffect, useMemo } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { adminReports, formatCurrency } from '../../api/client';
import {
  DownloadIcon,
  UsersIcon,
  MentorIcon,
  ClockIcon,
  CreditCardIcon,
  BarChartIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  StarIcon,
  PercentIcon,
  RefreshIcon,
  WalletIcon,
} from '../../components/Icons';
import { useToast } from '../../context';

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'sessions' | 'finance' | 'analytics'
  const [data, setData] = useState(null);
  const [chartMode, setChartMode] = useState('trajectory'); // 'trajectory' | 'additions'
  const [activeSeries, setActiveSeries] = useState('all'); // 'all' | 'total' | 'learners' | 'mentors'
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(null);
  const [timeframe, setTimeframe] = useState('6m'); // '3m' | '6m'
  const [hoveredFinanceIdx, setHoveredFinanceIdx] = useState(null);

  useEffect(() => {
    setData(adminReports.getAnalytics());
  }, []);

  const handleExportCSV = () => {
    if (!data) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    let filename = `pairup-analytics-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === 'users') {
      csvContent += 'Month,New Learners,New Mentors,Total Cumulative,Growth Rate (%)\n';
      data.userGrowth.forEach((row, idx) => {
        const growthRate = idx === 0 ? '0' : Math.round(((row.total - data.userGrowth[idx - 1].total) / data.userGrowth[idx - 1].total) * 100);
        csvContent += `"${row.month}",${row.learners},${row.mentors},${row.total},${growthRate}%\n`;
      });
    } else if (activeTab === 'sessions') {
      csvContent += 'Metric,Value\n';
      csvContent += `"Total Bookings",${data.sessions.totalBooked}\n`;
      csvContent += `"Completed Sessions",${data.sessions.completed}\n`;
      csvContent += `"Completion Rate (%)",${data.sessions.completionRate}%\n`;
      csvContent += `"Cancelled Sessions",${data.sessions.cancelled}\n`;
      csvContent += `"Disputed Sessions",${data.sessions.disputed}\n`;
      csvContent += `"Average Duration (mins)",${data.sessions.avgDurationMinutes}\n`;
      Object.entries(data.sessions.durationBreakdown).forEach(([dur, count]) => {
        csvContent += `"Duration ${dur}",${count}\n`;
      });
    } else if (activeTab === 'finance') {
      csvContent += 'Category,Amount (INR)\n';
      csvContent += `"Gross Volume",${data.finance.grossVolume}\n`;
      csvContent += `"Platform Revenue (Net)",${data.finance.platformRevenue}\n`;
      csvContent += `"Mentor Payouts",${data.finance.netMentorPayouts}\n`;
      csvContent += `"Held in Escrow",${data.finance.escrowHeld}\n`;
      csvContent += `"Refunded Amount",${data.finance.refundedAmount}\n`;
      csvContent += `"Average Booking Value",${data.finance.avgBookingValue}\n`;
    } else if (activeTab === 'analytics') {
      csvContent += 'KPI Name,Metric\n';
      csvContent += `"Problems Posted",${data.platformKpis.problemsPosted}\n`;
      csvContent += `"Problems Solved",${data.platformKpis.problemsSolved}\n`;
      csvContent += `"Problem Solve Rate (%)",${data.platformKpis.problemSolveRate}%\n`;
      csvContent += `"Mentor Acceptance Rate (%)",${data.platformKpis.mentorAcceptanceRate}%\n`;
      csvContent += `"Proposal Conversion Rate (%)",${data.platformKpis.proposalConversionRate}%\n`;
      csvContent += `"Repeat Learner Rate (%)",${data.platformKpis.repeatLearnerRate}%\n`;
      csvContent += `"Average Mentor Rating",${data.platformKpis.avgMentorRating}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename} successfully!`);
  };

  if (!data) return null;

  return (
    <PortalLayout
      title="Platform Reports &amp; Analytics"
      portalType="admin"
      actions={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              fontSize: '12.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 14px',
              borderRadius: '8px',
            }}
            onClick={handleExportCSV}
            title="Download formatted CSV report for the active section"
          >
            <DownloadIcon size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      }
    >
      <div style={{ marginBottom: '20px' }}>
        <p className="sub" style={{ margin: 0, fontSize: '13.5px', color: 'var(--ink-muted)' }}>
          Comprehensive reporting console across User Growth, Session Fulfillment, Financial Ledgers, and Platform Conversion Metrics.
        </p>
      </div>

      {/* Upgraded Modern Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '6px',
          background: 'var(--surface)',
          border: '1px solid var(--grid-strong)',
          borderRadius: '12px',
          marginBottom: '22px',
        }}
      >
        {[
          { id: 'users', label: 'User Growth & Cohorts', icon: <UsersIcon size={15} /> },
          { id: 'sessions', label: 'Session Fulfillment', icon: <ClockIcon size={15} /> },
          { id: 'finance', label: 'Financial Overview', icon: <WalletIcon size={15} /> },
          { id: 'analytics', label: 'Platform Conversion KPIs', icon: <BarChartIcon size={15} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                border: 'none',
                background: isActive ? 'var(--ink)' : 'transparent',
                color: isActive ? 'var(--surface)' : 'var(--ink-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ display: 'flex', opacity: isActive ? 1 : 0.7 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (() => {
        const growthList = data.userGrowth || [];
        const maxVal = 700;
        const svgW = 760;
        const svgH = 240;
        const padL = 55;
        const padR = 25;
        const padT = 25;
        const padB = 35;
        const chartW = svgW - padL - padR;
        const chartH = svgH - padT - padB;

        const getX = (idx) => padL + (idx / Math.max(1, growthList.length - 1)) * chartW;
        const getY = (val) => padT + (1 - Math.min(maxVal, Math.max(0, val)) / maxVal) * chartH;

        // Path generators
        const makePath = (key) => {
          return growthList
            .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt[key]).toFixed(1)}`)
            .join(' ');
        };

        const makeAreaPath = (key) => {
          const line = makePath(key);
          const firstX = getX(0).toFixed(1);
          const lastX = getX(growthList.length - 1).toFixed(1);
          const bottomY = (padT + chartH).toFixed(1);
          return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
        };

        const activeItem = hoveredMonthIdx !== null ? growthList[hoveredMonthIdx] : growthList[growthList.length - 1];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 4 Elevated Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
              {/* Total Users */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                    Total Registered Users
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
                    <UsersIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                  636
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                  <span>↑ +34%</span>
                  <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>from last month</span>
                </div>
              </div>

              {/* Learners */}
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
                    Learner Accounts
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
                    <UsersIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>
                  512
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  <strong style={{ color: 'var(--ink)' }}>80.5%</strong> of platform community
                </div>
              </div>

              {/* Mentors */}
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
                    Verified Mentors
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
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                  124
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  <strong style={{ color: 'var(--ink)' }}>19.5%</strong> verified instructors
                </div>
              </div>

              {/* Monthly Active Users */}
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
                    Monthly Active Users (MAU)
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
                    <ClockIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                  482
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  <strong style={{ color: '#10b981' }}>75.7%</strong> active engagement rate
                </div>
              </div>
            </div>

            {/* Interactive User Growth Graph Panel */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '14px',
                padding: '20px 22px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              }}
            >
              {/* Graph Header & Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                    User Growth Trajectory &amp; Community Expansion
                  </h3>
                  <p className="sub" style={{ fontSize: '12px', margin: '4px 0 0', color: 'var(--ink-muted)' }}>
                    Cumulative platform registrations and monthly active cohort distribution.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* View Switcher: Line/Area vs Grouped Bars */}
                  <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '8px', padding: '3px', border: '1px solid var(--grid)' }}>
                    <button
                      type="button"
                      onClick={() => setChartMode('trajectory')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: chartMode === 'trajectory' ? 700 : 500,
                        borderRadius: '6px',
                        border: 'none',
                        background: chartMode === 'trajectory' ? 'var(--surface)' : 'transparent',
                        color: chartMode === 'trajectory' ? 'var(--ink)' : 'var(--ink-muted)',
                        cursor: 'pointer',
                        boxShadow: chartMode === 'trajectory' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      Area Curve
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode('additions')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: chartMode === 'additions' ? 700 : 500,
                        borderRadius: '6px',
                        border: 'none',
                        background: chartMode === 'additions' ? 'var(--surface)' : 'transparent',
                        color: chartMode === 'additions' ? 'var(--ink)' : 'var(--ink-muted)',
                        cursor: 'pointer',
                        boxShadow: chartMode === 'additions' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      Monthly Additions (Bar)
                    </button>
                  </div>

                  {/* Series Filter Pills */}
                  {chartMode === 'trajectory' && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {[
                        { id: 'all', label: 'All Series', color: '#6366f1' },
                        { id: 'total', label: 'Total', color: '#6366f1' },
                        { id: 'learners', label: 'Learners', color: '#0ea5e9' },
                        { id: 'mentors', label: 'Mentors', color: '#10b981' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActiveSeries(s.id)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: activeSeries === s.id ? 700 : 500,
                            border: `1px solid ${activeSeries === s.id ? s.color : 'var(--grid)'}`,
                            background: activeSeries === s.id ? `${s.color}15` : 'transparent',
                            color: activeSeries === s.id ? s.color : 'var(--ink-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart Rendering */}
              {chartMode === 'trajectory' ? (
                <div style={{ position: 'relative' }}>
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                  >
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="gradLearners" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="gradMentors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines & Y-axis labels */}
                    {[0, 175, 350, 525, 700].map((val) => {
                      const y = getY(val);
                      return (
                        <g key={val}>
                          <line
                            x1={padL}
                            y1={y}
                            x2={svgW - padR}
                            y2={y}
                            stroke="var(--grid-strong)"
                            strokeDasharray={val === 0 ? 'none' : '3 3'}
                            strokeWidth="1"
                            opacity="0.6"
                          />
                          <text
                            x={padL - 10}
                            y={y + 3.5}
                            fontSize="10"
                            textAnchor="end"
                            fill="var(--ink-muted)"
                            className="mono"
                          >
                            {val}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area fills */}
                    {(activeSeries === 'all' || activeSeries === 'total') && (
                      <path d={makeAreaPath('total')} fill="url(#gradTotal)" />
                    )}
                    {(activeSeries === 'all' || activeSeries === 'learners') && (
                      <path d={makeAreaPath('learners')} fill="url(#gradLearners)" />
                    )}
                    {(activeSeries === 'all' || activeSeries === 'mentors') && (
                      <path d={makeAreaPath('mentors')} fill="url(#gradMentors)" />
                    )}

                    {/* Stroke lines */}
                    {(activeSeries === 'all' || activeSeries === 'total') && (
                      <path
                        d={makePath('total')}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {(activeSeries === 'all' || activeSeries === 'learners') && (
                      <path
                        d={makePath('learners')}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {(activeSeries === 'all' || activeSeries === 'mentors') && (
                      <path
                        d={makePath('mentors')}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* X-axis labels and points */}
                    {growthList.map((pt, i) => {
                      const x = getX(i);
                      const isHovered = hoveredMonthIdx === i;

                      return (
                        <g key={pt.month}>
                          {/* X-axis label */}
                          <text
                            x={x}
                            y={padT + chartH + 20}
                            fontSize="11"
                            textAnchor="middle"
                            fill={isHovered ? 'var(--ink)' : 'var(--ink-muted)'}
                            fontWeight={isHovered ? 700 : 500}
                          >
                            {pt.month}
                          </text>

                          {/* Hover guide vertical line */}
                          {isHovered && (
                            <line
                              x1={x}
                              y1={padT}
                              x2={x}
                              y2={padT + chartH}
                              stroke="var(--ink-muted)"
                              strokeDasharray="4 4"
                              strokeWidth="1.2"
                            />
                          )}

                          {/* Data points */}
                          {(activeSeries === 'all' || activeSeries === 'total') && (
                            <circle
                              cx={x}
                              cy={getY(pt.total)}
                              r={isHovered ? 6 : 4}
                              fill="#6366f1"
                              stroke="var(--surface)"
                              strokeWidth="2"
                              style={{ transition: 'r 0.15s ease' }}
                            />
                          )}
                          {(activeSeries === 'all' || activeSeries === 'learners') && (
                            <circle
                              cx={x}
                              cy={getY(pt.learners)}
                              r={isHovered ? 5.5 : 3.5}
                              fill="#0ea5e9"
                              stroke="var(--surface)"
                              strokeWidth="2"
                              style={{ transition: 'r 0.15s ease' }}
                            />
                          )}
                          {(activeSeries === 'all' || activeSeries === 'mentors') && (
                            <circle
                              cx={x}
                              cy={getY(pt.mentors)}
                              r={isHovered ? 5.5 : 3.5}
                              fill="#10b981"
                              stroke="var(--surface)"
                              strokeWidth="2"
                              style={{ transition: 'r 0.15s ease' }}
                            />
                          )}

                          {/* Interactive Hover capture rect */}
                          <rect
                            x={x - chartW / (growthList.length * 2)}
                            y={padT}
                            width={chartW / growthList.length}
                            height={chartH + 20}
                            fill="transparent"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredMonthIdx(i)}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Interactive Floating / Bottom Tooltip bar */}
                  <div
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '10px 14px',
                      background: 'var(--bg)',
                      borderRadius: '8px',
                      border: '1px solid var(--grid)',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                        📅 {activeItem.month}:
                      </span>
                      <span>Total Cumulative Users:</span>
                      <strong className="mono" style={{ color: '#6366f1', fontSize: '13.5px' }}>
                        {activeItem.total}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }} />
                        Learners: <strong className="mono">{activeItem.learners}</strong>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                        Mentors: <strong className="mono">{activeItem.mentors}</strong>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        Growth: <strong className="mono" style={{ color: '#10b981' }}>
                          {hoveredMonthIdx && hoveredMonthIdx > 0
                            ? `+${Math.round(((growthList[hoveredMonthIdx].total - growthList[hoveredMonthIdx - 1].total) / growthList[hoveredMonthIdx - 1].total) * 100)}%`
                            : '+34%'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Grouped Bar Chart Mode */
                <div style={{ padding: '10px 0' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${growthList.length}, 1fr)`,
                      gap: '12px',
                      alignItems: 'flex-end',
                      height: '210px',
                      paddingBottom: '24px',
                      borderBottom: '1px solid var(--grid-strong)',
                    }}
                  >
                    {growthList.map((pt, i) => {
                      const maxNew = 550;
                      const learnerBarH = Math.round((pt.learners / maxNew) * 160);
                      const mentorBarH = Math.round((pt.mentors / maxNew) * 160);

                      return (
                        <div key={pt.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                            +{pt.learners + pt.mentors}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                            {/* Learner Bar */}
                            <div
                              style={{
                                width: '14px',
                                height: `${Math.max(8, learnerBarH)}px`,
                                background: 'linear-gradient(180deg, #0ea5e9, #0284c7)',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease',
                              }}
                              title={`${pt.month} New Learners: +${pt.learners}`}
                            />
                            {/* Mentor Bar */}
                            <div
                              style={{
                                width: '14px',
                                height: `${Math.max(6, mentorBarH)}px`,
                                background: 'linear-gradient(180deg, #10b981, #059669)',
                                borderRadius: '4px 4px 0 0',
                                transition: 'height 0.3s ease',
                              }}
                              title={`${pt.month} New Mentors: +${pt.mentors}`}
                            />
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '8px', fontWeight: 600, textAlign: 'center' }}>
                            {pt.month.split(' ')[0]}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '14px', fontSize: '12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0ea5e9' }} />
                      New Learners added
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
                      New Mentors verified
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Side-by-Side: Community Ratio Donut & Growth Trajectory Table */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
              {/* Community Ratio Donut Card */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
                  Community Cohort Ratio
                </div>
                <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                  Learners vs. Verified Mentors ratio across PairUp.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  {/* SVG Donut */}
                  <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                    <svg viewBox="0 0 160 160" width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                      {/* Background circle */}
                      <circle cx="80" cy="80" r="58" fill="none" stroke="var(--grid)" strokeWidth="16" />
                      {/* Learners 80.5% (approx 293 of 364 circumference) */}
                      <circle
                        cx="80"
                        cy="80"
                        r="58"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="16"
                        strokeDasharray="293.3 364.4"
                        strokeLinecap="round"
                      />
                      {/* Mentors 19.5% (approx 71 of 364 circumference) */}
                      <circle
                        cx="80"
                        cy="80"
                        r="58"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="16"
                        strokeDasharray="71.1 364.4"
                        strokeDashoffset="-293.3"
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
                      <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>636</span>
                      <span style={{ fontSize: '10px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Total</span>
                    </div>
                  </div>

                  {/* Legend & Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '150px' }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(14, 165, 233, 0.08)', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#0ea5e9', fontSize: '12.5px' }}>Learners</span>
                        <strong className="mono" style={{ fontSize: '14px', color: 'var(--ink)' }}>80.5%</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        512 registered learners
                      </div>
                    </div>

                    <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#10b981', fontSize: '12.5px' }}>Mentors</span>
                        <strong className="mono" style={{ fontSize: '14px', color: 'var(--ink)' }}>19.5%</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        124 verified instructors
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Trajectory Table */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--grid-strong)' }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)' }}>
                    Monthly Trajectory Data
                  </div>
                  <div className="sub" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                    Historical cohort acquisition by month.
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ margin: 0, fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                        <th style={{ padding: '10px 16px' }}>Month</th>
                        <th style={{ padding: '10px 14px' }}>Learners</th>
                        <th style={{ padding: '10px 14px' }}>Mentors</th>
                        <th style={{ padding: '10px 14px' }}>Cumulative</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right' }}>Growth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {growthList.map((row, idx) => (
                        <tr key={row.month} style={{ borderBottom: '1px solid var(--grid)' }}>
                          <td style={{ fontWeight: 700, color: 'var(--ink)', padding: '10px 16px' }}>{row.month}</td>
                          <td style={{ color: '#0ea5e9', fontWeight: 600, padding: '10px 14px' }}>+{row.learners}</td>
                          <td style={{ color: '#10b981', fontWeight: 600, padding: '10px 14px' }}>+{row.mentors}</td>
                          <td className="mono" style={{ fontWeight: 700, color: 'var(--ink)', padding: '10px 14px' }}>{row.total}</td>
                          <td style={{ textAlign: 'right', padding: '10px 16px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: idx === 0 ? 'var(--grid)' : 'rgba(16, 185, 129, 0.12)',
                                color: idx === 0 ? 'var(--ink-muted)' : '#059669',
                              }}
                            >
                              {idx === 0
                                ? 'Baseline'
                                : `+${Math.round(((row.total - growthList[idx - 1].total) / growthList[idx - 1].total) * 100)}%`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: SESSIONS */}
      {activeTab === 'sessions' && (() => {
        const total = data.sessions.totalBooked; // 284
        const completed = data.sessions.completed; // 258
        const cancelled = data.sessions.cancelled; // 18
        const disputed = data.sessions.disputed; // 8
        const circumference = 364.4; // 2 * Math.PI * 58

        const compPct = ((completed / total) * 100).toFixed(1);
        const cancPct = ((cancelled / total) * 100).toFixed(1);
        const dispPct = ((disputed / total) * 100).toFixed(1);

        const compDash = ((completed / total) * circumference).toFixed(1);
        const cancDash = ((cancelled / total) * circumference).toFixed(1);
        const dispDash = ((disputed / total) * circumference).toFixed(1);
        const cancOffset = (-parseFloat(compDash)).toFixed(1);
        const dispOffset = (-(parseFloat(compDash) + parseFloat(cancDash))).toFixed(1);

        // Duration breakdowns:
        const durEntries = Object.entries(data.sessions.durationBreakdown);
        const durColors = {
          '30m': '#6366f1',
          '45m': '#0ea5e9',
          '60m': '#10b981',
          '90m+': '#f59e0b',
        };
        const durLabels = {
          '30m': 'Quick Fix & Diagnostics',
          '45m': 'Targeted Problem Solving',
          '60m': 'Full Feature & Architecture',
          '90m+': 'Deep Dive Sprint & Refactor',
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 4 Elevated Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
              {/* Total Bookings */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                    Total Bookings
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
                    <ClockIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                  {total}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                  <span>↑ +18%</span>
                  <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>lifetime pairings scheduled</span>
                </div>
              </div>

              {/* Completion Rate */}
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
                    Completion Rate
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
                    <CheckCircleIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                  {data.sessions.completionRate}%
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  <strong style={{ color: 'var(--ink)' }}>{completed}</strong> sessions concluded cleanly
                </div>
              </div>

              {/* Cancellation Rate */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderTop: '3px solid #ef4444',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                    Cancellation Rate
                  </span>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AlertTriangleIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>
                  {cancPct}%
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  <strong style={{ color: 'var(--ink)' }}>{cancelled}</strong> mutual or learner drop-offs
                </div>
              </div>

              {/* Average Duration */}
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
                    Avg Duration
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
                    <ClockIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>
                  {data.sessions.avgDurationMinutes}m
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  Sweet spot for interactive pair coding
                </div>
              </div>
            </div>

            {/* Side-by-Side: Outcomes Ring & Session Duration Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
              {/* Outcomes Ring Card */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
                  Session Resolution Outcomes
                </div>
                <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                  Concluded, cancelled, and disputed session ratio.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: '140px', height: '140px' }}>
                    <svg viewBox="0 0 160 160" width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="80" cy="80" r="58" fill="none" stroke="var(--grid)" strokeWidth="16" />
                      {/* Completed 90.8% */}
                      <circle
                        cx="80"
                        cy="80"
                        r="58"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="16"
                        strokeDasharray={`${compDash} ${circumference}`}
                        strokeLinecap="round"
                      />
                      {/* Cancelled 6.3% */}
                      <circle
                        cx="80"
                        cy="80"
                        r="58"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="16"
                        strokeDasharray={`${cancDash} ${circumference}`}
                        strokeDashoffset={cancOffset}
                        strokeLinecap="round"
                      />
                      {/* Disputed 2.8% */}
                      <circle
                        cx="80"
                        cy="80"
                        r="58"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="16"
                        strokeDasharray={`${dispDash} ${circumference}`}
                        strokeDashoffset={dispOffset}
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
                      <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{total}</span>
                      <span style={{ fontSize: '10px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Sessions</span>
                    </div>
                  </div>

                  {/* Resolution Breakdown list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '155px', flex: 1 }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#10b981', fontSize: '12px' }}>Completed</span>
                        <strong className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{compPct}%</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {completed} pairing encounters
                      </div>
                    </div>

                    <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '12px' }}>Cancelled</span>
                        <strong className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{cancPct}%</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {cancelled} mutual / prior to start
                      </div>
                    </div>

                    <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '12px' }}>Disputed</span>
                        <strong className="mono" style={{ fontSize: '13px', color: 'var(--ink)' }}>{dispPct}%</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {disputed} tickets (100% resolved)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Duration Distribution Card */}
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
                    Session Duration Distribution
                  </div>
                  <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                    Pairing duration preference across {total} lifetime sessions.
                  </div>

                  {/* Multi-segment stacked proportional progress bar */}
                  <div style={{ height: '14px', borderRadius: '7px', background: 'var(--grid)', overflow: 'hidden', display: 'flex', marginBottom: '16px' }}>
                    {durEntries.map(([dur, count]) => {
                      const pct = (count / total) * 100;
                      return (
                        <div
                          key={dur}
                          style={{
                            width: `${pct}%`,
                            background: durColors[dur],
                            transition: 'width 0.4s ease',
                          }}
                          title={`${dur}: ${count} sessions (${pct.toFixed(1)}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* 4-column distribution cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {durEntries.map(([dur, count]) => {
                      const pct = Math.round((count / total) * 100);
                      const color = durColors[dur];
                      return (
                        <div
                          key={dur}
                          style={{
                            padding: '10px 12px',
                            background: 'var(--bg)',
                            borderRadius: '8px',
                            border: '1px solid var(--grid)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                              {dur} Session
                            </span>
                            <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                              {pct}%
                            </span>
                          </div>
                          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                            {count} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink-muted)' }}>calls</span>
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', marginTop: '4px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {durLabels[dur]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quality & Reliability Telemetry Grid */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
                Platform Pairing Telemetry &amp; Reliability
              </div>
              <div className="sub" style={{ fontSize: '12px', marginBottom: '14px' }}>
                Real-time operational reliability indicators across live pairing rooms.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mentor Arrival Adherence
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0' }}>
                    98.4%
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                    Average room join latency: <strong>42 seconds</strong>
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    WebRTC Audio / Video Quality
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0' }}>
                    99.2%
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                    Clean stream continuity without packet drop
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--grid)' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Code Editor OT Synchronization
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0' }}>
                    99.9%
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                    Real-time conflict-free collaborative editor uptime
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: FINANCE */}
      {activeTab === 'finance' && (() => {
        const gross = data.finance.grossVolume; // 342000
        const mentorPayout = data.finance.netMentorPayouts; // 307800
        const platformRev = data.finance.platformRevenue; // 34200
        const escrow = data.finance.escrowHeld; // 18500
        const refund = data.finance.refundedAmount || 4300;

        const mentorPct = ((mentorPayout / gross) * 100).toFixed(1);
        const platformPct = ((platformRev / gross) * 100).toFixed(1);
        const escrowPct = ((escrow / gross) * 100).toFixed(1);
        const refundPct = ((refund / gross) * 100).toFixed(1);

        // 6-Month Financial Trend
        const financeTrend = [
          { month: 'Oct 2025', gross: 32000, net: 3200, mentors: 28800 },
          { month: 'Nov 2025', gross: 58000, net: 5800, mentors: 52200 },
          { month: 'Dec 2025', gross: 98000, net: 9800, mentors: 88200 },
          { month: 'Jan 2026', gross: 164000, net: 16400, mentors: 147600 },
          { month: 'Feb 2026', gross: 248000, net: 24800, mentors: 223200 },
          { month: 'Mar 2026', gross: 342000, net: 34200, mentors: 307800 },
        ];

        const maxFinVal = 400000;
        const svgW = 760;
        const svgH = 240;
        const padL = 65;
        const padR = 25;
        const padT = 25;
        const padB = 35;
        const chartW = svgW - padL - padR;
        const chartH = svgH - padT - padB;

        const getFinX = (idx) => padL + (idx / Math.max(1, financeTrend.length - 1)) * chartW;
        const getFinY = (val) => padT + (1 - Math.min(maxFinVal, Math.max(0, val)) / maxFinVal) * chartH;

        const makeGrossPath = () => {
          return financeTrend
            .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getFinX(i).toFixed(1)} ${getFinY(pt.gross).toFixed(1)}`)
            .join(' ');
        };

        const makeGrossArea = () => {
          const line = makeGrossPath();
          const firstX = getFinX(0).toFixed(1);
          const lastX = getFinX(financeTrend.length - 1).toFixed(1);
          const bottomY = (padT + chartH).toFixed(1);
          return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
        };

        const activeFinItem = hoveredFinanceIdx !== null ? financeTrend[hoveredFinanceIdx] : financeTrend[financeTrend.length - 1];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 4 Elevated Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
              {/* Gross Volume */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                    Gross Transaction Volume
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
                    <CreditCardIcon size={18} />
                  </div>
                </div>
                <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                  ₹{gross.toLocaleString('en-IN')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                  <span>↑ +28% MoM</span>
                  <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>100% escrow processed</span>
                </div>
              </div>

              {/* Disbursed to Mentors */}
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
                    Disbursed to Mentors
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
                    <WalletIcon size={18} />
                  </div>
                </div>
                <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                  ₹{mentorPayout.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  <strong style={{ color: 'var(--ink)' }}>{mentorPct}%</strong> net payout to verified creators
                </div>
              </div>

              {/* Platform Commission (Net) */}
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
                    Platform Commission (Net)
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
                    <PercentIcon size={18} />
                  </div>
                </div>
                <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>
                  ₹{platformRev.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  <strong style={{ color: 'var(--ink)' }}>10.0%</strong> standard platform take
                </div>
              </div>

              {/* Held in Escrow */}
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
                  ₹{escrow.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  Safeguarded for active &amp; scheduled sessions
                </div>
              </div>
            </div>

            {/* Financial Trajectory Graph (SVG) */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--ink)' }}>
                      Monthly Financial Volume &amp; Platform Revenue
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669',
                        borderRadius: '12px',
                        fontWeight: 700,
                      }}
                    >
                      +968% 6M Trajectory
                    </span>
                  </div>
                  <div className="sub" style={{ fontSize: '12.5px', margin: '3px 0 0' }}>
                    Gross Transaction Volume (INR) vs. Platform Net Rake (10%).
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1' }} />
                    Gross Volume (GMV)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0ea5e9' }} />
                    Platform Net Commission (10%)
                  </span>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  style={{ width: '100%', height: 'auto', minWidth: '550px', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 100000, 200000, 300000, 400000].map((tick) => {
                    const y = getFinY(tick);
                    return (
                      <g key={tick}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={padL + chartW}
                          y2={y}
                          stroke="var(--grid)"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 10}
                          y={y + 4}
                          fontSize="10"
                          textAnchor="end"
                          fill="var(--ink-muted)"
                          fontWeight="500"
                        >
                          {tick === 0 ? '₹0' : `₹${tick / 1000}k`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill for Gross Volume */}
                  <path d={makeGrossArea()} fill="url(#gradGross)" />

                  {/* Line for Gross Volume */}
                  <path
                    d={makeGrossPath()}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Monthly points & hover guides */}
                  {financeTrend.map((pt, i) => {
                    const x = getFinX(i);
                    const isHovered = hoveredFinanceIdx === i;

                    return (
                      <g key={pt.month}>
                        <text
                          x={x}
                          y={padT + chartH + 20}
                          fontSize="11"
                          textAnchor="middle"
                          fill={isHovered ? 'var(--ink)' : 'var(--ink-muted)'}
                          fontWeight={isHovered ? 700 : 500}
                        >
                          {pt.month}
                        </text>

                        {isHovered && (
                          <line
                            x1={x}
                            y1={padT}
                            x2={x}
                            y2={padT + chartH}
                            stroke="var(--ink-muted)"
                            strokeDasharray="4 4"
                            strokeWidth="1.2"
                          />
                        )}

                        <circle
                          cx={x}
                          cy={getFinY(pt.gross)}
                          r={isHovered ? 6 : 4}
                          fill="#6366f1"
                          stroke="var(--surface)"
                          strokeWidth="2"
                          style={{ transition: 'r 0.15s ease' }}
                        />

                        {/* Interactive hover rect */}
                        <rect
                          x={x - chartW / (financeTrend.length * 2)}
                          y={padT}
                          width={chartW / financeTrend.length}
                          height={chartH + 20}
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredFinanceIdx(i)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Bottom Interactive Tooltip Bar */}
                <div
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '10px 14px',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--grid)',
                    fontSize: '12.5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                      📅 {activeFinItem.month}:
                    </span>
                    <span>Gross Volume:</span>
                    <strong className="mono" style={{ color: '#6366f1', fontSize: '13.5px' }}>
                      ₹{activeFinItem.gross.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      Mentors Share: <strong className="mono">₹{activeFinItem.mentors.toLocaleString('en-IN')}</strong>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }} />
                      Platform Net (10%): <strong className="mono" style={{ color: '#0ea5e9' }}>₹{activeFinItem.net.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side-by-Side: Cashflow Waterfall & Key Financial Averages */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
              {/* Cashflow Waterfall Bar */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
                  Gross Volume Allocation
                </div>
                <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                  Distribution of ₹{gross.toLocaleString('en-IN')} total lifetime escrow intake.
                </div>

                {/* Segmented Waterfall Bar */}
                <div style={{ height: '14px', borderRadius: '7px', background: 'var(--grid)', overflow: 'hidden', display: 'flex', marginBottom: '16px' }}>
                  <div style={{ width: `${mentorPct}%`, background: '#10b981' }} title={`Mentors: ₹${mentorPayout.toLocaleString('en-IN')} (${mentorPct}%)`} />
                  <div style={{ width: `${platformPct}%`, background: '#0ea5e9' }} title={`Platform Commission: ₹${platformRev.toLocaleString('en-IN')} (${platformPct}%)`} />
                  <div style={{ width: `${escrowPct}%`, background: '#f59e0b' }} title={`Escrow Reserve: ₹${escrow.toLocaleString('en-IN')} (${escrowPct}%)`} />
                  <div style={{ width: `${refundPct}%`, background: '#ef4444' }} title={`Refunded: ₹${refund.toLocaleString('en-IN')} (${refundPct}%)`} />
                </div>

                {/* 4 Detailed Allocation Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Mentors Disbursed</div>
                    <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: '2px 0' }}>
                      ₹{mentorPayout.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>90.0% creator earnings</div>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                    <div style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: 700 }}>Platform Revenue</div>
                    <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: '2px 0' }}>
                      ₹{platformRev.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>10.0% platform take</div>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                    <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>Escrow Float</div>
                    <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: '2px 0' }}>
                      ₹{escrow.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>Held for active calls</div>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>Refunds Paid</div>
                    <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', margin: '2px 0' }}>
                      ₹{refund.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>1.2% dispute rate</div>
                  </div>
                </div>
              </div>

              {/* Key Financial Economics Panel */}
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
                    Unit Economics &amp; Capital Efficiency
                  </div>
                  <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                    Fundamental monetary efficiency and payout health metrics.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                          Average Booking Value
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                          Mean fee per confirmed 1:1 session
                        </div>
                      </div>
                      <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                        ₹{data.finance.avgBookingValue}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                          Mentor Earnings Retention
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                          Mentors recurring monthly payouts
                        </div>
                      </div>
                      <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                        94.2%
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--grid)' }}>
                      <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                          Average Payout Release
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                          Automatic IMPS / UPI transfer
                        </div>
                      </div>
                      <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: '#0ea5e9' }}>
                        &lt; 3.2 hrs
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 4: PLATFORM ANALYTICS */}
      {activeTab === 'analytics' && (() => {
        const { problemsPosted, problemsSolved, problemSolveRate, mentorAcceptanceRate, proposalConversionRate, repeatLearnerRate, avgMentorRating } = data.platformKpis;

        const funnelStages = [
          {
            stage: '1. Problems Posted',
            count: `${problemsPosted} challenges`,
            pct: 100,
            desc: 'Initiated by learners seeking code debugging',
            color: '#6366f1',
          },
          {
            stage: '2. Proposals Submitted',
            count: '584 proposals',
            pct: 95,
            desc: '1.87 mentor bids submitted per challenge',
            color: '#8b5cf6',
          },
          {
            stage: '3. Proposal Accepted & Booked',
            count: '284 bookings',
            pct: 91,
            desc: 'Learners matched and locked into escrow',
            color: '#0ea5e9',
          },
          {
            stage: '4. Successfully Solved',
            count: `${problemsSolved} solved`,
            pct: Math.round(problemSolveRate),
            desc: `${problemSolveRate}% full resolution rate`,
            color: '#10b981',
          },
          {
            stage: '5. Repeat Pairing Learners',
            count: `${Math.round(problemsSolved * (repeatLearnerRate / 100))} learners`,
            pct: Math.round(repeatLearnerRate),
            desc: `${repeatLearnerRate}% learners book 2+ encounters`,
            color: '#f59e0b',
          },
        ];

        const ratingDistribution = [
          { stars: 5, pct: 88, count: 227, color: '#f59e0b' },
          { stars: 4, pct: 9, count: 23, color: '#fbbf24' },
          { stars: 3, pct: 2, count: 5, color: '#94a3b8' },
          { stars: 2, pct: 0.7, count: 2, color: '#cbd5e1' },
          { stars: 1, pct: 0.3, count: 1, color: '#f87171' },
        ];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 4 Elevated Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
              {/* Problems Solved */}
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
                    Problems Solved
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
                    <CheckCircleIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                  {problemsSolved} <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink-muted)' }}>/ {problemsPosted}</span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  <strong style={{ color: 'var(--ink)' }}>{problemSolveRate}%</strong> platform resolution rate
                </div>
              </div>

              {/* Mentor Acceptance */}
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
                    Mentor Acceptance Rate
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
                    <MentorIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0ea5e9', lineHeight: 1 }}>
                  {mentorAcceptanceRate}%
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  Session invitations accepted within 15 min
                </div>
              </div>

              {/* Proposal Conversion */}
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
                    Proposal Conversion
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
                    <BarChartIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>
                  {proposalConversionRate}%
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  Mentor proposals accepted by learners
                </div>
              </div>

              {/* Repeat Learners */}
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
                    Repeat Learners
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
                    <RefreshIcon size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
                  {repeatLearnerRate}%
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '8px' }}>
                  Learners booking 2+ sessions within 60 days
                </div>
              </div>
            </div>

            {/* Side-by-Side: Conversion Funnel & 5-Star Rating Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
              {/* Conversion Funnel */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)', marginBottom: '4px' }}>
                  Platform Conversion Funnel
                </div>
                <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                  Step-by-step pipeline pass-through from problem post to repeat booking.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {funnelStages.map((stg) => (
                    <div key={stg.stage}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)' }}>{stg.stage}</span>
                          <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>({stg.count})</span>
                        </div>
                        <span
                          className="mono"
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: 'var(--bg)',
                            border: '1px solid var(--grid)',
                            color: stg.color,
                          }}
                        >
                          {stg.pct}%
                        </span>
                      </div>

                      {/* Visual Funnel Bar */}
                      <div style={{ height: '9px', background: 'var(--grid)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${stg.pct}%`,
                            height: '100%',
                            background: stg.color,
                            borderRadius: '5px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', marginTop: '3px' }}>
                        {stg.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Quality & Rating Distribution */}
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
                    Quality &amp; Trust Index
                  </div>
                  <div className="sub" style={{ fontSize: '12px', marginBottom: '16px' }}>
                    Aggregated learner ratings from verified session conclusions.
                  </div>

                  {/* Rating Header Hero */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '14px 16px',
                      background: 'rgba(245, 158, 11, 0.08)',
                      borderRadius: '12px',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontSize: '38px', lineHeight: 1, color: '#f59e0b' }}>★</div>
                    <div>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                        {avgMentorRating} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-muted)' }}>/ 5.0</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600, marginTop: '4px' }}>
                        Platform Mentor Satisfaction Score
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        Calculated across 258 verified pairing sessions
                      </div>
                    </div>
                  </div>

                  {/* Star Distribution Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ratingDistribution.map((item) => (
                      <div key={item.stars} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                        <span style={{ width: '45px', fontWeight: 600, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {item.stars} <span style={{ color: '#f59e0b' }}>★</span>
                        </span>

                        <div style={{ flex: 1, height: '7px', background: 'var(--grid)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${item.pct}%`,
                              height: '100%',
                              background: item.color,
                              borderRadius: '4px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>

                        <span className="mono" style={{ width: '40px', textAlign: 'right', fontWeight: 600, color: 'var(--ink)' }}>
                          {item.pct}%
                        </span>
                        <span style={{ width: '45px', textAlign: 'right', fontSize: '10.5px', color: 'var(--ink-muted)' }}>
                          ({item.count})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust Badges */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--grid)' }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '6px', background: 'var(--bg)', borderRadius: '6px', fontSize: '11px', color: 'var(--ink-muted)' }}>
                    🔒 Escrow Protected
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '6px', background: 'var(--bg)', borderRadius: '6px', fontSize: '11px', color: 'var(--ink-muted)' }}>
                    ✓ 100% Verified Reviews
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </PortalLayout>
  );
}
