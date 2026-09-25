import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import {
  ShieldIcon,
  DocumentIcon,
  DownloadIcon,
  PrinterIcon,
  CheckCircleIcon,
  UserIcon,
  FileEditIcon,
  EyeIcon,
  EyeOffIcon,
  BarChartIcon,
  ClockIcon,
  CreditCardIcon,
  WalletIcon,
  RupeeIcon,
} from '../../components/Icons';

export default function MentorTaxesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Mask / Unmask PAN state
  const [showPan, setShowPan] = useState(false);

  // Modals state
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [selectedStatementYear, setSelectedStatementYear] = useState('FY 2026–2027');
  const [docPreviewModalOpen, setDocPreviewModalOpen] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState(null);

  // Taxpayer Profile State (persisted in localStorage)
  const defaultTaxProfile = {
    legalName: user?.name || 'Alex Rivera',
    citizenship: 'India',
    taxResidency: 'India',
    panNumber: 'ABCDE7821K',
    taxFormType: 'W-8BEN',
    gstStatus: 'exempt',
    gstin: '',
    address: '104 Tech Corridor, Indiranagar, Bengaluru, KA 560038, India',
    digitalSignature: user?.name || 'Alex Rivera',
    verifiedDate: '2026-04-05',
    treatyArticleClaimed: 'Article 12 (0% Royalty & Tech Services Rate)',
  };

  const [taxProfile, setTaxProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(`pairup_mentor_tax_profile_${user?.id || 'demo'}`);
      return saved ? { ...defaultTaxProfile, ...JSON.parse(saved) } : defaultTaxProfile;
    } catch {
      return defaultTaxProfile;
    }
  });

  // Annual Tax Summary Statements Data
  const taxStatements = useMemo(() => [
    {
      fiscalYear: 'FY 2026–2027',
      period: '01 Apr 2026 – 31 Mar 2027',
      assessmentYear: 'AY 2027–2028',
      grossBillings: 47911.0,
      platformFee: 4791.1,
      netTaxable: 43119.9,
      tdsWithheld: 0.0,
      status: 'In Progress • Current FY',
      isCurrent: true,
      readyToDownload: true,
      sessionsCount: 38,
      contractsCount: 6,
    },
    {
      fiscalYear: 'FY 2025–2026',
      period: '01 Apr 2025 – 31 Mar 2026',
      assessmentYear: 'AY 2026–2027',
      grossBillings: 252900.0,
      platformFee: 25290.0,
      netTaxable: 227610.0,
      tdsWithheld: 0.0,
      status: 'Closed & Reconciled',
      isCurrent: false,
      readyToDownload: true,
      sessionsCount: 164,
      contractsCount: 22,
    },
  ], []);

  // Format Currency
  const formatINR = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Masked PAN helper
  const displayPan = showPan
    ? taxProfile.panNumber
    : taxProfile.panNumber.replace(/^.{5}/, '••••• ');

  // Save Tax Profile
  const handleSaveTaxProfile = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem(`pairup_mentor_tax_profile_${user?.id || 'demo'}`, JSON.stringify(taxProfile));
      toast.success('Taxpayer identification & documentation updated successfully.');
      setTaxModalOpen(false);
    } catch (err) {
      toast.error('Failed to save tax details.');
    }
  };

  // Download Annual Statement (.TXT)
  const handleDownloadTaxStatement = (stmt) => {
    const summaryText = `================================================================================
PAIRUP MENTOR ANNUAL TAX AUDIT STATEMENT
Assessment Year: ${stmt.assessmentYear} | Fiscal Period: ${stmt.fiscalYear}
Generated on: ${new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
================================================================================

TAXPAYER IDENTIFICATION DETAILS:
  Legal Full Name:     ${taxProfile.legalName}
  Registered Email:    ${user?.email || 'mentor@pairup.io'}
  PAN / Tax ID:        ${taxProfile.panNumber} (Income Tax Dept India - Verified)
  Tax Residency:       ${taxProfile.taxResidency}
  Classification Form: Form ${taxProfile.taxFormType} (Certificate of Foreign Status)
  GSTIN Status:        ${taxProfile.gstStatus === 'exempt' ? 'Exempt (Turnover under INR 20,00,000 threshold under Section 22 CGST Act)' : taxProfile.gstin}
  DTAA Treaty Relief:  ${taxProfile.treatyArticleClaimed}

FINANCIAL YEAR-TO-DATE RECONCILIATION:
  Gross Mentoring & Consulting Billings:    INR ${stmt.grossBillings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  PairUp Platform Fee Retained (10%):       INR ${stmt.platformFee.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  Net Taxable Realized Income:              INR ${stmt.netTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
  TDS Withheld under Section 194J / 194H:   INR ${stmt.tdsWithheld.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (0.00% Zero-Rate Marketplace Model)
  Total Completed Engagements:              ${stmt.sessionsCount} Sessions, ${stmt.contractsCount} Milestone Contracts
  Statement Audit Status:                   ${stmt.status}

CERTIFICATION & STATUTORY INTEGRITY:
This statement is electronically certified and compiled directly from the immutable
PairUp escrow ledger. Suitable for Chartered Accountant (CA) filing, Indian Income Tax
Returns (ITR-3 / ITR-4), and international compliance audits.

PairUp Financial Technology Services Pvt. Ltd.
Audit Token: PAIR-TAX-AUDIT-${Math.random().toString(36).substring(2, 9).toUpperCase()}
================================================================================`;

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pairup_annual_tax_statement_${stmt.fiscalYear.replace(/[–\s]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${stmt.fiscalYear} Annual Tax Statement.`);
  };

  // Download Electronic Form W-8BEN
  const handleDownloadFormW8 = () => {
    const text = `================================================================================
FORM W-8BEN (ELECTRONIC CERTIFICATE OF FOREIGN STATUS OF BENEFICIAL OWNER)
United States Internal Revenue Service (IRS) Compliance Copy
================================================================================

Part I - Identification of Beneficial Owner:
1. Name of individual:              ${taxProfile.legalName}
2. Country of citizenship:          ${taxProfile.citizenship}
3. Permanent residence address:     ${taxProfile.address}
4. Mailing address:                 Same as permanent address
5. U.S. taxpayer ID (SSN / ITIN):   Not Applicable
6. Foreign tax identifying number:  ${taxProfile.panNumber} (India PAN)

Part II - Claim of Tax Treaty Benefits (Chapter 3 Purposes):
9. I certify that the beneficial owner is a resident of India within the meaning
   of the income tax treaty between the United States and India.
10. Special rates and conditions: The beneficial owner is claiming the provisions
    of Article 12 of the treaty to claim a 0% rate of withholding on technical
    consultancy, peer code review, and software architecture services.

Part III - Certification:
Under penalties of perjury, I declare that I have examined the information on this form
and to the best of my knowledge and belief it is true, correct, and complete.

Electronic Signature: ${taxProfile.digitalSignature}
Certification Date:   ${taxProfile.verifiedDate}
IRS Compliance Token: PAIR-W8BEN-IRS-AUTH-${Math.random().toString(36).substring(2, 9).toUpperCase()}
================================================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pairup_form_w8ben_${taxProfile.legalName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Form W-8BEN electronic certificate downloaded.');
  };

  // Download GST Exemption Declaration
  const handleDownloadGstDeclaration = () => {
    const text = `================================================================================
STATUTORY DECLARATION UNDER SECTION 22 OF CGST ACT, 2017
GST Exemption Confirmation for Independent Consultants
================================================================================

DECLARANT DETAILS:
  Full Legal Name:    ${taxProfile.legalName}
  PAN / Tax ID:       ${taxProfile.panNumber}
  Place of Business:  ${taxProfile.address}
  Nature of Activity: Independent Mentoring, Code Review & Software Consultation

DECLARATION:
1. I hereby confirm that my aggregate annual turnover from mentoring, code reviews,
   and allied professional consultancy services provided through the PairUp platform
   is within the statutory threshold limit of INR 20,00,000 (Twenty Lakh Rupees)
   under Section 22(1) of the Central Goods and Services Tax (CGST) Act, 2017.
2. In accordance with the provisions of the GST law, I am not mandatorily required
   to obtain GST registration.
3. In the event my aggregate annual turnover exceeds the statutory threshold limit,
   I undertake to promptly obtain GST registration and update my GSTIN on the PairUp platform.

Declared by: ${taxProfile.digitalSignature}
Date:        ${taxProfile.verifiedDate}
Audit Token: PAIR-GST-EXEMPT-${Math.random().toString(36).substring(2, 9).toUpperCase()}
================================================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pairup_gst_exemption_declaration_${taxProfile.legalName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('GST Exemption Declaration downloaded.');
  };

  // Download TDS Clearance
  const handleDownloadTdsClearance = () => {
    const text = `================================================================================
TDS CLEARANCE & ZERO-WITHHOLDING RECONCILIATION CERTIFICATE
Section 194J / 194H Marketplace Intermediary Facilitator Model
================================================================================

BENEFICIARY DETAILS:
  Name of Consultant:  ${taxProfile.legalName}
  PAN Identifier:      ${taxProfile.panNumber} (Income Tax Dept India - Verified)
  Fiscal Period:       FY 2026–2027 (Assessment Year 2027–2028)
  Facilitator:         PairUp Financial Technology Services Pvt. Ltd.

RECONCILIATION CONFIRMATION:
1. PairUp functions strictly as a peer-to-peer marketplace intermediary and escrow
   facilitator between client learners and independent technical mentors.
2. In accordance with Section 194J/194H intermediary reconciliation guidelines,
   100% of realized net earnings (gross billings less 10% platform facilitation fee)
   are disbursed directly to the consultant without intermediary TDS deduction.
3. Total TDS Deducted by Facilitator: INR 0.00 (Zero Rupees).
4. Full gross and net earnings have been reported to the consultant for inclusion in
   their respective personal income tax filings (ITR).

Authorized Signatory: PairUp Intermediary Escrow Vault
Date:                 ${new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
Clearance Token:      PAIR-TDS-ZERO-${Math.random().toString(36).substring(2, 9).toUpperCase()}
================================================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pairup_tds_zero_clearance_${taxProfile.legalName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('TDS Zero-Withholding Certificate downloaded.');
  };

  // Open Document Preview Modal
  const handleOpenDocPreview = (type) => {
    if (type === 'w8') {
      setSelectedDocPreview({
        title: 'Form W-8BEN (Certificate of Foreign Status)',
        subtitle: 'IRS Compliance Record • Claim of Tax Treaty Benefits (Article 12)',
        content: `FORM W-8BEN (ELECTRONIC CERTIFICATE OF FOREIGN STATUS)
Internal Revenue Service (IRS), United States

Beneficial Owner: ${taxProfile.legalName}
Citizenship / Residency: ${taxProfile.citizenship}
Foreign Tax Identification: ${taxProfile.panNumber} (India PAN)
Permanent Address: ${taxProfile.address}

Treaty Benefits:
Resident of India claiming Article 12 provisions of US-India Income Tax Treaty.
Withholding Rate on Technical Services: 0.00% (Full Treaty Relief).

Electronic Signature: ${taxProfile.digitalSignature}
Certified Date: ${taxProfile.verifiedDate}`,
        onDownload: handleDownloadFormW8,
        downloadLabel: 'Download Form W-8BEN (.TXT)',
      });
    } else if (type === 'gst') {
      setSelectedDocPreview({
        title: 'GST Exemption Declaration',
        subtitle: 'Section 22 CGST Act • Turnover Under ₹20 Lakhs Threshold',
        content: `STATUTORY GST EXEMPTION DECLARATION
Central Goods and Services Tax (CGST) Act, 2017

Consultant Name: ${taxProfile.legalName}
PAN: ${taxProfile.panNumber}
Principal Place of Activity: ${taxProfile.address}

Statutory Exemption Details:
Annual aggregate turnover from technical mentorship and code consulting
remains within the threshold limit of INR 20,00,000 under Section 22(1).
GST registration is not required at current volume levels.

Declared by: ${taxProfile.digitalSignature}
Effective Date: ${taxProfile.verifiedDate}`,
        onDownload: handleDownloadGstDeclaration,
        downloadLabel: 'Download Declaration (.TXT)',
      });
    } else if (type === 'tds') {
      setSelectedDocPreview({
        title: 'TDS Zero-Withholding Certificate',
        subtitle: 'Section 194J / 194H Intermediary Marketplace Clearance',
        content: `TDS ZERO-WITHHOLDING RECONCILIATION CERTIFICATE
PairUp Intermediary Escrow Vault & Financial Technology Services

Beneficiary: ${taxProfile.legalName}
PAN Identifier: ${taxProfile.panNumber}
Assessment Year: 2027–2028 (FY 2026–2027)

Intermediary Clearance:
PairUp operates as an intermediary escrow facilitator. 100% of realized
net earnings are disbursed to the consultant with zero TDS deduction.
TDS Withheld: INR 0.00 (Zero Rate Intermediary Model).

Verified by: PairUp Compliance Intermediary`,
        onDownload: handleDownloadTdsClearance,
        downloadLabel: 'Download Certificate (.TXT)',
      });
    }
    setDocPreviewModalOpen(true);
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
            onClick={() => setTaxModalOpen(true)}
            title="Update tax documentation and identification"
          >
            <FileEditIcon size={14} />
            <span>Update Tax Details</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => handleDownloadTaxStatement(taxStatements[0])}
            title="Download Annual Tax Statement (FY 26-27)"
          >
            <DownloadIcon size={14} />
            <span>Download Annual Statement</span>
          </button>
        </div>
      }
    >
      <p className="sub" style={{ marginBottom: '16px' }}>
        Manages tax documentation, taxpayer identification details (such as W-8BEN/W-9 or local equivalents), and annual tax summary statements.
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

        <Link to="/mentor/reports" className="finances-tab-btn">
          <RupeeIcon size={15} />
          <span>My reports</span>
        </Link>

        <Link to="/mentor/taxes" className="finances-tab-btn active">
          <ShieldIcon size={15} />
          <span>Taxes</span>
        </Link>
      </div>

      {/* Primary Financial Metric Summary Cards (All in One Line) */}
      <div className="earnings-stats-grid" style={{ marginBottom: '22px' }}>
        {/* Card 1: Taxpayer Status */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">Taxpayer Status</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <CheckCircleIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: '#10b981', fontSize: '18px' }}>
            Verified &amp; Active
          </div>
          <div className="earnings-stat-desc">
            PAN {displayPan} • Form {taxProfile.taxFormType}
          </div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            ● 100% Tax Compliant
          </div>
        </div>

        {/* Card 2: Gross Billings */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">Gross Billings</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(38, 75, 228, 0.1)', color: 'var(--brand)' }}>
              <WalletIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: 'var(--ink)' }}>
            {formatINR(taxStatements[0].grossBillings)}
          </div>
          <div className="earnings-stat-desc">
            Net taxable income: {formatINR(taxStatements[0].netTaxable)}
          </div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(38, 75, 228, 0.08)', color: 'var(--accent)' }}>
            ● Current FY 2026–27
          </div>
        </div>

        {/* Card 3: TDS Deducted */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">TDS Deducted</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <ShieldIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: '#10b981' }}>
            {formatINR(0)}
          </div>
          <div className="earnings-stat-desc">
            Sec 194J / 194H Zero-withholding
          </div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            ● Zero Intermediary TDS
          </div>
        </div>

        {/* Card 4: US Tax Withholding */}
        <div className="earnings-stat-card">
          <div className="earnings-stat-card-top">
            <span className="earnings-stat-label">US Tax Withholding</span>
            <div className="earnings-stat-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
              <DocumentIcon size={16} />
            </div>
          </div>
          <div className="earnings-stat-value" style={{ color: 'var(--accent)' }}>
            0.00%
          </div>
          <div className="earnings-stat-desc">
            DTAA Treaty Article 12 (0% Rate)
          </div>
          <div className="earnings-stat-pill" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed' }}>
            ● Treaty Relief Active
          </div>
        </div>
      </div>

      {/* Section 1: Taxpayer Identification Details Card */}
      <div className="card" style={{ padding: '22px 24px', marginBottom: '24px' }}>
        <div className="tax-section-header">
          <div>
            <h3 className="tax-section-title">
              <UserIcon size={18} style={{ color: 'var(--brand)' }} />
              <span>Taxpayer Identification &amp; Legal Classification</span>
            </h3>
            <p className="tax-section-sub">
              Official tax documentation determining domestic TDS clearance, US treaty benefits, and GST invoicing eligibility.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setTaxModalOpen(true)}
          >
            <FileEditIcon size={13} />
            <span>Edit Tax Details</span>
          </button>
        </div>

        {/* Tax Information 4-Card Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* Box 1: Legal Name */}
          <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--grid-strong)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Legal Taxpayer Name
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink)', marginTop: '5px' }}>
              {taxProfile.legalName}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
              Individual Software Consultant
            </div>
          </div>

          {/* Box 2: Tax Residency & Form */}
          <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--grid-strong)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Tax Residency &amp; Form
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink)', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{taxProfile.taxResidency}</span>
              <span className="badge badge-primary" style={{ fontSize: '10px' }}>Form {taxProfile.taxFormType}</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
              Non-US Person • DTAA Treaty Article 12
            </div>
          </div>

          {/* Box 3: PAN / TIN with unmask toggle */}
          <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--grid-strong)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Tax Identification (PAN)
              </div>
              <button
                type="button"
                onClick={() => setShowPan(!showPan)}
                style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                title={showPan ? 'Mask PAN' : 'Reveal full PAN'}
              >
                {showPan ? <EyeOffIcon size={13} /> : <EyeIcon size={13} />}
                <span>{showPan ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink)', marginTop: '5px', fontFamily: 'JetBrains Mono', letterSpacing: '0.06em' }}>
              {displayPan}
            </div>
            <div style={{ fontSize: '11.5px', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircleIcon size={12} />
              <span>Income Tax Dept (ITD) Verified</span>
            </div>
          </div>

          {/* Box 4: GST Compliance */}
          <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--grid-strong)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              GST Compliance Status
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#10b981', marginTop: '5px' }}>
              {taxProfile.gstStatus === 'exempt' ? 'Exempt (Turnover < ₹20L)' : taxProfile.gstin}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
              Section 22(1) CGST Act Exemption
            </div>
          </div>
        </div>

        {/* Address & Digital Signature Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' }}>
          <div style={{ padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--grid)', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600 }}>Official Tax Billing Address</div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink)', marginTop: '3px' }}>{taxProfile.address}</div>
          </div>

          <div style={{ padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--grid)', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontWeight: 600 }}>Electronic Form Certification</div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink)', marginTop: '3px' }}>
              Certified by <strong>{taxProfile.digitalSignature}</strong> on {taxProfile.verifiedDate}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Annual Tax Summary Statements Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '26px' }}>
        <div style={{ padding: '20px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="tax-section-title">
              <DocumentIcon size={18} style={{ color: 'var(--brand)' }} />
              <span>Annual Tax Summary Statements</span>
            </h3>
            <p className="tax-section-sub">
              Consolidated fiscal year statements for personal income tax filing, Chartered Accountant review, and TDS reconciliation.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => handleDownloadTaxStatement(taxStatements[0])}
            title="Download statement for FY 2026-2027"
          >
            <DownloadIcon size={13} />
            <span>Export Statement (.TXT)</span>
          </button>
        </div>

        {/* Horizontal Table Scroll Wrapper with custom scrollbar */}
        <div className="tax-table-scroll-wrap">
          <table className="tax-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '24px', minWidth: '180px' }}>Fiscal Year / Period</th>
                <th style={{ minWidth: '130px' }}>Assessment Year</th>
                <th style={{ textAlign: 'right', minWidth: '130px' }}>Gross Billings</th>
                <th style={{ textAlign: 'right', minWidth: '140px' }}>Platform Fee (10%)</th>
                <th style={{ textAlign: 'right', minWidth: '150px' }}>Net Taxable Income</th>
                <th style={{ textAlign: 'right', minWidth: '140px' }}>TDS Withheld</th>
                <th style={{ textAlign: 'center', minWidth: '180px' }}>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '24px', minWidth: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {taxStatements.map((stmt) => (
                <tr key={stmt.fiscalYear}>
                  {/* Fiscal Year & Period */}
                  <td style={{ paddingLeft: '24px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                      {stmt.fiscalYear}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {stmt.period}
                    </div>
                  </td>

                  {/* Assessment Year */}
                  <td>
                    <span className="tax-ay-chip">
                      {stmt.assessmentYear}
                    </span>
                  </td>

                  {/* Gross Billings */}
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                    {formatINR(stmt.grossBillings)}
                  </td>

                  {/* Platform Fee */}
                  <td style={{ textAlign: 'right', color: 'var(--ink-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                    - {formatINR(stmt.platformFee)}
                  </td>

                  {/* Net Taxable Income */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--accent)', background: 'rgba(38,75,228,0.06)', padding: '3px 8px', borderRadius: '6px' }}>
                      {formatINR(stmt.netTaxable)}
                    </span>
                  </td>

                  {/* TDS Withheld */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                      <span style={{ fontWeight: 600, color: '#10b981', fontSize: '13px' }}>
                        {formatINR(stmt.tdsWithheld)}
                      </span>
                      <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)', background: 'var(--bg)', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--grid)' }}>
                        0% Exempt
                      </span>
                    </div>
                  </td>

                  {/* Status Badge (strictly 1 line!) */}
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {stmt.isCurrent ? (
                      <span className="tax-status-badge in-progress">
                        <span className="tax-pulse-dot" />
                        <span>In Progress • Current FY</span>
                      </span>
                    ) : (
                      <span className="tax-status-badge closed">
                        <CheckCircleIcon size={12} />
                        <span>Closed &amp; Reconciled</span>
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right', paddingRight: '24px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        onClick={() => {
                          setSelectedStatementYear(stmt.fiscalYear);
                          setStatementModalOpen(true);
                        }}
                        title="View formal tax statement"
                      >
                        <DocumentIcon size={12} />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        onClick={() => handleDownloadTaxStatement(stmt)}
                        title="Download statement as text file"
                      >
                        <DownloadIcon size={12} />
                        <span>Download</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Official Tax Documentation & Certificates Archive */}
      <div className="tax-section-header">
        <div>
          <h3 className="tax-section-title">
            <ShieldIcon size={18} style={{ color: 'var(--brand)' }} />
            <span>Official Tax Documentation &amp; Certificates Archive</span>
          </h3>
          <p className="tax-section-sub">
            Immutable compliance forms, tax treaty declarations, and electronic withholding exemptions on record.
          </p>
        </div>
      </div>

      {/* 3 Balanced Cards in a Single Row */}
      <div className="tax-doc-grid">
        {/* Doc 1: Form W-8BEN */}
        <div className="tax-doc-card">
          <div>
            <div className="tax-doc-top">
              <div className="tax-doc-icon-wrap" style={{ background: 'rgba(38, 75, 228, 0.08)', color: 'var(--brand)' }}>
                <ShieldIcon size={20} />
              </div>
              <span className="tax-doc-verified-pill">
                <CheckCircleIcon size={12} />
                <span>Active on File</span>
              </span>
            </div>

            <h4 className="tax-doc-title">Form W-8BEN (Foreign Status)</h4>
            <div className="tax-doc-legal-tag">
              IRS Certificate • US-India Treaty Article 12 Relief
            </div>
            <p className="tax-doc-desc">
              Electronic Certificate of Foreign Status certifying Indian tax residency and establishing 0% US foreign withholding tax relief on technology consulting earnings.
            </p>

            {/* Key Metadata Box */}
            <div className="tax-doc-meta-box">
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Authority:</span>
                <span className="tax-doc-meta-val">US IRS (Chapter 3)</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Beneficiary:</span>
                <span className="tax-doc-meta-val">{taxProfile.legalName}</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Withholding:</span>
                <span className="tax-doc-meta-val" style={{ color: '#10b981' }}>0.00% (Treaty Relief)</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Validity:</span>
                <span className="tax-doc-meta-val">Dec 31, 2028</span>
              </div>
            </div>
          </div>

          <div className="tax-doc-actions">
            <button
              type="button"
              className="btn btn-secondary tax-doc-btn-view"
              onClick={() => handleOpenDocPreview('w8')}
              title="View and preview Form W-8BEN"
            >
              <PrinterIcon size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              className="btn btn-primary tax-doc-btn-download"
              onClick={handleDownloadFormW8}
              title="Download certified Form W-8BEN"
            >
              <DownloadIcon size={13} />
              <span>Download (.TXT)</span>
            </button>
          </div>
        </div>

        {/* Doc 2: GST Exemption Declaration */}
        <div className="tax-doc-card">
          <div>
            <div className="tax-doc-top">
              <div className="tax-doc-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981' }}>
                <DocumentIcon size={20} />
              </div>
              <span className="tax-doc-verified-pill">
                <CheckCircleIcon size={12} />
                <span>Statutory Exemption</span>
              </span>
            </div>

            <h4 className="tax-doc-title">GST Exemption Declaration</h4>
            <div className="tax-doc-legal-tag" style={{ color: '#10b981' }}>
              Section 22 CGST Act • Turnover Under ₹20 Lakhs
            </div>
            <p className="tax-doc-desc">
              Statutory declaration confirming aggregate annual mentoring and consultancy turnover is under the ₹20,00,000 threshold for mandatory GST registration.
            </p>

            {/* Key Metadata Box */}
            <div className="tax-doc-meta-box">
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Authority:</span>
                <span className="tax-doc-meta-val">GST Council (CBIC)</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Statute:</span>
                <span className="tax-doc-meta-val">Section 22(1) CGST Act</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Turnover Limit:</span>
                <span className="tax-doc-meta-val">&lt; ₹20,00,000 / Yr</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Invoicing:</span>
                <span className="tax-doc-meta-val">Intermediary Credit Note</span>
              </div>
            </div>
          </div>

          <div className="tax-doc-actions">
            <button
              type="button"
              className="btn btn-secondary tax-doc-btn-view"
              onClick={() => handleOpenDocPreview('gst')}
              title="View and preview GST Exemption Declaration"
            >
              <PrinterIcon size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              className="btn btn-primary tax-doc-btn-download"
              onClick={handleDownloadGstDeclaration}
              title="Download GST Exemption Declaration"
            >
              <DownloadIcon size={13} />
              <span>Download (.TXT)</span>
            </button>
          </div>
        </div>

        {/* Doc 3: Section 194J TDS Clearance */}
        <div className="tax-doc-card">
          <div>
            <div className="tax-doc-top">
              <div className="tax-doc-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6' }}>
                <CheckCircleIcon size={20} />
              </div>
              <span className="tax-doc-verified-pill">
                <CheckCircleIcon size={12} />
                <span>100% Cleared</span>
              </span>
            </div>

            <h4 className="tax-doc-title">TDS Zero-Withholding Certificate</h4>
            <div className="tax-doc-legal-tag" style={{ color: '#8b5cf6' }}>
              Section 194J / 194H • P2P Intermediary Model
            </div>
            <p className="tax-doc-desc">
              Formal ledger reconciliation certificate establishing PairUp operates as an intermediary escrow facilitator, disbursing 100% net earnings with zero TDS deductions.
            </p>

            {/* Key Metadata Box */}
            <div className="tax-doc-meta-box">
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Tax Dept:</span>
                <span className="tax-doc-meta-val">Income Tax Dept (India)</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Statute:</span>
                <span className="tax-doc-meta-val">Section 194J / 194H</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">TDS Deduction:</span>
                <span className="tax-doc-meta-val" style={{ color: '#10b981' }}>INR 0.00 (Zero Rate)</span>
              </div>
              <div className="tax-doc-meta-row">
                <span className="tax-doc-meta-key">Audit Match:</span>
                <span className="tax-doc-meta-val">Escrow Reconciled</span>
              </div>
            </div>
          </div>

          <div className="tax-doc-actions">
            <button
              type="button"
              className="btn btn-secondary tax-doc-btn-view"
              onClick={() => handleOpenDocPreview('tds')}
              title="View and preview TDS Zero-Withholding Certificate"
            >
              <PrinterIcon size={13} />
              <span>View</span>
            </button>
            <button
              type="button"
              className="btn btn-primary tax-doc-btn-download"
              onClick={handleDownloadTdsClearance}
              title="Download TDS Zero-Withholding Certificate"
            >
              <DownloadIcon size={13} />
              <span>Download (.TXT)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Edit Taxpayer Details & Tax Forms */}
      {taxModalOpen && (
        <Modal
          isOpen={taxModalOpen}
          onClose={() => setTaxModalOpen(false)}
          title="Taxpayer Identification &amp; Tax Forms"
          subtitle="Configure your legal tax classification, PAN / Taxpayer ID, and W-8BEN/W-9 certifications."
          maxWidth="580px"
        >
          <form onSubmit={handleSaveTaxProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Form Selection */}
            <div>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                Tax Classification Form
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className={`btn ${taxProfile.taxFormType === 'W-8BEN' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
                  onClick={() => setTaxProfile({ ...taxProfile, taxFormType: 'W-8BEN', citizenship: 'India', taxResidency: 'India' })}
                >
                  Form W-8BEN (Non-US Person)
                </button>
                <button
                  type="button"
                  className={`btn ${taxProfile.taxFormType === 'W-9' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
                  onClick={() => setTaxProfile({ ...taxProfile, taxFormType: 'W-9', citizenship: 'United States', taxResidency: 'United States' })}
                >
                  Form W-9 (US Person / Entity)
                </button>
              </div>
            </div>

            {/* Legal Full Name */}
            <div>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                Legal Full Name (Matching Official Tax ID)
              </label>
              <input
                type="text"
                required
                value={taxProfile.legalName}
                onChange={(e) => setTaxProfile({ ...taxProfile, legalName: e.target.value })}
                style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)' }}
              />
            </div>

            {/* Tax Residency & Country */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                  Country of Citizenship
                </label>
                <input
                  type="text"
                  required
                  value={taxProfile.citizenship}
                  onChange={(e) => setTaxProfile({ ...taxProfile, citizenship: e.target.value })}
                  style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                  Tax Residency Country
                </label>
                <input
                  type="text"
                  required
                  value={taxProfile.taxResidency}
                  onChange={(e) => setTaxProfile({ ...taxProfile, taxResidency: e.target.value })}
                  style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)' }}
                />
              </div>
            </div>

            {/* PAN / TIN Number */}
            <div>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                Taxpayer Identification Number (PAN / SSN / ITIN)
              </label>
              <input
                type="text"
                required
                value={taxProfile.panNumber}
                onChange={(e) => setTaxProfile({ ...taxProfile, panNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. ABCDE1234F"
                style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'JetBrains Mono', letterSpacing: '0.05em' }}
              />
            </div>

            {/* GST Status */}
            <div>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                Goods and Services Tax (GST) Status
              </label>
              <select
                value={taxProfile.gstStatus}
                onChange={(e) => setTaxProfile({ ...taxProfile, gstStatus: e.target.value })}
                style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <option value="exempt">Exempt (Annual turnover under ₹20,00,000 threshold under Section 22)</option>
                <option value="registered">Registered GST Taxpayer (Enter GSTIN below)</option>
              </select>
            </div>

            {taxProfile.gstStatus === 'registered' && (
              <div>
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                  15-Digit GSTIN
                </label>
                <input
                  type="text"
                  value={taxProfile.gstin}
                  onChange={(e) => setTaxProfile({ ...taxProfile, gstin: e.target.value.toUpperCase() })}
                  placeholder="29ABCDE1234F1Z5"
                  style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'JetBrains Mono' }}
                />
              </div>
            )}

            {/* Permanent Address */}
            <div>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                Permanent Tax Residence Address
              </label>
              <textarea
                required
                rows={2}
                value={taxProfile.address}
                onChange={(e) => setTaxProfile({ ...taxProfile, address: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '13px' }}
              />
            </div>

            {/* Digital Signature */}
            <div>
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px', display: 'block' }}>
                Electronic Signature (Type Full Legal Name)
              </label>
              <input
                type="text"
                required
                value={taxProfile.digitalSignature}
                onChange={(e) => setTaxProfile({ ...taxProfile, digitalSignature: e.target.value })}
                style={{ width: '100%', height: '38px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--grid-strong)', background: 'var(--surface)', color: 'var(--ink)' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                By clicking Save, you certify under penalty of perjury that the taxpayer information provided is true, correct, and complete.
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTaxModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Save &amp; Certify Tax Details
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 2: View Formal Annual Tax Statement (Printable) */}
      {statementModalOpen && (
        <Modal
          isOpen={statementModalOpen}
          onClose={() => setStatementModalOpen(false)}
          title={`Annual Tax Statement: ${selectedStatementYear}`}
          subtitle="Official PairUp financial audit statement for tax return filing."
          maxWidth="720px"
        >
          <div className="printable-statement-wrap" style={{ padding: '4px' }}>
            {/* Statement Header */}
            <div style={{ borderBottom: '2px solid var(--grid-strong)', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>PairUp Financial Services Pvt. Ltd.</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                  Peer-to-Peer Software Engineering Platform &bull; Escrow Intermediary
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>CERTIFIED STATEMENT</span>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                  Date: {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Mentor Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px', background: 'var(--bg)', padding: '12px 16px', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Mentor Taxpayer</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>{taxProfile.legalName}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>Email: {user?.email || 'mentor@pairup.io'}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>PAN: {taxProfile.panNumber} (Verified)</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Statement Period</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>{selectedStatementYear}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>Assessment Year: AY 2027–2028</div>
                <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>GST Status: {taxProfile.gstStatus === 'exempt' ? 'Exempt under Sec 22' : taxProfile.gstin}</div>
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <table className="table" style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--grid-strong)' }}>
                  <th style={{ padding: '10px 0', textAlign: 'left', fontSize: '12px' }}>Line Item Description</th>
                  <th style={{ padding: '10px 0', textAlign: 'right', fontSize: '12px' }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--grid)' }}>
                  <td style={{ padding: '10px 0', fontSize: '13px' }}>Gross Mentoring &amp; Consultancy Billings</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>{formatINR(taxStatements[0].grossBillings)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--grid)' }}>
                  <td style={{ padding: '10px 0', fontSize: '13px', color: 'var(--ink-muted)' }}>Less: PairUp Platform Service Fee Retained (10%)</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', color: 'var(--ink-muted)', fontSize: '13px' }}>- {formatINR(taxStatements[0].platformFee)}</td>
                </tr>
                <tr style={{ borderBottom: '2px solid var(--grid-strong)', background: 'rgba(38,75,228,0.03)' }}>
                  <td style={{ padding: '12px 6px', fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)' }}>Net Realized Taxable Income</td>
                  <td style={{ padding: '12px 6px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: 'var(--accent)' }}>{formatINR(taxStatements[0].netTaxable)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--grid)' }}>
                  <td style={{ padding: '10px 0', fontSize: '12.5px', color: '#10b981' }}>Tax Deducted at Source (TDS under Sec 194J / 194H)</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#10b981', fontSize: '12.5px' }}>{formatINR(0)} (0% Exempt)</td>
                </tr>
              </tbody>
            </table>

            {/* Statement Footer */}
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
              This statement is generated electronically and verified against PairUp's immutable escrow vault ledger.
              All amounts are denominated in Indian Rupees (INR).
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStatementModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.print()}
              >
                <PrinterIcon size={14} />
                <span>Print Statement</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleDownloadTaxStatement(taxStatements[0])}
              >
                <DownloadIcon size={14} />
                <span>Download (.TXT)</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 3: Document Quick Preview Modal */}
      {docPreviewModalOpen && selectedDocPreview && (
        <Modal
          isOpen={docPreviewModalOpen}
          onClose={() => setDocPreviewModalOpen(false)}
          title={selectedDocPreview.title}
          subtitle={selectedDocPreview.subtitle}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg)', border: '1px solid var(--grid)', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--ink)', maxHeight: '340px', overflowY: 'auto' }}>
              {selectedDocPreview.content}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDocPreviewModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  selectedDocPreview.onDownload();
                  setDocPreviewModalOpen(false);
                }}
              >
                <DownloadIcon size={14} />
                <span>{selectedDocPreview.downloadLabel}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PortalLayout>
  );
}
