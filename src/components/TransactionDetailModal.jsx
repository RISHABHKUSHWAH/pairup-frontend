import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import { DownloadIcon, CheckCircleIcon, ChevronRightIcon } from './Icons';
import { useAuth } from '../context/AuthContext';
import { usePlatformCommission } from '../utils';
import PairUpLogo from './PairUpLogo';

export default function TransactionDetailModal({ isOpen, onClose, transaction }) {
  const { user } = useAuth();
  const { effectiveMentorFeePercent, mentorTaxPercent } = usePlatformCommission();
  const [feeInvoiceModalOpen, setFeeInvoiceModalOpen] = useState(false);
  const [earningsInvoiceModalOpen, setEarningsInvoiceModalOpen] = useState(false);
  const printableRef = useRef(null);

  if (!transaction) return null;

  const isWithdrawal = transaction.type === 'Withdrawal' || transaction.movementType === 'disbursement';
  const isFixedPrice = transaction.type === 'Fixed-price' || transaction.contractId;

  const dateStr = transaction.date || transaction.created_at
    ? new Date(transaction.date || transaction.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Oct 17, 2026';

  const typeLabel = isWithdrawal ? 'Withdrawal' : (transaction.type || (transaction.contractId ? 'Fixed-price' : 'Session'));
  const clientName = transaction.clientName || transaction.learner_name || transaction.learnerName || transaction.counterparty || 'DG';
  const clientInitial = (clientName.trim().charAt(0) || 'D').toUpperCase();

  // Financial values
  const gross = Number(transaction.grossAmount || transaction.amount || 225.0);
  const commPct = Number(
    transaction.mentorCommissionPercent !== undefined && transaction.mentorCommissionPercent !== null
      ? transaction.mentorCommissionPercent
      : (effectiveMentorFeePercent ?? 6.0)
  );
  const taxPct = Number(
    transaction.mentorTaxPercent !== undefined && transaction.mentorTaxPercent !== null
      ? transaction.mentorTaxPercent
      : (mentorTaxPercent ?? 18.0)
  );

  const serviceFee = Number(
    transaction.mentorFee !== undefined && Number(transaction.mentorFee) > 0
      ? transaction.mentorFee
      : (transaction.platformFee !== undefined && Number(transaction.platformFee) > 0
          ? transaction.platformFee
          : Math.round(gross * (commPct / 100) * 100) / 100)
  );

  // Exact displayed commission percentage matching serviceFee / gross
  const displayCommPct =
    gross > 0 && serviceFee > 0
      ? Math.round((serviceFee / gross) * 1000) / 10
      : commPct;

  const gstServiceFee = Number(
    transaction.mentorTax !== undefined && Number(transaction.mentorTax) > 0
      ? transaction.mentorTax
      : Math.round(serviceFee * (taxPct / 100) * 100) / 100
  );

  // Exact displayed tax percentage matching gstServiceFee / serviceFee
  const displayTaxPct =
    serviceFee > 0 && gstServiceFee > 0
      ? Math.round((gstServiceFee / serviceFee) * 1000) / 10
      : taxPct;

  const netEarnings = Number(
    transaction.netMentorPayout !== undefined && Number(transaction.netMentorPayout) > 0
      ? transaction.netMentorPayout
      : (transaction.netAmount !== undefined && !isWithdrawal && Number(transaction.netAmount) > 0
          ? transaction.netAmount
          : Math.max(0, Math.round((gross - serviceFee - gstServiceFee) * 100) / 100))
  );

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  const mentorName = user?.name || transaction.mentor_name || 'Rishabh Kushwah';
  const mentorAddress1 = user?.address || 'Purdilnagar';
  const mentorAddress2 = user?.city ? `${user.city}, ${user.state || 'UP'}, ${user.zip || '204214'}` : 'HATHRAS, UP, 204214';

  const getSafeNumericSeed = (raw) => {
    if (!raw) return 111;
    if (typeof raw === 'number' && !isNaN(raw)) return Math.abs(raw);
    const str = String(raw).trim();
    const digitsOnly = str.replace(/\D/g, '');
    if (digitsOnly.length > 0) {
      const parsed = parseInt(digitsOnly, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed % 100000 || 111;
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100000 || 111;
  };

  const idSeed = getSafeNumericSeed(
    transaction.id || transaction._id || transaction.refId || transaction.booking_id || transaction.bookingId
  );

  const rawContractId =
    transaction.contract_id || transaction.contractId || transaction.booking_id || transaction.bookingId;
  const bookingContractId =
    rawContractId && !isNaN(Number(rawContractId))
      ? String(rawContractId)
      : String(43578000 + idSeed);

  const contractTitle =
    transaction.contractTitle || transaction.topic || '[1-on-1 Mentoring & Pair Programming] demo';

  const txRefId = String(
    transaction.refId && !isNaN(Number(transaction.refId))
      ? transaction.refId
      : 955990000 + idSeed
  );
  const invoiceNum = String(955990000 + idSeed + 2);
  const earningsInvoiceNum = String(955990000 + idSeed + 1);
  const notesRefId = String(955990000 + idSeed - 1);
  const gstRefId = String(955990000 + idSeed + 2);
  const totalFee = Math.round((serviceFee + gstServiceFee) * 100) / 100;
  const dueDateStr = dateStr;

  const pairUpLogoSvg = `
    <span style="display:inline-flex;align-items:center;gap:8px;vertical-align:middle;">
      <svg viewBox="130 95 540 195" width="44" height="16" style="display:inline-block;vertical-align:middle;" aria-hidden="true">
        <defs>
          <linearGradient id="publue-logo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2563EB" />
            <stop offset="100%" stop-color="#1D4ED8" />
          </linearGradient>
          <linearGradient id="pusky-logo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#0284C7" />
          </linearGradient>
        </defs>
        <g transform="translate(0, -10)">
          <line x1="270" y1="200" x2="530" y2="200" stroke="#BFDBFE" stroke-width="7" stroke-linecap="round" stroke-dasharray="10 14" />
          <circle cx="400" cy="200" r="14" fill="#0EA5E9" />
          <circle cx="400" cy="200" r="5" fill="#FFFFFF" />
          <rect x="150" y="130" width="140" height="140" rx="42" fill="url(#publue-logo)" />
          <circle cx="220" cy="200" r="20" fill="#FFFFFF" />
          <rect x="510" y="130" width="140" height="140" rx="42" fill="#FFFFFF" stroke="url(#pusky-logo)" stroke-width="11" />
          <circle cx="580" cy="200" r="20" fill="url(#pusky-logo)" />
        </g>
      </svg>
      <span style="font-size:26px;font-weight:800;letter-spacing:-0.04em;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1;">pairup</span>
    </span>
  `;

  const handlePrintEarningsInvoice = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>PairUp_Invoice_${earningsInvoiceNum}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm 16mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              padding: 16px 20px;
              font-size: 13px;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              min-height: 250mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            .header-grid {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
            }
            .parties-block {
              display: grid;
              grid-template-columns: 65px 1fr;
              gap: 8px 12px;
              font-size: 13px;
              color: #111827;
              line-height: 1.4;
            }
            .party-tag {
              font-weight: 700;
              color: #111827;
            }
            .invoice-box {
              width: 250px;
            }
            .invoice-banner {
              background: #eceff1;
              color: #111827;
              font-size: 15px;
              font-weight: 800;
              letter-spacing: 0.22em;
              text-align: center;
              padding: 9px 12px;
              margin-bottom: 16px;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              line-height: 1.6;
            }
            .meta-table td {
              padding: 2px 0;
            }
            .meta-table td.label {
              font-weight: 600;
              color: #111827;
              text-transform: uppercase;
              font-size: 11.5px;
            }
            .meta-table td.val {
              text-align: right;
              color: #111827;
            }
            .meta-table td.val.mono {
              font-family: monospace;
              font-size: 12px;
            }
            .meta-table td.val.bold {
              font-weight: 700;
            }
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
              border: 1px solid #94a3b8;
              font-size: 12.5px;
            }
            .invoice-table th {
              background: #f1f5f9;
              color: #1e293b;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.03em;
              padding: 10px 14px;
              border-bottom: 1px solid #94a3b8;
            }
            .invoice-table th.right, .invoice-table td.right {
              text-align: right;
            }
            .invoice-table td {
              padding: 14px 14px;
              border-bottom: 1px solid #cbd5e1;
              vertical-align: top;
            }
            .sub-details {
              padding-left: 20px;
              margin-top: 5px;
              font-size: 12px;
              line-height: 1.55;
              color: #1e293b;
            }
            .total-row td {
              border-top: 1px solid #94a3b8;
              border-bottom: 1px solid #94a3b8;
              font-weight: 700;
              font-size: 13px;
              color: #111827;
              padding: 12px 14px;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div>
              <div class="header-grid" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; width: 100%;">
                <div class="header-left" style="flex: 1; max-width: 440px;">
                  <div class="parties-block">
                    <div class="party-tag">From:</div>
                    <div>
                      <div>${mentorName}</div>
                      <div>${mentorAddress1}</div>
                      <div>${mentorAddress2}</div>
                      <div>India</div>
                    </div>

                    <div class="party-tag" style="margin-top: 18px;">Bill to:</div>
                    <div style="margin-top: 18px;">
                      <div>Attn: ${clientName}</div>
                      <div>Business Name:</div>
                      <div>${clientName}</div>
                      <div>India</div>
                    </div>
                  </div>
                </div>

                <div class="invoice-box" style="width: 250px; flex-shrink: 0;">
                  <div class="invoice-banner">INVOICE</div>
                  <table class="meta-table">
                    <tr>
                      <td class="label">TRANSACTION ID</td>
                      <td class="val mono">${txRefId}</td>
                    </tr>
                    <tr>
                      <td class="label">INVOICE #</td>
                      <td class="val mono">T${earningsInvoiceNum}</td>
                    </tr>
                    <tr>
                      <td class="label">DATE</td>
                      <td class="val">${dateStr}</td>
                    </tr>
                    <tr>
                      <td class="label">DUE DATE</td>
                      <td class="val">${dueDateStr}</td>
                    </tr>
                    <tr>
                      <td class="label bold">TOTAL AMOUNT</td>
                      <td class="val mono bold">₹${gross.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td class="label bold">TOTAL DUE</td>
                      <td class="val mono bold">₹${gross.toFixed(2)}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <table class="invoice-table">
                <thead>
                  <tr>
                    <th style="width: 82%;">DESCRIPTION / MEMO</th>
                    <th class="right" style="width: 18%;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style="font-weight: 600;">${isFixedPrice ? 'Contract earnings' : 'Session earnings'}</div>
                      <div class="sub-details">
                        <div>Contract ID: ${bookingContractId}</div>
                        <div>Contract title: ${contractTitle}</div>
                        <div>Client: ${clientName}</div>
                        <div>Provider: ${mentorName}</div>
                        <div>Amount: ₹${gross.toFixed(2)} INR</div>
                        <div>Notes: Invoice from PairUp for T${txRefId}</div>
                      </div>
                    </td>
                    <td class="right" style="font-family: monospace; font-size: 13px;">
                      ${gross.toFixed(2)}
                    </td>
                  </tr>
                  <tr class="total-row">
                    <td style="text-transform: uppercase;">TOTAL AMOUNT:</td>
                    <td class="right" style="font-family: monospace; font-size: 14px;">
                      ₹${gross.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 13px; color: #4b5563;">Invoice created via</span>
                  ${pairUpLogoSvg}
                </div>
                <div style="width: 250px; background: #eceff1; padding: 12px 16px; border: 1px solid #d2d6dc; font-size: 12px; line-height: 1.45;">
                  <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 4px; letter-spacing: 0.05em; color: #111827;">REMIT TO:</div>
                  <div>PairUp Global LLC</div>
                  <div>530 Lytton Avenue, Suite 301</div>
                  <div>Palo Alto, CA 94301</div>
                  <div>USA</div>
                </div>
              </div>
              <div style="padding-top: 12px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; border-top: 1px solid #f3f4f6;">
                <div>Valid without signature. Electronic statement.</div>
                <div>Ref: ${txRefId}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print failed:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    }, 250);
  };

  const handlePrintServiceFeeInvoice = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>PairUp_Invoice_${invoiceNum}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm 16mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              padding: 16px 20px;
              font-size: 13px;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              min-height: 250mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            .header-grid {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
            }
            .parties-block {
              display: grid;
              grid-template-columns: 65px 1fr;
              gap: 8px 12px;
              font-size: 13px;
              color: #111827;
              line-height: 1.4;
            }
            .party-tag {
              font-weight: 700;
              color: #111827;
            }
            .invoice-box {
              width: 250px;
            }
            .invoice-banner {
              background: #eceff1;
              color: #111827;
              font-size: 15px;
              font-weight: 800;
              letter-spacing: 0.22em;
              text-align: center;
              padding: 9px 12px;
              margin-bottom: 16px;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              line-height: 1.6;
            }
            .meta-table td {
              padding: 2px 0;
            }
            .meta-table td.label {
              font-weight: 600;
              color: #111827;
              text-transform: uppercase;
              font-size: 11.5px;
            }
            .meta-table td.val {
              text-align: right;
              color: #111827;
            }
            .meta-table td.val.mono {
              font-family: monospace;
              font-size: 12px;
            }
            .meta-table td.val.bold {
              font-weight: 700;
            }
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
              border: 1px solid #94a3b8;
              font-size: 12.5px;
            }
            .invoice-table th {
              background: #f1f5f9;
              color: #1e293b;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.03em;
              padding: 10px 14px;
              border-bottom: 1px solid #94a3b8;
            }
            .invoice-table th.right, .invoice-table td.right {
              text-align: right;
            }
            .invoice-table td {
              padding: 14px 14px;
              border-bottom: 1px solid #cbd5e1;
              vertical-align: top;
            }
            .sub-details {
              padding-left: 20px;
              margin-top: 5px;
              font-size: 12px;
              line-height: 1.55;
              color: #1e293b;
            }
            .total-row td {
              border-top: 1px solid #94a3b8;
              border-bottom: 1px solid #94a3b8;
              font-weight: 700;
              font-size: 13px;
              color: #111827;
              padding: 12px 14px;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div>
              <div class="header-grid" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; width: 100%;">
                <div class="header-left" style="flex: 1; max-width: 440px;">
                  <div style="margin-bottom: 18px;">
                    ${pairUpLogoSvg}
                  </div>
                  <div class="parties-block">
                    <div class="party-tag">From:</div>
                    <div>
                      <div>PairUp Global LLC</div>
                      <div>530 Lytton Avenue, Suite 301</div>
                      <div>Palo Alto, CA 94301</div>
                      <div>USA</div>
                      <div style="margin-top: 12px;">GST ID: 29PAIRUP1234F1Z0</div>
                    </div>

                    <div class="party-tag" style="margin-top: 18px;">Bill to:</div>
                    <div style="margin-top: 18px;">
                      <div>Attn: ${mentorName}</div>
                      <div>Business Name:</div>
                      <div>${mentorName}</div>
                      <div>${mentorAddress1}</div>
                      <div>${mentorAddress2}</div>
                      <div>India</div>
                    </div>
                  </div>
                </div>

                <div class="invoice-box" style="width: 250px; flex-shrink: 0;">
                  <div class="invoice-banner">INVOICE</div>
                  <table class="meta-table">
                    <tr>
                      <td class="label">TRANSACTION ID</td>
                      <td class="val mono">${txRefId}</td>
                    </tr>
                    <tr>
                      <td class="label">INVOICE #</td>
                      <td class="val mono">T${invoiceNum}</td>
                    </tr>
                    <tr>
                      <td class="label">DATE</td>
                      <td class="val">${dateStr}</td>
                    </tr>
                    <tr>
                      <td class="label">DUE DATE</td>
                      <td class="val">${dueDateStr}</td>
                    </tr>
                    <tr>
                      <td class="label bold">TOTAL AMOUNT</td>
                      <td class="val mono bold">₹${totalFee.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td class="label bold">TOTAL DUE</td>
                      <td class="val mono bold">₹${totalFee.toFixed(2)}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <table class="invoice-table">
                <thead>
                  <tr>
                    <th style="width: 82%;">DESCRIPTION / MEMO</th>
                    <th class="right" style="width: 18%;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style="font-weight: 600;">Service Fee</div>
                      <div class="sub-details">
                        <div>Contract ID: ${bookingContractId}</div>
                        <div>Contract title: ${contractTitle}</div>
                        <div>Client: ${clientName}</div>
                        <div>Amount:</div>
                        <div>₹${gross.toFixed(2)} INR x ${displayCommPct.toFixed(1)}% = ₹${serviceFee.toFixed(2)} INR</div>
                        <div>Notes: Invoice from PairUp for T${notesRefId}</div>
                      </div>
                    </td>
                    <td class="right" style="font-family: monospace; font-size: 13px;">
                      ${serviceFee.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div style="font-weight: 600;">GST (IN) - Service Fee - Ref ID ${gstRefId}</div>
                      <div class="sub-details">
                        <div>Country: IN</div>
                        <div>Amount: ₹${serviceFee.toFixed(2)} INR x ${displayTaxPct.toFixed(2)}% = ₹${gstServiceFee.toFixed(2)} INR</div>
                      </div>
                    </td>
                    <td class="right" style="font-family: monospace; font-size: 13px;">
                      ${gstServiceFee.toFixed(2)}
                    </td>
                  </tr>
                  <tr class="total-row">
                    <td style="text-transform: uppercase;">TOTAL AMOUNT:</td>
                    <td class="right" style="font-family: monospace; font-size: 14px;">
                      ₹${totalFee.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="padding-top: 16px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; border-top: 1px solid #f3f4f6;">
              <div>PairUp Global LLC • GST Registered Intermediary</div>
              <div>Ref: ${txRefId}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print failed:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    }, 250);
  };

  const handleDownloadPDF = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>PairUp_Statement_${txRefId}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 14mm 16mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
              background: #ffffff;
              padding: 16px 20px;
              font-size: 13px;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              page-break-after: always;
              break-after: page;
              min-height: 250mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
            }
            .page:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .mono {
              font-family: monospace;
            }
            .invoice-box {
              width: 250px;
            }
            .invoice-banner {
              background: #eceff1;
              color: #111827;
              font-size: 15px;
              font-weight: 800;
              letter-spacing: 0.22em;
              text-align: center;
              padding: 9px 12px;
              margin-bottom: 16px;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              line-height: 1.6;
            }
            .meta-table td {
              padding: 2px 0;
            }
            .meta-table td.label {
              font-weight: 600;
              color: #111827;
              text-transform: uppercase;
              font-size: 11.5px;
            }
            .meta-table td.val {
              text-align: right;
              color: #111827;
            }
            .meta-table td.val.mono {
              font-family: monospace;
              font-size: 12px;
            }
            .meta-table td.val.bold {
              font-weight: 700;
            }
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
              border: 1px solid #94a3b8;
              font-size: 12.5px;
            }
            .invoice-table th {
              background: #f1f5f9;
              color: #1e293b;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.03em;
              padding: 10px 14px;
              border-bottom: 1px solid #94a3b8;
            }
            .invoice-table th.right, .invoice-table td.right {
              text-align: right;
            }
            .invoice-table td {
              padding: 14px 14px;
              border-bottom: 1px solid #cbd5e1;
              vertical-align: top;
            }
            .sub-details {
              padding-left: 20px;
              margin-top: 5px;
              font-size: 12px;
              line-height: 1.55;
              color: #1e293b;
            }
            .total-row td {
              border-top: 1px solid #94a3b8;
              border-bottom: 1px solid #94a3b8;
              font-weight: 700;
              font-size: 13px;
              color: #111827;
              padding: 12px 14px;
            }
            .header-grid {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
              width: 100%;
            }
            .header-left {
              flex: 1;
              max-width: 440px;
            }
            .parties-block {
              display: grid;
              grid-template-columns: 65px 1fr;
              gap: 8px 12px;
              font-size: 13px;
              color: #111827;
              line-height: 1.4;
            }
            .party-tag {
              font-weight: 700;
              color: #111827;
            }
          </style>
        </head>
        <body>
          <!-- PAGE 1: Transaction Summary -->
          <div class="page">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px;">
                <div>
                  <h1 style="font-size: 26px; font-weight: 700; color: #111827; line-height: 1.2;">Transaction summary</h1>
                  <div style="font-size: 13px; color: #374151; margin-top: 6px;">Transaction ID # ${txRefId}</div>
                </div>
                <div>
                  ${pairUpLogoSvg}
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(5, auto); justify-content: space-between; align-items: flex-start; margin: 24px 0 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
                <div>
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Date</div>
                  <div style="font-size: 13.5px; font-weight: 600; color: #111827;">${dateStr}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Type</div>
                  <div style="font-size: 13.5px; font-weight: 600; color: #111827;">${typeLabel}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Contract</div>
                  <div style="font-size: 13.5px; font-weight: 600; color: #111827; max-width: 220px; word-break: break-word;">${contractTitle}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Client</div>
                  <div style="font-size: 13.5px; font-weight: 600; color: #111827;">${clientName}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Amount</div>
                  <div style="font-size: 14.5px; font-weight: 700; color: #111827; font-family: monospace;">${netEarnings.toFixed(2)}</div>
                </div>
              </div>

              <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 20px 24px; margin-top: 10px;">
                <div style="font-size: 17px; font-weight: 700; color: #111827; margin-bottom: 16px;">Earnings and fees</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <thead>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <th style="text-align: left; padding: 8px 10px; font-weight: 600; color: #4b5563; font-size: 12px; width: 20%;">Date</th>
                      <th style="text-align: left; padding: 8px 10px; font-weight: 600; color: #4b5563; font-size: 12px; width: 48%;">Description</th>
                      <th style="text-align: left; padding: 8px 10px; font-weight: 600; color: #4b5563; font-size: 12px; width: 16%;">Invoice</th>
                      <th style="text-align: right; padding: 8px 10px; font-weight: 600; color: #4b5563; font-size: 12px; width: 16%;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                      <td style="padding: 12px 10px; color: #374151;">${dateStr}</td>
                      <td style="padding: 12px 10px;">
                        <div style="font-weight: 600; color: #111827;">${isFixedPrice ? 'Contract earnings' : 'Session earnings'}</div>
                        <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">${contractTitle}</div>
                      </td>
                      <td style="padding: 12px 10px; color: #2563eb; font-weight: 500;">Attached</td>
                      <td style="padding: 12px 10px; text-align: right; font-family: monospace; font-weight: 600; color: #111827;">
                        ${gross.toFixed(2)}
                      </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e5e7eb; vertical-align: top;">
                      <td style="padding: 12px 10px; color: #374151;">${dateStr}</td>
                      <td style="padding: 12px 10px;">
                        <div style="font-weight: 500; color: #111827;">Service fee</div>
                        <div style="font-size: 12px; color: #6b7280; font-family: monospace;">${gross.toFixed(2)} x ${displayCommPct.toFixed(1)}% = ${serviceFee.toFixed(2)}</div>
                        <div style="font-weight: 500; color: #111827; margin-top: 14px;">GST (IN) service fee</div>
                        <div style="font-size: 12px; color: #6b7280; font-family: monospace;">${serviceFee.toFixed(2)} x ${displayTaxPct.toFixed(1)}% = ${gstServiceFee.toFixed(2)}</div>
                      </td>
                      <td style="padding: 12px 10px; color: #2563eb; font-weight: 500;">
                        <div>Attached</div>
                        <div style="margin-top: 28px;">Attached</div>
                      </td>
                      <td style="padding: 12px 10px; text-align: right; font-family: monospace; color: #111827;">
                        <div>-${serviceFee.toFixed(2)}</div>
                        <div style="margin-top: 28px;">-${gstServiceFee.toFixed(2)}</div>
                      </td>
                    </tr>
                    <tr style="vertical-align: middle;">
                      <td colspan="3" style="padding: 16px 10px; font-weight: 700; font-size: 14px; color: #111827;">
                        Net earnings
                      </td>
                      <td style="padding: 16px 10px; text-align: right; font-family: monospace; font-weight: 700; font-size: 15px; color: #111827;">
                        ${netEarnings.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style="padding-top: 16px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; border-top: 1px solid #f3f4f6;">
              <div>Generated via PairUp Platform. Valid without signature.</div>
              <div>Page 1 of 3 • Ref: ${txRefId}</div>
            </div>
          </div>

          <!-- PAGE 2: Client Session / Contract Earnings Invoice -->
          <div class="page">
            <div>
              <div class="header-grid" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; width: 100%;">
                <div class="header-left" style="flex: 1; max-width: 440px;">
                  <div class="parties-block">
                    <div class="party-tag">From:</div>
                    <div>
                      <div>${mentorName}</div>
                      <div>${mentorAddress1}</div>
                      <div>${mentorAddress2}</div>
                      <div>India</div>
                    </div>

                    <div class="party-tag" style="margin-top: 18px;">Bill to:</div>
                    <div style="margin-top: 18px;">
                      <div>Attn: ${clientName}</div>
                      <div>Business Name:</div>
                      <div>${clientName}</div>
                      <div>India</div>
                    </div>
                  </div>
                </div>

                <div class="invoice-box" style="width: 250px; flex-shrink: 0;">
                  <div class="invoice-banner">INVOICE</div>
                  <table class="meta-table">
                    <tr>
                      <td class="label">TRANSACTION ID</td>
                      <td class="val mono">${txRefId}</td>
                    </tr>
                    <tr>
                      <td class="label">INVOICE #</td>
                      <td class="val mono">T${earningsInvoiceNum}</td>
                    </tr>
                    <tr>
                      <td class="label">DATE</td>
                      <td class="val">${dateStr}</td>
                    </tr>
                    <tr>
                      <td class="label">DUE DATE</td>
                      <td class="val">${dueDateStr}</td>
                    </tr>
                    <tr>
                      <td class="label bold">TOTAL AMOUNT</td>
                      <td class="val mono bold">₹${gross.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td class="label bold">TOTAL DUE</td>
                      <td class="val mono bold">₹${gross.toFixed(2)}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <table class="invoice-table">
                <thead>
                  <tr>
                    <th style="width: 82%;">DESCRIPTION / MEMO</th>
                    <th class="right" style="width: 18%;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style="font-weight: 600;">${isFixedPrice ? 'Contract earnings' : 'Session earnings'}</div>
                      <div class="sub-details">
                        <div>Contract ID: ${bookingContractId}</div>
                        <div>Contract title: ${contractTitle}</div>
                        <div>Client: ${clientName}</div>
                        <div>Provider: ${mentorName}</div>
                        <div>Amount: ₹${gross.toFixed(2)} INR</div>
                        <div>Notes: Invoice from PairUp for T${txRefId}</div>
                      </div>
                    </td>
                    <td class="right" style="font-family: monospace; font-size: 13px;">
                      ${gross.toFixed(2)}
                    </td>
                  </tr>
                  <tr class="total-row">
                    <td style="text-transform: uppercase;">TOTAL AMOUNT:</td>
                    <td class="right" style="font-family: monospace; font-size: 14px;">
                      ₹${gross.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 13px; color: #4b5563;">Invoice created via</span>
                  ${pairUpLogoSvg}
                </div>
                <div style="width: 250px; background: #eceff1; padding: 12px 16px; border: 1px solid #d2d6dc; font-size: 12px; line-height: 1.45;">
                  <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 4px; letter-spacing: 0.05em; color: #111827;">REMIT TO:</div>
                  <div>PairUp Global LLC</div>
                  <div>530 Lytton Avenue, Suite 301</div>
                  <div>Palo Alto, CA 94301</div>
                  <div>USA</div>
                </div>
              </div>
              <div style="padding-top: 12px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; border-top: 1px solid #f3f4f6;">
                <div>Valid without signature. Electronic statement.</div>
                <div>Page 2 of 3 • Ref: ${txRefId}</div>
              </div>
            </div>
          </div>

          <!-- PAGE 3: Service Fee Tax Invoice -->
          <div class="page">
            <div>
              <div class="header-grid" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; width: 100%;">
                <div class="header-left" style="flex: 1; max-width: 440px;">
                  <div style="margin-bottom: 18px;">
                    ${pairUpLogoSvg}
                  </div>
                  <div class="parties-block">
                    <div class="party-tag">From:</div>
                    <div>
                      <div>PairUp Global LLC</div>
                      <div>530 Lytton Avenue, Suite 301</div>
                      <div>Palo Alto, CA 94301</div>
                      <div>USA</div>
                      <div style="margin-top: 12px;">GST ID: 29PAIRUP1234F1Z0</div>
                    </div>

                    <div class="party-tag" style="margin-top: 18px;">Bill to:</div>
                    <div style="margin-top: 18px;">
                      <div>Attn: ${mentorName}</div>
                      <div>Business Name:</div>
                      <div>${mentorName}</div>
                      <div>${mentorAddress1}</div>
                      <div>${mentorAddress2}</div>
                      <div>India</div>
                    </div>
                  </div>
                </div>

                <div class="invoice-box" style="width: 250px; flex-shrink: 0;">
                  <div class="invoice-banner">INVOICE</div>
                  <table class="meta-table">
                    <tr>
                      <td class="label">TRANSACTION ID</td>
                      <td class="val mono">${txRefId}</td>
                    </tr>
                    <tr>
                      <td class="label">INVOICE #</td>
                      <td class="val mono">T${invoiceNum}</td>
                    </tr>
                    <tr>
                      <td class="label">DATE</td>
                      <td class="val">${dateStr}</td>
                    </tr>
                    <tr>
                      <td class="label">DUE DATE</td>
                      <td class="val">${dueDateStr}</td>
                    </tr>
                    <tr>
                      <td class="label bold">TOTAL AMOUNT</td>
                      <td class="val mono bold">₹${totalFee.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td class="label bold">TOTAL DUE</td>
                      <td class="val mono bold">₹${totalFee.toFixed(2)}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <table class="invoice-table">
                <thead>
                  <tr>
                    <th style="width: 82%;">DESCRIPTION / MEMO</th>
                    <th class="right" style="width: 18%;">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style="font-weight: 600;">Service Fee</div>
                      <div class="sub-details">
                        <div>Contract ID: ${bookingContractId}</div>
                        <div>Contract title: ${contractTitle}</div>
                        <div>Client: ${clientName}</div>
                        <div>Amount:</div>
                        <div>₹${gross.toFixed(2)} INR x ${displayCommPct.toFixed(1)}% = ₹${serviceFee.toFixed(2)} INR</div>
                        <div>Notes: Invoice from PairUp for T${notesRefId}</div>
                      </div>
                    </td>
                    <td class="right" style="font-family: monospace; font-size: 13px;">
                      ${serviceFee.toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div style="font-weight: 600;">GST (IN) - Service Fee - Ref ID ${gstRefId}</div>
                      <div class="sub-details">
                        <div>Country: IN</div>
                        <div>Amount: ₹${serviceFee.toFixed(2)} INR x ${displayTaxPct.toFixed(2)}% = ₹${gstServiceFee.toFixed(2)} INR</div>
                      </div>
                    </td>
                    <td class="right" style="font-family: monospace; font-size: 13px;">
                      ${gstServiceFee.toFixed(2)}
                    </td>
                  </tr>
                  <tr class="total-row">
                    <td style="text-transform: uppercase;">TOTAL AMOUNT:</td>
                    <td class="right" style="font-family: monospace; font-size: 14px;">
                      ₹${totalFee.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="padding-top: 16px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; border-top: 1px solid #f3f4f6;">
              <div>PairUp Global LLC • GST Registered Intermediary</div>
              <div>Page 3 of 3 • Ref: ${txRefId}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Print failed:', e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    }, 250);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="720px"
    >
      <div
        ref={printableRef}
        className="printable-invoice-wrap"
        style={{
          color: 'var(--ink, #12141c)',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '6px 2px 14px',
        }}
      >
        {/* Top Summary Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, auto)',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted, #5b6270)', marginBottom: '4px' }}>Date</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink, #12141c)' }}>{dateStr}</div>
          </div>

          <div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted, #5b6270)', marginBottom: '4px' }}>Type</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink, #12141c)' }}>{typeLabel}</div>
          </div>

          <div>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted, #5b6270)', marginBottom: '4px' }}>
              {isWithdrawal ? 'Destination' : 'Client'}
            </div>
            {isWithdrawal ? (
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink, #12141c)' }}>
                {transaction.counterparty || 'Bank Transfer •••• 4991'}
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--grid, #e3e6ec)',
                    border: '1px solid var(--grid-strong, #d2d6e0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--ink, #12141c)',
                  }}
                >
                  {clientInitial}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink, #12141c)' }}>
                  {clientName}
                </span>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: 'var(--ink-muted, #5b6270)', marginBottom: '4px' }}>Amount</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: isWithdrawal ? 'var(--danger, #dc2626)' : 'var(--add, #157f53)',
                fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
              }}
            >
              {isWithdrawal ? '-' : '+'}{formatCurrency(isWithdrawal ? gross : netEarnings)}
            </div>
          </div>
        </div>

        {/* Action Links Bar: Go to contract / Download PDF */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '22px',
            fontSize: '13.5px',
          }}
        >
          <div>
            {transaction.contractId ? (
              <Link
                to={`/contracts/${transaction.contractId}`}
                style={{
                  color: 'var(--add, #157f53)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Go to contract</span>
                <ChevronRightIcon size={14} />
              </Link>
            ) : transaction.bookingId ? (
              <Link
                to={`/session/${transaction.bookingId}`}
                style={{
                  color: 'var(--add, #157f53)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Go to session</span>
                <ChevronRightIcon size={14} />
              </Link>
            ) : (
              <span style={{ color: 'var(--ink-muted, #5b6270)', fontSize: '13px' }}>
                Ref: {transaction.refId || `TX-${transaction.id}`}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleDownloadPDF}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--add, #157f53)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
            }}
          >
            <DownloadIcon size={15} />
            <span>Download PDF</span>
          </button>
        </div>

        {/* Card 1: Earnings / Payout status */}
        <div
          style={{
            background: 'var(--bg, #f6f7fa)',
            border: '1px solid var(--grid-strong, #d2d6e0)',
            borderRadius: '12px',
            padding: '16px 18px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink, #12141c)' }}>
              {isWithdrawal ? 'Withdrawal status' : 'Earnings status'}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'var(--grid, #e3e6ec)',
                color: 'var(--ink, #12141c)',
                border: '1px solid var(--border, #d2d6e0)',
                textTransform: 'capitalize',
              }}
            >
              {transaction.status === 'released' ? 'Added' : (transaction.status || 'Added')}
            </span>
          </div>

          {/* Green Status Banner */}
          <div
            style={{
              background: 'var(--add-bg, #e7f6ef)',
              border: '1px solid var(--add, #157f53)',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--add, #157f53)',
            }}
          >
            <CheckCircleIcon size={18} style={{ color: 'var(--add, #157f53)', flexShrink: 0 }} />
            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>
              {isWithdrawal
                ? `Disbursed to destination on ${dateStr}`
                : `Added to balance ${dateStr}`}
            </span>
          </div>
        </div>

        {/* Card 2: Earnings and fees Table */}
        {!isWithdrawal ? (
          <div
            style={{
              background: 'var(--bg, #f6f7fa)',
              border: '1px solid var(--grid-strong, #d2d6e0)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink, #12141c)', marginBottom: '16px' }}>
              Earnings and fees
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--grid-strong, #d2d6e0)', color: 'var(--ink-muted, #5b6270)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 0', fontWeight: 600, width: '22%' }}>Date</th>
                  <th style={{ padding: '8px 0', fontWeight: 600, width: '48%' }}>Description</th>
                  <th className="no-print" style={{ padding: '8px 0', fontWeight: 600, width: '12%', textAlign: 'center' }}>Invoice</th>
                  <th style={{ padding: '8px 0', fontWeight: 600, width: '18%', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Row 1: Contract earnings */}
                <tr style={{ borderBottom: '1px solid var(--grid, #e3e6ec)' }}>
                  <td style={{ padding: '14px 0', verticalAlign: 'top', color: 'var(--ink, #12141c)' }}>
                    {dateStr}
                  </td>
                  <td style={{ padding: '14px 0', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink, #12141c)' }}>
                      {transaction.contractId ? 'Contract earnings' : 'Session earnings'}
                    </div>
                    {transaction.contractTitle && (
                      <div style={{ fontSize: '12px', color: 'var(--ink-muted, #5b6270)', marginTop: '2px' }}>
                        {transaction.contractTitle} {transaction.milestoneTitle ? `• ${transaction.milestoneTitle}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="no-print" style={{ padding: '14px 0', verticalAlign: 'top', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setEarningsInvoiceModalOpen(true)}
                      title="View / Download Invoice"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--add, #157f53)',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      <DownloadIcon size={16} />
                    </button>
                  </td>
                  <td
                    style={{
                      padding: '14px 0',
                      verticalAlign: 'top',
                      textAlign: 'right',
                      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
                      fontWeight: 600,
                      color: 'var(--ink, #12141c)',
                    }}
                  >
                    +{formatCurrency(gross)}
                  </td>
                </tr>

                {/* Row 2: Service fee & GST on Service fee */}
                <tr style={{ borderBottom: '1px solid var(--grid-strong, #d2d6e0)' }}>
                  <td style={{ padding: '14px 0', verticalAlign: 'top', color: 'var(--ink, #12141c)' }}>
                    {dateStr}
                  </td>
                  <td style={{ padding: '14px 0', verticalAlign: 'top' }}>
                    {/* Service Fee Line */}
                    <div style={{ fontWeight: 500, color: 'var(--ink, #12141c)' }}>Service fee</div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--ink-muted, #5b6270)',
                        fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
                        marginTop: '2px',
                      }}
                    >
                      {formatCurrency(gross)} x {displayCommPct.toFixed(1)}% = {formatCurrency(serviceFee)}
                    </div>

                    {/* GST on Service Fee Line */}
                    <div style={{ marginTop: '12px', fontWeight: 500, color: 'var(--ink, #12141c)' }}>
                      GST (IN) service fee
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--ink-muted, #5b6270)',
                        fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
                        marginTop: '2px',
                      }}
                    >
                      {formatCurrency(serviceFee)} x {displayTaxPct.toFixed(1)}% = {formatCurrency(gstServiceFee)}
                    </div>
                  </td>
                  <td className="no-print" style={{ padding: '14px 0', verticalAlign: 'top', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setFeeInvoiceModalOpen(true)}
                      title="View / Download Fee Invoice"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--add, #157f53)',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      <DownloadIcon size={16} />
                    </button>
                  </td>
                  <td
                    style={{
                      padding: '14px 0',
                      verticalAlign: 'top',
                      textAlign: 'right',
                      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
                      fontWeight: 500,
                      color: 'var(--danger, #dc2626)',
                    }}
                  >
                    <div>-{formatCurrency(serviceFee)}</div>
                    <div style={{ marginTop: '26px' }}>-{formatCurrency(gstServiceFee)}</div>
                  </td>
                </tr>

                {/* Row 3: Net Earnings Footer */}
                <tr>
                  <td colSpan={2} style={{ padding: '16px 0 6px', fontWeight: 700, fontSize: '14px', color: 'var(--ink, #12141c)' }}>
                    Net earnings
                  </td>
                  <td className="no-print"></td>
                  <td
                    style={{
                      padding: '16px 0 6px',
                      textAlign: 'right',
                      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
                      fontWeight: 800,
                      fontSize: '15px',
                      color: 'var(--add, #157f53)',
                    }}
                  >
                    +{formatCurrency(netEarnings)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          /* Withdrawal Details Card */
          <div
            style={{
              background: 'var(--bg, #f6f7fa)',
              border: '1px solid var(--grid-strong, #d2d6e0)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink, #12141c)', marginBottom: '14px' }}>
              Disbursement Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--grid, #e3e6ec)' }}>
                <span style={{ color: 'var(--ink-muted, #5b6270)' }}>Destination Account:</span>
                <span style={{ fontWeight: 600, color: 'var(--ink, #12141c)' }}>
                  {transaction.counterparty || 'Bank Transfer •••• 4991'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--grid, #e3e6ec)' }}>
                <span style={{ color: 'var(--ink-muted, #5b6270)' }}>Transfer Fee:</span>
                <span style={{ fontWeight: 600, color: 'var(--ink, #12141c)' }}>₹0.00 (Free)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', fontSize: '14px' }}>
                <span style={{ fontWeight: 700, color: 'var(--ink, #12141c)' }}>Net Disbursed:</span>
                <span style={{ fontWeight: 800, color: 'var(--danger, #dc2626)', fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}>
                  -{formatCurrency(gross)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Close Footer */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>

    {/* Service Fee Tax Invoice Modal (Upwork Layout matching User Image 1) */}
    {feeInvoiceModalOpen && (
      <Modal
        isOpen={feeInvoiceModalOpen}
        onClose={() => setFeeInvoiceModalOpen(false)}
        title="Tax Invoice"
        maxWidth="840px"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--grid)', paddingBottom: '12px' }}>
          <div>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              Official Platform Fee &amp; GST Statement (Mentor Copy)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 14px' }}
              onClick={handlePrintServiceFeeInvoice}
            >
              <DownloadIcon size={14} /> Print / Download PDF
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '12.5px', padding: '6px 12px' }}
              onClick={() => setFeeInvoiceModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Paper Document - Styled identically to Image 1 */}
        <div
          style={{
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '36px 40px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Header row: Logo & Addresses (Left), Invoice Block (Right) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              {/* Brand Logo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                <PairUpLogo variant="mark" size={26} />
                <span
                  style={{
                    fontSize: '30px',
                    fontWeight: 800,
                    color: '#111827',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  pairup
                </span>
              </div>

              {/* From & Bill to grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', gap: '6px 12px', fontSize: '13px', lineHeight: 1.45, color: '#111827' }}>
                <div style={{ fontWeight: 700 }}>From:</div>
                <div>
                  <div>PairUp Global LLC</div>
                  <div>530 Lytton Avenue, Suite 301</div>
                  <div>Palo Alto, CA 94301</div>
                  <div>USA</div>
                  <div style={{ marginTop: '12px' }}>GST ID: 29PAIRUP1234F1Z0</div>
                </div>

                <div style={{ fontWeight: 700, marginTop: '18px' }}>Bill to:</div>
                <div style={{ marginTop: '18px' }}>
                  <div>Attn: {mentorName}</div>
                  <div>Business Name:</div>
                  <div>{mentorName}</div>
                  <div>{mentorAddress1}</div>
                  <div>{mentorAddress2}</div>
                  <div>India</div>
                </div>
              </div>
            </div>

            {/* Right-hand side INVOICE box */}
            <div style={{ width: '250px' }}>
              <div
                style={{
                  background: '#eceff1',
                  color: '#111827',
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.22em',
                  textAlign: 'center',
                  padding: '9px 12px',
                  marginBottom: '16px',
                }}
              >
                INVOICE
              </div>

              <div style={{ fontSize: '12px', lineHeight: 1.65, color: '#111827' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>TRANSACTION ID</span>
                  <span className="mono" style={{ fontFamily: 'monospace' }}>{txRefId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>INVOICE #</span>
                  <span className="mono" style={{ fontFamily: 'monospace' }}>T{invoiceNum}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>DATE</span>
                  <span>{dateStr}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>DUE DATE</span>
                  <span>{dueDateStr}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontWeight: 700, fontSize: '13px' }}>
                  <span>TOTAL AMOUNT</span>
                  <span className="mono" style={{ fontFamily: 'monospace' }}>₹{totalFee.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px' }}>
                  <span>TOTAL DUE</span>
                  <span className="mono" style={{ fontFamily: 'monospace' }}>₹{totalFee.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table matching Image 1 */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #94a3b8',
              marginTop: '30px',
              fontSize: '12.5px',
            }}
          >
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #94a3b8' }}>
                <th
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontWeight: 700,
                    color: '#1e293b',
                    textTransform: 'uppercase',
                    fontSize: '11.5px',
                    letterSpacing: '0.03em',
                    width: '80%',
                  }}
                >
                  DESCRIPTION / MEMO
                </th>
                <th
                  style={{
                    padding: '10px 14px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#1e293b',
                    textTransform: 'uppercase',
                    fontSize: '11.5px',
                    letterSpacing: '0.03em',
                    width: '20%',
                  }}
                >
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Service Fee */}
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '14px 14px', verticalAlign: 'top', color: '#111827' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Service Fee</div>
                  <div style={{ paddingLeft: '20px', marginTop: '4px', fontSize: '12px', lineHeight: 1.55, color: '#1e293b' }}>
                    <div>Contract ID: {bookingContractId}</div>
                    <div>Contract title: {contractTitle}</div>
                    <div>Client: {clientName}</div>
                    <div>Amount:</div>
                    <div>₹{gross.toFixed(2)} INR x {displayCommPct.toFixed(1)}% = ₹{serviceFee.toFixed(2)} INR</div>
                    <div>Notes: Invoice from PairUp for T{notesRefId}</div>
                  </div>
                </td>
                <td style={{ padding: '14px 14px', verticalAlign: 'top', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                  {serviceFee.toFixed(2)}
                </td>
              </tr>

              {/* Row 2: GST on Service Fee */}
              <tr style={{ borderBottom: '1px solid #94a3b8' }}>
                <td style={{ padding: '14px 14px', verticalAlign: 'top', color: '#111827' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    GST (IN) - Service Fee - Ref ID {gstRefId}
                  </div>
                  <div style={{ paddingLeft: '20px', marginTop: '4px', fontSize: '12px', lineHeight: 1.55, color: '#1e293b' }}>
                    <div>Country: IN</div>
                    <div>Amount: ₹{serviceFee.toFixed(2)} INR x {displayTaxPct.toFixed(2)}% = ₹{gstServiceFee.toFixed(2)} INR</div>
                  </div>
                </td>
                <td style={{ padding: '14px 14px', verticalAlign: 'top', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                  {gstServiceFee.toFixed(2)}
                </td>
              </tr>

              {/* Bottom Row: Total Amount */}
              <tr style={{ fontWeight: 700 }}>
                <td style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: '12.5px', color: '#111827' }}>
                  TOTAL AMOUNT:
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13.5px', color: '#111827' }}>
                  ₹{totalFee.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    )}

    {/* Earnings Tax Invoice Modal (Upwork Layout matching Image 1 - showing ONLY Row 1 transaction) */}
    {earningsInvoiceModalOpen && (
      <Modal
        isOpen={earningsInvoiceModalOpen}
        onClose={() => setEarningsInvoiceModalOpen(false)}
        title="Tax Invoice"
        maxWidth="840px"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--grid)', paddingBottom: '12px' }}>
          <div>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              Official Contract Earnings Invoice (Client Copy)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 14px' }}
              onClick={handlePrintEarningsInvoice}
            >
              <DownloadIcon size={14} /> Print / Download PDF
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '12.5px', padding: '6px 12px' }}
              onClick={() => setEarningsInvoiceModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Paper Document - Styled identically to Image 1 */}
        <div
          style={{
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '36px 40px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Header row: Logo & Addresses (Left), Invoice Block (Right) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              {/* Brand Logo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                <PairUpLogo variant="mark" size={26} />
                <span
                  style={{
                    fontSize: '30px',
                    fontWeight: 800,
                    color: '#111827',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  pairup
                </span>
              </div>

              {/* From & Bill to grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', gap: '6px 12px', fontSize: '13px', lineHeight: 1.45, color: '#111827' }}>
                <div style={{ fontWeight: 700 }}>From:</div>
                <div>
                  <div>{mentorName}</div>
                  <div>{mentorAddress1}</div>
                  <div>{mentorAddress2}</div>
                  <div>India</div>
                </div>

                <div style={{ fontWeight: 700, marginTop: '18px' }}>Bill to:</div>
                <div style={{ marginTop: '18px' }}>
                  <div>Attn: {clientName}</div>
                  <div>Business Name:</div>
                  <div>{clientName}</div>
                  <div>India</div>
                </div>
              </div>
            </div>

            {/* Right-hand side INVOICE box */}
            <div style={{ width: '250px' }}>
              <div
                style={{
                  background: '#eceff1',
                  color: '#111827',
                  fontSize: '15px',
                  fontWeight: 800,
                  letterSpacing: '0.22em',
                  textAlign: 'center',
                  padding: '9px 12px',
                  marginBottom: '16px',
                }}
              >
                INVOICE
              </div>

              <div style={{ fontSize: '12px', lineHeight: 1.65, color: '#111827' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>TRANSACTION ID</span>
                  <span className="mono" style={{ fontFamily: 'monospace' }}>{txRefId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>INVOICE #</span>
                  <span className="mono" style={{ fontFamily: 'monospace' }}>T{earningsInvoiceNum}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>DATE</span>
                  <span>{dateStr}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>DUE DATE</span>
                  <span>{dueDateStr}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontWeight: 700, fontSize: '13px' }}>
                  <span>TOTAL AMOUNT</span>
                  <span className="mono" style={{ fontFamily: 'monospace' }}>₹{gross.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px' }}>
                  <span>TOTAL DUE</span>
                  <span className="mono" style={{ fontFamily: 'monospace' }}>₹{gross.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table matching Image 1 - showing ONLY Row 1 transaction */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #94a3b8',
              marginTop: '30px',
              fontSize: '12.5px',
            }}
          >
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #94a3b8' }}>
                <th
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontWeight: 700,
                    color: '#1e293b',
                    textTransform: 'uppercase',
                    fontSize: '11.5px',
                    letterSpacing: '0.03em',
                    width: '80%',
                  }}
                >
                  DESCRIPTION / MEMO
                </th>
                <th
                  style={{
                    padding: '10px 14px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#1e293b',
                    textTransform: 'uppercase',
                    fontSize: '11.5px',
                    letterSpacing: '0.03em',
                    width: '20%',
                  }}
                >
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Single Transaction Row: Session / Contract Earnings */}
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '14px 14px', verticalAlign: 'top', color: '#111827' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {isFixedPrice ? 'Contract earnings' : 'Session earnings'}
                  </div>
                  <div style={{ paddingLeft: '20px', marginTop: '4px', fontSize: '12px', lineHeight: 1.55, color: '#1e293b' }}>
                    <div>Contract ID: {bookingContractId}</div>
                    <div>Contract title: {contractTitle}</div>
                    <div>Client: {clientName}</div>
                    <div>Provider: {mentorName}</div>
                    <div>Amount: ₹{gross.toFixed(2)} INR</div>
                    <div>Notes: Invoice from PairUp for T{txRefId}</div>
                  </div>
                </td>
                <td style={{ padding: '14px 14px', verticalAlign: 'top', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                  {gross.toFixed(2)}
                </td>
              </tr>

              {/* Bottom Row: Total Amount */}
              <tr style={{ fontWeight: 700 }}>
                <td style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: '12.5px', color: '#111827' }}>
                  TOTAL AMOUNT:
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13.5px', color: '#111827' }}>
                  ₹{gross.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bottom row: Created via PairUp (Left) & Remit To (Right) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: '40px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#4b5563' }}>Invoice created via</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <PairUpLogo variant="mark" size={20} />
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#111827',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  pairup
                </span>
              </div>
            </div>
            <div
              style={{
                width: '250px',
                background: '#eceff1',
                padding: '12px 16px',
                border: '1px solid #d2d6dc',
                fontSize: '12px',
                lineHeight: 1.45,
                color: '#111827',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  marginBottom: '4px',
                  letterSpacing: '0.05em',
                  color: '#111827',
                }}
              >
                REMIT TO:
              </div>
              <div>PairUp Global LLC</div>
              <div>530 Lytton Avenue, Suite 301</div>
              <div>Palo Alto, CA 94301</div>
              <div>USA</div>
            </div>
          </div>
        </div>
      </Modal>
    )}
  </>
  );
}
