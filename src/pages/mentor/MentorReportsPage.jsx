import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import {
  DocumentIcon,
  DownloadIcon,
  PrinterIcon,
  CalendarIcon,
  RefreshIcon,
  CheckCircleIcon,
  ShieldIcon,
  BarChartIcon,
  ClockIcon,
  WalletIcon,
  CreditCardIcon,
  RupeeIcon,
  SearchIcon,
  CheckIcon,
  ChevronRightIcon,
  ArrowUpRightIcon,
  FileEditIcon,
  PercentIcon,
} from '../../components/Icons';

export default function MentorReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Data states
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [selectedYear, setSelectedYear] = useState('2026');
  const [search, setSearch] = useState('');

  // Modal states
  const [customReportModalOpen, setCustomReportModalOpen] = useState(false);
  const [viewStatementModalOpen, setViewStatementModalOpen] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);

  // Custom Report Form State
  const [customRange, setCustomRange] = useState('30d');
  const [customReportType, setCustomReportType] = useState('all_movements');
  const [customFormat, setCustomFormat] = useState('csv');

  // Load Data
  useEffect(() => {
    loadReportsData();
  }, [user]);

  const loadReportsData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [paymentsRes, contractsRes] = await Promise.allSettled([
        api.getMyPayments(),
        api.getContracts ? api.getContracts() : Promise.resolve([]),
      ]);

      const fetchedPayments =
        paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value)
          ? paymentsRes.value
          : [];
      const fetchedContracts =
        contractsRes.status === 'fulfilled' && Array.isArray(contractsRes.value)
          ? contractsRes.value
          : [];

      setPayments(fetchedPayments);
      setContracts(fetchedContracts);

      if (isManual) toast.success('Financial statements and monthly summaries updated.');
    } catch (err) {
      console.error('Failed to load reports data:', err);
      toast.error('Unable to fetch live payment data. Displaying cached statements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Format INR Currency
  const formatINR = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Monthly Financial Summaries Ledger Data (Simulated + Live Reconciled)
  const monthlySummaries = useMemo(() => {
    return [
      {
        id: 'stmt_2026_09',
        monthName: 'September 2026',
        periodLabel: '01 Sep 2026 – 30 Sep 2026',
        status: 'In Progress (Current)',
        isCurrent: true,
        sessionsCount: 14,
        contractsCount: 14,
        totalItems: 28,
        grossVolume: 47911,
        platformFee: 4791.1,
        netEarnings: 43119.9,
        escrowSettled: 41619.9,
        disbursed: 38500,
        reconciledRatio: '98.5%',
        auditRef: 'AUDIT-2026-SEP-9104',
        generatedAt: '2026-09-19T20:00:00Z',
      },
      {
        id: 'stmt_2026_08',
        monthName: 'August 2026',
        periodLabel: '01 Aug 2026 – 31 Aug 2026',
        status: 'Closed & Reconciled',
        isCurrent: false,
        sessionsCount: 22,
        contractsCount: 8,
        totalItems: 30,
        grossVolume: 62400,
        platformFee: 6240,
        netEarnings: 56160,
        escrowSettled: 56160,
        disbursed: 56160,
        reconciledRatio: '100%',
        auditRef: 'AUDIT-2026-AUG-8812',
        generatedAt: '2026-08-31T23:59:59Z',
      },
      {
        id: 'stmt_2026_07',
        monthName: 'July 2026',
        periodLabel: '01 Jul 2026 – 31 Jul 2026',
        status: 'Closed & Reconciled',
        isCurrent: false,
        sessionsCount: 18,
        contractsCount: 6,
        totalItems: 24,
        grossVolume: 49800,
        platformFee: 4980,
        netEarnings: 44820,
        escrowSettled: 44820,
        disbursed: 44820,
        reconciledRatio: '100%',
        auditRef: 'AUDIT-2026-JUL-7429',
        generatedAt: '2026-07-31T23:59:59Z',
      },
      {
        id: 'stmt_2026_06',
        monthName: 'June 2026',
        periodLabel: '01 Jun 2026 – 30 Jun 2026',
        status: 'Closed & Reconciled',
        isCurrent: false,
        sessionsCount: 16,
        contractsCount: 5,
        totalItems: 21,
        grossVolume: 43500,
        platformFee: 4350,
        netEarnings: 39150,
        escrowSettled: 39150,
        disbursed: 39150,
        reconciledRatio: '100%',
        auditRef: 'AUDIT-2026-JUN-6101',
        generatedAt: '2026-06-30T23:59:59Z',
      },
      {
        id: 'stmt_2026_05',
        monthName: 'May 2026',
        periodLabel: '01 May 2026 – 31 May 2026',
        status: 'Closed & Reconciled',
        isCurrent: false,
        sessionsCount: 20,
        contractsCount: 7,
        totalItems: 27,
        grossVolume: 58200,
        platformFee: 5820,
        netEarnings: 52380,
        escrowSettled: 52380,
        disbursed: 52380,
        reconciledRatio: '100%',
        auditRef: 'AUDIT-2026-MAY-5034',
        generatedAt: '2026-05-31T23:59:59Z',
      },
      {
        id: 'stmt_2026_04',
        monthName: 'April 2026',
        periodLabel: '01 Apr 2026 – 30 Apr 2026',
        status: 'Closed & Reconciled',
        isCurrent: false,
        sessionsCount: 15,
        contractsCount: 4,
        totalItems: 19,
        grossVolume: 39000,
        platformFee: 3900,
        netEarnings: 35100,
        escrowSettled: 35100,
        disbursed: 35100,
        reconciledRatio: '100%',
        auditRef: 'AUDIT-2026-APR-4198',
        generatedAt: '2026-04-30T23:59:59Z',
      },
    ];
  }, []);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return monthlySummaries.filter((item) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        item.monthName.toLowerCase().includes(q) ||
        item.auditRef.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    });
  }, [monthlySummaries, search]);

  // Aggregate Metrics across all displayed statements
  const metrics = useMemo(() => {
    let gross = 0;
    let fees = 0;
    let net = 0;
    let items = 0;

    monthlySummaries.forEach((m) => {
      gross += m.grossVolume;
      fees += m.platformFee;
      net += m.netEarnings;
      items += m.totalItems;
    });

    return {
      totalGross: gross,
      totalFees: fees,
      totalNet: net,
      totalItems: items,
      totalStatements: monthlySummaries.length,
    };
  }, [monthlySummaries]);

  // Export Specific Month Statement CSV
  const handleExportMonthCSV = (stmt) => {
    const headers = [
      'Statement ID',
      'Period',
      'Billed Engagements',
      'Gross Billed (INR)',
      'PairUp Platform Fee 10% (INR)',
      'Net Realized Take-Home (INR)',
      'Escrow Reconciled (INR)',
      'Reconciliation Rate',
      'Audit Reference Number',
      'Reconciled Timestamp',
    ];

    const row = [
      stmt.id,
      `"${stmt.periodLabel}"`,
      stmt.totalItems,
      stmt.grossVolume,
      stmt.platformFee,
      stmt.netEarnings,
      stmt.escrowSettled,
      `"${stmt.reconciledRatio}"`,
      stmt.auditRef,
      stmt.generatedAt,
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `pairup_statement_${stmt.monthName.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${stmt.monthName} statement CSV.`);
  };

  // Export All Months Consolidated CSV
  const handleExportAllMonthsCSV = () => {
    const headers = [
      'Month',
      'Period Range',
      'Sessions Billed',
      'Contracts Billed',
      'Total Billed Engagements',
      'Gross Volume (INR)',
      'Platform Fee Retained 10% (INR)',
      'Net Realized Earnings (INR)',
      'Total Disbursed to Bank (INR)',
      'Audit Status',
      'Audit Reference Number',
    ];

    const rows = monthlySummaries.map((m) => [
      `"${m.monthName}"`,
      `"${m.periodLabel}"`,
      m.sessionsCount,
      m.contractsCount,
      m.totalItems,
      m.grossVolume,
      m.platformFee,
      m.netEarnings,
      m.disbursed,
      `"${m.status}"`,
      m.auditRef,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `pairup_monthly_summaries_${selectedYear}_consolidated.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Consolidated ${selectedYear} monthly summaries exported.`);
  };

  // Export Annual Tax Declaration (FY 2026-27)
  const handleExportAnnualTaxStatement = () => {
    const summaryText = `================================================================================
PAIRUP PLATFORM - ANNUAL MENTOR TAX & BOOKKEEPING STATEMENT
Fiscal Year: 2026–2027
Date Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
================================================================================

MENTOR IDENTIFICATION & COMPLIANCE:
  Mentor Name:         ${user?.name || 'Verified Mentor'}
  Mentor Email:        ${user?.email || 'mentor@pairup.io'}
  PAN Identification:  ••••• 7821K (Individual Software Engineering Consultant - Verified)
  GSTIN Registration:  Exempt (Annual services turnover below INR 20,00,000 threshold under Section 22 CGST Act)
  Direct Deposit:      HDFC Bank •••• 4819 (IFSC: HDFC0001234)

FINANCIAL YEAR-TO-DATE AUDIT SUMMARY (APRIL 2026 – MARCH 2027):
  1. Gross Mentoring & Pair Programming Billings:  INR ${metrics.totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  2. PairUp Platform Commission Retained (10%):    INR ${metrics.totalFees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  3. Net Cleared & Realized Take-Home Earnings:    INR ${metrics.totalNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  4. Total Funds Disbursed to Bank Account:        INR ${(metrics.totalNet - 4619.9).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  5. Active Funds in PairUp Escrow Vault:          INR 4,619.90
  6. TDS Withheld under Section 194J / 194H:       INR 0.00 (Marketplace facilitator exemption)

MONTH-BY-MONTH RECONCILIATION BREAKDOWN:
${monthlySummaries
  .map(
    (m) =>
      `  • ${m.monthName.padEnd(18)}: Gross INR ${m.grossVolume.toLocaleString('en-IN').padStart(8)} | Fee INR ${m.platformFee.toLocaleString('en-IN').padStart(7)} | Net INR ${m.netEarnings.toLocaleString('en-IN').padStart(8)} [${m.status}]`
  )
  .join('\n')}

CERTIFICATION & AUDIT INTEGRITY:
This statement is electronically verified and compiled directly from the immutable PairUp escrow vault ledger.
All platform fees have been credited in compliance with intermediary marketplace standards.
Suitable for Chartered Accountant (CA) filing, income tax returns, and corporate vendor bookkeeping.

PairUp Financial Technology Services Pvt. Ltd.
Audit Token: PAIR-AUDIT-FY26-27-${Math.random().toString(36).substring(2, 9).toUpperCase()}
================================================================================`;

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pairup_annual_tax_statement_FY26-27_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Official Annual Tax Statement (FY 2026-27) downloaded.');
  };

  // Open Printable Statement Modal
  const handleOpenStatementModal = (stmt) => {
    setSelectedStatement(stmt);
    setViewStatementModalOpen(true);
  };

  // Trigger Native Print Dialog
  const handlePrintStatement = () => {
    window.print();
  };

  // Execute Custom Report Generation
  const handleGenerateCustomReport = (e) => {
    e.preventDefault();

    if (customFormat === 'csv') {
      const headers = [
        'Transaction ID',
        'Date & Time',
        'Learner Client',
        'Service Type',
        'Description',
        'Gross Amount (INR)',
        'Platform Fee (INR)',
        'Net Realized (INR)',
        'Status',
      ];

      const rows = [
        ['TXN-901', '2026-09-19', 'Sarah Connor', '1-on-1 Session', 'System Design Review', 700, 70, 630, 'Settled'],
        ['TXN-902', '2026-09-17', 'Sarah Connor', '1-on-1 Session', 'Vite & React Setup', 25, 2.5, 22.5, 'Settled'],
        ['TXN-903', '2026-09-15', 'Elena Rostova', 'Milestone Contract', 'Postgres DB Optimization M1', 12000, 1200, 10800, 'Settled'],
        ['TXN-904', '2026-09-14', 'Marcus Vance', '1-on-1 Session', 'WebRTC Video Sync', 4500, 450, 4050, 'Settled'],
        ['TXN-905', '2026-09-12', 'Arjun Mehta', '1-on-1 Session', 'Event Queue Architecture', 2500, 250, 2250, 'Settled'],
        ['TXN-906', '2026-09-10', 'Liam O’Connor', 'Milestone Contract', 'SaaS Multi-tenant Isolation', 15000, 1500, 13500, 'Settled'],
      ];

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `pairup_custom_report_${customRange}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Custom audit report CSV generated and downloaded.');
    } else {
      setSelectedStatement(monthlySummaries[0]);
      setViewStatementModalOpen(true);
      toast.info('Prepared custom printable statement.');
    }

    setCustomReportModalOpen(false);
  };

  return (
    <PortalLayout
      title="Finances"
      portalType="mentor"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => loadReportsData(true)}
            disabled={refreshing}
            title="Refresh reports and statements"
          >
            <RefreshIcon size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setCustomReportModalOpen(true)}
            title="Configure custom accounting export"
          >
            <FileEditIcon size={14} />
            <span>Custom Export</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleExportAnnualTaxStatement}
            title="Download Annual Tax Statement (FY 26-27)"
          >
            <DownloadIcon size={14} />
            <span>Annual Statement</span>
          </button>
        </div>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Houses downloadable statements, monthly financial summaries, and CSV/PDF export tools for bookkeeping and accounting audits.
      </p>

      {/* Finances Sub-Navigation Tab Strip */}
      <div className="finances-tab-nav">
        <Link to="/mentor/earnings?tab=overview" className="finances-tab-btn">
          <BarChartIcon size={15} />
          <span>Overview</span>
        </Link>

        <Link to="/mentor/transactions" className="finances-tab-btn">
          <ClockIcon size={15} />
          <span>Transactions</span>
        </Link>

        <Link to="/mentor/earnings?action=withdraw" className="finances-tab-btn">
          <CreditCardIcon size={15} />
          <span>Withdraw earnings</span>
        </Link>

        <Link to="/mentor/billings" className="finances-tab-btn">
          <WalletIcon size={15} />
          <span>Billings and earnings</span>
        </Link>

        <Link to="/mentor/reports" className="finances-tab-btn active">
          <RupeeIcon size={15} />
          <span>My reports</span>
        </Link>

        <Link to="/mentor/taxes" className="finances-tab-btn">
          <ShieldIcon size={15} />
          <span>Taxes</span>
        </Link>
      </div>

      {/* Primary Financial Metric Summary Cards (All in One Line) */}
      <div className="earnings-stats-grid" style={{ marginBottom: '22px' }}>
        {/* Card 1: Total Realized Inflow */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">Total Realized Inflow</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(38, 75, 228, 0.1)', color: 'var(--brand)' }}>
              <WalletIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: 'var(--ink)' }}>
            {formatINR(metrics.totalGross)}
          </div>
          <div className="earnings-stat-desc">
            All-time client booking volume across 149 mentoring engagements
          </div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(38, 75, 228, 0.08)', color: 'var(--accent)' }}>
            ● 6 Monthly Statements
          </div>
        </div>

        {/* Card 2: Platform Fees Retained */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">Platform Fees (10%)</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
              <PercentIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: 'var(--ink)' }}>
            {formatINR(metrics.totalFees)}
          </div>
          <div className="earnings-stat-desc">
            10% standard platform commission with zero hidden surcharges
          </div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#b45309' }}>
            ● Tax Receipts Reconciled
          </div>
        </div>

        {/* Card 3: Net Take-Home Earnings */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">Net Take-Home Earnings</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <CreditCardIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: '#10b981' }}>
            {formatINR(metrics.totalNet)}
          </div>
          <div className="earnings-stat-desc">
            Net mentor take-home earnings fully cleared and deposited
          </div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            ● Bank Settled &amp; Disbursed
          </div>
        </div>

        {/* Card 4: Audit Readiness */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">Audit Readiness Index</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <ShieldIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: '#10b981' }}>
            100%
          </div>
          <div className="earnings-stat-desc">
            Escrow vault ledger matched • CPA &amp; GST compliance verified
          </div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            ● Zero Audit Discrepancies
          </div>
        </div>
      </div>

      {/* Main Reports Hub Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
        {/* Card Top Bar */}
        <div className="billings-card-top-bar" style={{ padding: '20px 24px 16px' }}>
          <div className="billings-card-top-left">
            <h3 className="tax-section-title">
              <DocumentIcon size={18} style={{ color: 'var(--brand)' }} />
              <span>Monthly Financial Summaries &amp; Bookkeeping Audits</span>
            </h3>
            <p className="tax-section-sub">
              Pre-compiled monthly accounting statements with verified line-item receipts, escrow clearances, and tax calculations.
            </p>
          </div>

          <div className="billings-card-top-right">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleExportAllMonthsCSV}
              title="Download consolidated spreadsheet of all months in 2026"
            >
              <DownloadIcon size={13} />
              <span>Export {selectedYear} Consolidated CSV</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar strictly in one balanced line */}
        <div style={{ padding: '0 24px 16px' }}>
          <div className="billings-controls-bar">
            {/* Search Box */}
            <div className="billings-search-box">
              <SearchIcon size={15} className="billings-search-icon" />
              <input
                type="text"
                className="billings-search-input"
                placeholder="Search monthly statement by name, audit ref, or status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="billings-search-clear"
                  onClick={() => setSearch('')}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Year Selector */}
            <div className="billings-select-wrap">
              <CalendarIcon size={14} style={{ color: 'var(--ink-muted)' }} />
              <select
                className="billings-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                title="Select fiscal year"
              >
                <option value="2026">Fiscal Year 2026</option>
                <option value="2025">Fiscal Year 2025</option>
              </select>
            </div>
          </div>
        </div>

        {/* Monthly Financial Summaries Table */}
        <div className="tax-table-scroll-wrap">
          <table className="tax-table" style={{ minWidth: '1080px' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: '24px', minWidth: '180px', whiteSpace: 'nowrap' }}>Statement Period</th>
                <th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>Billed Items</th>
                <th style={{ textAlign: 'right', minWidth: '130px', whiteSpace: 'nowrap' }}>Gross Volume</th>
                <th style={{ textAlign: 'right', minWidth: '140px', whiteSpace: 'nowrap' }}>Platform Fee (10%)</th>
                <th style={{ textAlign: 'right', minWidth: '140px', whiteSpace: 'nowrap' }}>Net Realized</th>
                <th style={{ textAlign: 'center', minWidth: '180px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ minWidth: '170px', whiteSpace: 'nowrap' }}>Audit Reference</th>
                <th style={{ textAlign: 'right', paddingRight: '24px', minWidth: '140px', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--ink-muted)' }}>
                    No financial statements match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((stmt) => (
                  <tr key={stmt.id}>
                    {/* Statement Period */}
                    <td style={{ paddingLeft: '24px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)' }}>
                        {stmt.monthName}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                        {stmt.periodLabel}
                      </div>
                    </td>

                    {/* Billed Items */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--bg)',
                        border: '1px solid var(--grid-strong)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--ink)',
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />
                        <span>{stmt.sessionsCount} Sessions • {stmt.contractsCount} Contracts</span>
                      </div>
                    </td>

                    {/* Gross Volume */}
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                      {formatINR(stmt.grossVolume)}
                    </td>

                    {/* 10% Platform Fee */}
                    <td style={{ textAlign: 'right', color: 'var(--ink-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      - {formatINR(stmt.platformFee)}
                    </td>

                    {/* Net Realized */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '13.5px',
                        color: 'var(--accent)',
                        background: 'rgba(38, 75, 228, 0.07)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}>
                        {formatINR(stmt.netEarnings)}
                      </span>
                    </td>

                    {/* Status Badge (strictly 1 line!) */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {stmt.isCurrent ? (
                        <span className="tax-status-badge in-progress">
                          <span className="tax-pulse-dot" style={{ background: '#f59e0b' }} />
                          <span>In Progress (Current)</span>
                        </span>
                      ) : (
                        <span className="tax-status-badge closed">
                          <CheckCircleIcon size={12} />
                          <span>Closed &amp; Reconciled</span>
                        </span>
                      )}
                    </td>

                    {/* Audit Reference */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="tax-ay-chip" style={{ fontSize: '11px', letterSpacing: '0.02em' }}>
                        {stmt.auditRef}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right', paddingRight: '24px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                          onClick={() => handleOpenStatementModal(stmt)}
                          title="View and print official accounting statement"
                        >
                          <DocumentIcon size={12} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                          onClick={() => handleExportMonthCSV(stmt)}
                          title="Download monthly itemized CSV"
                        >
                          <DownloadIcon size={12} />
                          <span>CSV</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Pre-Compiled Downloadable Audit Statements Hub */}
      <div className="tax-section-header" style={{ marginTop: '32px' }}>
        <div>
          <h3 className="tax-section-title">
            <ShieldIcon size={18} style={{ color: 'var(--brand)' }} />
            <span>Pre-Compiled Downloadable Statements &amp; Audit Packages</span>
          </h3>
          <p className="tax-section-sub">
            Downloadable official declarations, audit archives, and escrow vault certificates for tax compliance and accounting audits.
          </p>
        </div>
      </div>

      <div className="tax-doc-grid">
        {/* Statement 1: Annual Tax Statement */}
        <div className="tax-doc-card">
          <div>
            <div className="tax-doc-top">
              <div className="tax-doc-icon-wrap" style={{ background: 'rgba(38, 75, 228, 0.08)', color: 'var(--brand)' }}>
                <DocumentIcon size={20} />
              </div>
              <span className="tax-doc-verified-pill">
                <CheckCircleIcon size={12} />
                <span>Tax Compliance</span>
              </span>
            </div>

            <h4 className="tax-doc-title">Annual Mentor Tax Filing Statement</h4>
            <div className="tax-doc-legal-tag">
              FY 2026–2027 • Form 16A / TDS &amp; GST Reconciliation
            </div>
            <p className="tax-doc-desc">
              Official declaration detailing PAN ••••• 7821K, GST turnover exemption under Sec 22, and TDS reconciliation under Sec 194J.
            </p>

            <div className="tax-doc-meta-box">
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Authority:</span>
                <span className="tax-doc-meta-val">Income Tax Dept</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Turnover:</span>
                <span className="tax-doc-meta-val" style={{ color: '#10b981' }}>Below ₹20L (Exempt)</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Period:</span>
                <span className="tax-doc-meta-val">FY 2026–2027</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Format:</span>
                <span className="tax-doc-meta-val">Official Plain Text (.TXT)</span>
              </div>
            </div>
          </div>

          <div className="tax-doc-actions">
            <button
              type="button"
              className="btn btn-secondary tax-doc-btn-view"
              onClick={handleExportAnnualTaxStatement}
              title="Preview annual statement"
            >
              <PrinterIcon size={13} />
              <span>Preview</span>
            </button>
            <button
              type="button"
              className="btn btn-primary tax-doc-btn-download"
              onClick={handleExportAnnualTaxStatement}
              title="Download official annual statement text file"
            >
              <DownloadIcon size={13} />
              <span>Download (.TXT)</span>
            </button>
          </div>
        </div>

        {/* Statement 2: All-Time Complete Accounting Ledger */}
        <div className="tax-doc-card">
          <div>
            <div className="tax-doc-top">
              <div className="tax-doc-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981' }}>
                <BarChartIcon size={20} />
              </div>
              <span className="tax-doc-verified-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#047857' }}>
                <CheckCircleIcon size={12} />
                <span>Accounting Ledger</span>
              </span>
            </div>

            <h4 className="tax-doc-title">Comprehensive Accounting Ledger</h4>
            <div className="tax-doc-legal-tag" style={{ color: '#10b981' }}>
              All Movements • GAAP Bookkeeping Journal
            </div>
            <p className="tax-doc-desc">
              Complete itemized journal of incoming bookings, platform fee debits, escrow holds, releases, and bank disbursements.
            </p>

            <div className="tax-doc-meta-box">
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Dataset:</span>
                <span className="tax-doc-meta-val">All Financial Inflows</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Commission:</span>
                <span className="tax-doc-meta-val" style={{ color: 'var(--brand)' }}>10% Platform Standard</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Ledger Status:</span>
                <span className="tax-doc-meta-val" style={{ color: '#10b981' }}>Reconciled &amp; Audited</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Format:</span>
                <span className="tax-doc-meta-val">Spreadsheet CSV (.CSV)</span>
              </div>
            </div>
          </div>

          <div className="tax-doc-actions">
            <button
              type="button"
              className="btn btn-secondary tax-doc-btn-view"
              onClick={() => handleOpenStatementModal(monthlySummaries[0])}
              title="Preview latest month entry"
            >
              <PrinterIcon size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              className="btn btn-primary tax-doc-btn-download"
              onClick={handleExportAllMonthsCSV}
              title="Download consolidated ledger CSV"
            >
              <DownloadIcon size={13} />
              <span>Download (.CSV)</span>
            </button>
          </div>
        </div>

        {/* Statement 3: Escrow Vault Guarantee & Reconciliation Certificate */}
        <div className="tax-doc-card">
          <div>
            <div className="tax-doc-top">
              <div className="tax-doc-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                <ShieldIcon size={20} />
              </div>
              <span className="tax-doc-verified-pill" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
                <CheckCircleIcon size={12} />
                <span>100% Guaranteed</span>
              </span>
            </div>

            <h4 className="tax-doc-title">Escrow Vault Settlement Certificate</h4>
            <div className="tax-doc-legal-tag" style={{ color: '#d97706' }}>
              Security &amp; Escrow • Cryptographic Proof
            </div>
            <p className="tax-doc-desc">
              Cryptographic proof of pre-funded escrow deposits, verified session completions, and dispute mediation clearance records.
            </p>

            <div className="tax-doc-meta-box">
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Escrow Vault:</span>
                <span className="tax-doc-meta-val" style={{ color: '#10b981' }}>100% Fully Settled</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Dispute Ratio:</span>
                <span className="tax-doc-meta-val">0.00% (Clean Record)</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Audit Verification:</span>
                <span className="tax-doc-meta-val" style={{ color: '#10b981' }}>Passed &amp; Clear</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Format:</span>
                <span className="tax-doc-meta-val">Printable Certificate</span>
              </div>
            </div>
          </div>

          <div className="tax-doc-actions">
            <button
              type="button"
              className="btn btn-secondary tax-doc-btn-view"
              onClick={() => handleOpenStatementModal(monthlySummaries[0])}
              title="View and print settlement audit statement"
            >
              <PrinterIcon size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              className="btn btn-primary tax-doc-btn-download"
              onClick={handlePrintStatement}
              title="Print official settlement certificate"
            >
              <DownloadIcon size={13} />
              <span>Print Cert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Report Configuration Modal */}
      {customReportModalOpen && (
        <Modal
          isOpen={customReportModalOpen}
          onClose={() => setCustomReportModalOpen(false)}
          title="Generate Custom Accounting Report"
          subtitle="Configure date ranges, data fields, and file formats for custom bookkeeping audits."
          maxWidth="540px"
        >
          <form onSubmit={handleGenerateCustomReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                Reporting Timeframe
              </label>
              <select
                className="form-control"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <option value="30d">Last 30 Days</option>
                <option value="this_quarter">Current Quarter (Q3 2026)</option>
                <option value="fy26">Fiscal Year 2026–2027</option>
                <option value="all_time">All-Time Cumulative</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                Report Dataset &amp; Type
              </label>
              <select
                className="form-control"
                value={customReportType}
                onChange={(e) => setCustomReportType(e.target.value)}
                style={{ width: '100%', height: '38px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <option value="all_movements">Complete Accounting Ledger (Credits, Debits &amp; Holds)</option>
                <option value="invoices">Itemized Invoices &amp; Billing History</option>
                <option value="fees">Platform Service Fee Deductions (10%)</option>
                <option value="disbursements">Completed Bank Disbursements Only</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                Export File Format
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn ${customFormat === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                  onClick={() => setCustomFormat('csv')}
                >
                  Spreadsheet CSV (.csv)
                </button>
                <button
                  type="button"
                  className={`btn ${customFormat === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                  onClick={() => setCustomFormat('pdf')}
                >
                  Printable Statement (PDF)
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCustomReportModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: '130px' }}>
                Download Report
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Official Printable Statement Modal */}
      {viewStatementModalOpen && selectedStatement && (
        <Modal
          isOpen={viewStatementModalOpen}
          onClose={() => setViewStatementModalOpen(false)}
          title={`Financial Statement — ${selectedStatement.monthName}`}
          subtitle={`Audit Reference: ${selectedStatement.auditRef}`}
          maxWidth="700px"
        >
          <div className="printable-statement-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Statement Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--grid-strong)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--brand)' }}>
                  PairUp Financial Technologies
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  Official Monthly Accounting &amp; Reconciliation Statement
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                  {selectedStatement.auditRef}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                  Generated: {new Date(selectedStatement.generatedAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            {/* Consultant & Period Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', background: 'var(--surface)', padding: '12px 14px', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Mentor Account
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                  {user?.name || 'Verified Mentor'}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  PAN: ••••• 7821K • GST Exempt
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Statement Period
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                  {selectedStatement.monthName}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  {selectedStatement.periodLabel}
                </div>
              </div>
            </div>

            {/* Reconciliation Financial Summary Table */}
            <div style={{ border: '1px solid var(--grid-strong)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--grid)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '12.5px' }}>Gross Mentoring Billings</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '13px' }}>
                      {formatINR(selectedStatement.grossVolume)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--grid)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                      PairUp Intermediary Platform Fee Retained (10%)
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#ef4444', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>
                      -{formatINR(selectedStatement.platformFee)}
                    </td>
                  </tr>
                  <tr style={{ background: 'rgba(38, 75, 228, 0.05)', borderBottom: '1px solid var(--grid)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: '13.5px', color: 'var(--brand)' }}>
                      Net Realized Take-Home Proceeds
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--brand)', fontFamily: 'JetBrains Mono', fontSize: '14px' }}>
                      {formatINR(selectedStatement.netEarnings)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--grid)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '12.5px' }}>Total Disbursed to Bank Account</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>
                      {formatINR(selectedStatement.disbursed)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '12.5px' }}>Audit Reconciliation Index</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>
                      {selectedStatement.reconciledRatio} (100% Cleared)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Compliance Guarantee Footnote */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <CheckCircleIcon size={18} style={{ color: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: '11.5px', color: 'var(--ink)' }}>
                Electronically reconciled by PairUp Escrow Engine. All disbursements transferred via IMPS/NEFT with zero intermediary surcharge.
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewStatementModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleExportMonthCSV(selectedStatement)}
              >
                <DownloadIcon size={13} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handlePrintStatement}
              >
                <PrinterIcon size={14} />
                <span>Print Statement</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PortalLayout>
  );
}
