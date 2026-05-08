import Handlebars from 'handlebars';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─────────────────────────────────────────────────────────────────
// Handlebars HTML Template (for on-screen preview)
// ─────────────────────────────────────────────────────────────────
const templateSource = `
<div id="letter-content" style="padding: 60px; font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; width: 794px; line-height: 1.6; border: 1px solid #eee; margin: auto;">
  <div style="text-align: center; border-bottom: 2px solid #C75A57; padding-bottom: 15px; margin-bottom: 30px;">
    <h2 style="margin: 0; font-size: 24px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">{{headerLine1}}</h2>
    <h3 style="margin: 5px 0; font-size: 20px; color: #C75A57; text-transform: uppercase; font-weight: bold;">{{headerLine2}}</h3>
    <p style="margin: 5px 0; font-size: 14px; font-weight: 600;">{{headerLine3}}</p>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 40px; font-weight: bold; font-size: 14px;">
    <span>REF NO: CCPS/JP/NOTICE/{{year}}/{{refId}}</span>
    <span>DATE: {{date}}</span>
  </div>

  <div style="margin-bottom: 40px; font-size: 15px;">
    <p style="margin-bottom: 5px;">TO,</p>
    <p style="font-weight: bold; text-transform: uppercase; margin: 0;">THE NODAL OFFICER / BRANCH MANAGER,</p>
    <p style="font-weight: bold; text-transform: uppercase; margin: 0;">{{bankName}},</p>
    <p style="font-weight: bold; text-transform: uppercase; margin: 0;">INDIA.</p>
  </div>

  <div style="margin-bottom: 30px; font-size: 15px; font-weight: bold; text-align: justify; border-bottom: 1px solid #000; display: inline-block;">
    {{subjectText}}
  </div>

  <div style="margin-bottom: 25px; font-size: 15px; text-align: justify;">
    <p>Respected Sir/Madam,</p>
    <p style="margin-top: 15px;">
      {{bodyText}}
    </p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; border: 1.5px solid #333;">
    <thead>
      <tr style="background: #f8f9fa;">
        <th style="border: 1px solid #333; padding: 12px; text-align: left; width: 60px;">S.No.</th>
        <th style="border: 1px solid #333; padding: 12px; text-align: left;">Account Number</th>
        <th style="border: 1px solid #333; padding: 12px; text-align: left;">Transaction ID / UTR</th>
        <th style="border: 1px solid #333; padding: 12px; text-align: right; width: 120px;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      {{#each records}}
      <tr>
        <td style="border: 1px solid #333; padding: 10px; text-align: center;">{{add @index 1}}</td>
        <td style="border: 1px solid #333; padding: 10px; font-weight: bold;">{{accountNumber}}</td>
        <td style="border: 1px solid #333; padding: 10px; font-family: monospace; font-size: 13px;">{{transactionId}}</td>
        <td style="border: 1px solid #333; padding: 10px; text-align: right; font-weight: bold;">{{amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  {{#if hasSuspiciousRouting}}
  <div style="margin-bottom: 20px; padding: 12px 18px; background: #fff0f0; border-left: 4px solid #C75A57; font-size: 13px; font-weight: bold; color: #C75A57;">
    ⚠ Fund flow analysis indicates suspicious layering/routing pattern across the above accounts.
  </div>
  {{/if}}

  <div style="margin-bottom: 30px; font-size: 15px; text-align: justify;">
    <p>In view of the above, you are hereby requested to provide the following details immediately:</p>
    <ul style="margin: 15px 0 15px 30px; list-style-type: disc;">
      <li style="margin-bottom: 5px;">Certified copy of account statement (from {{startDate}} to {{endDate}})</li>
      <li style="margin-bottom: 5px;">Certified copy of account opening form and KYC documents</li>
      <li style="margin-bottom: 5px;">Linked mobile number and email ID</li>
      <li>IP login logs and ATM card details</li>
    </ul>
    <p style="font-weight: bold; color: #C75A57; border: 1px dashed #C75A57; padding: 15px; background: #fff8f8; text-transform: uppercase; font-size: 13px;">
      {{footerText}}
    </p>
  </div>

  <div style="margin-top: 60px; text-align: right; font-size: 15px; padding-right: 20px;">
    <p style="font-weight: bold; margin: 0; text-transform: uppercase;">INVESTIGATION OFFICER</p>
    <p style="margin: 0;">Cyber Crime Police Station</p>
    <p style="margin: 0;">Jaipur, Rajasthan</p>
  </div>
</div>
`;

Handlebars.registerHelper('add', (index, val) => index + val);

export const generateLetterHtml = (data) => {
  const template = Handlebars.compile(templateSource);
  return template(data);
};

export const downloadPdf = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  // Multi-page support for single letter preview
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position -= pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(filename);
};

// ─────────────────────────────────────────────────────────────────
// CORE PDF GENERATOR (jsPDF Direct Rendering)
// High-fidelity, multi-page, auto-paginating per-bank letter
// ─────────────────────────────────────────────────────────────────

const MARGIN = 20;
const PAGE_HEIGHT = 297; // A4 mm
const FOOTER_RESERVE = 30; // Reserve space at bottom for margins

/**
 * Renders the official letter header on the current page
 */
const renderLetterHeader = (pdf, data) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 20;

  // === Header Block ===
  pdf.setFont('times', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  const head1 = data.headerLine1 || 'OFFICE OF THE DEPUTY SUPERITENDENT OF POLICE';
  const head1Lines = pdf.splitTextToSize(head1, pageWidth - (2 * MARGIN));
  pdf.text(head1Lines, pageWidth / 2, y, { align: 'center' });
  y += (head1Lines.length * 7) + 1;

  pdf.setTextColor(199, 90, 87);
  pdf.setFontSize(15);
  const head2 = data.headerLine2 || 'STATION, JAIPUR, RAJASTHAN, INDIA';
  pdf.text(head2, pageWidth / 2, y, { align: 'center' });
  y += 6;

  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(10);
  pdf.setFont('times', 'normal');
  const head3 = data.headerLine3 || 'Ghat Gate, Agra Road, Jaipur, Rajasthan 302003';
  pdf.text(head3, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Divider line
  pdf.setDrawColor(199, 90, 87);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 14;

  // === Ref No & Date ===
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont('times', 'bold');
  pdf.text(`REF NO: CCPS/JP/NOTICE/${data.year}/${data.refId}`, MARGIN, y);
  pdf.text(`DATE: ${data.date}`, pageWidth - MARGIN, y, { align: 'right' });
  y += 16;

  // === Recipient ===
  pdf.setFont('times', 'normal');
  pdf.setFontSize(12);
  pdf.text('TO,', MARGIN, y);
  y += 7;
  pdf.setFont('times', 'bold');
  pdf.text('THE NODAL OFFICER / BRANCH MANAGER,', MARGIN, y);
  y += 7;
  pdf.text(`${data.bankName},`, MARGIN, y);
  y += 7;
  pdf.text('INDIA.', MARGIN, y);
  y += 14;

  // === Subject ===
  pdf.setFont('times', 'bold');
  pdf.setFontSize(11);
  const subText = data.subjectText || 'SUBJECT: NOTICE UNDER SECTION 94/106 BNSS 2023 - REQUEST FOR INFORMATION AND DEBIT FREEZE OF FRAUDULENT ACCOUNT(S).';
  const subLines = pdf.splitTextToSize(subText, pageWidth - (2 * MARGIN));
  pdf.text(subLines, MARGIN, y);
  y += (subLines.length * 6) + 10;

  // === Body Text ===
  pdf.setFont('times', 'normal');
  pdf.setFontSize(11);
  pdf.text('Respected Sir/Madam,', MARGIN, y);
  y += 10;

  const bodyText = data.bodyText || 'This is to inform you that a cyber crime investigation is currently underway regarding multiple fraudulent transactions. During technical analysis, the following account(s) held in your bank have been identified as involved in the receipt/transfer of misappropriated funds:';
  const bodyLines = pdf.splitTextToSize(bodyText, pageWidth - (2 * MARGIN));
  pdf.text(bodyLines, MARGIN, y);
  y += (bodyLines.length * 5.5) + 10;

  return y;
};

/**
 * Renders the footer section (request text + signature)
 */
const renderLetterFooter = (pdf, data, startY) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = startY + 5;

  // Check if footer fits on current page
  const footerHeight = 95;
  if (y + footerHeight > PAGE_HEIGHT - FOOTER_RESERVE) {
    pdf.addPage();
    y = MARGIN + 10;
  }

  // Suspicious routing warning
  if (data.hasSuspiciousRouting) {
    pdf.setFillColor(255, 240, 240);
    pdf.rect(MARGIN, y - 3, pageWidth - (2 * MARGIN), 12, 'F');
    pdf.setDrawColor(199, 90, 87);
    pdf.setLineWidth(0.8);
    pdf.line(MARGIN, y - 3, MARGIN, y + 9);
    pdf.setTextColor(199, 90, 87);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9);
    pdf.text('Fund flow analysis indicates suspicious layering/routing pattern across the above accounts.', MARGIN + 5, y + 5);
    y += 18;
  }

  // "In view of the above..." paragraph
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('times', 'normal');
  pdf.setFontSize(11);
  pdf.text('In view of the above, you are hereby requested to provide the following details immediately:', MARGIN, y);
  y += 10;

  // Bullet points
  const bullets = [
    `Certified copy of account statement (from ${data.startDate} to ${data.endDate})`,
    'Certified copy of account opening form and KYC documents',
    'Linked mobile number and email ID',
    'IP login logs and ATM card details'
  ];
  bullets.forEach(item => {
    pdf.text(`   - ${item}`, MARGIN, y);
    y += 7;
  });

  y += 8;

  // DEBIT FREEZE warning
  pdf.setTextColor(199, 90, 87);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(10);
  const freezeText = data.footerText || 'FURTHER, YOU ARE REQUESTED TO IMMEDIATELY DEBIT FREEZE THE AFOREMENTIONED ACCOUNT(S) TO PREVENT FURTHER LOSS OF FUNDS.';
  const freezeLines = pdf.splitTextToSize(freezeText, pageWidth - (2 * MARGIN) - 10);
  pdf.text(freezeLines, MARGIN, y);
  y += (freezeLines.length * 6) + 25;

  // === Signature Block ===
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(12);
  pdf.text('INVESTIGATION OFFICER', pageWidth - MARGIN, y, { align: 'right' });
  y += 6;
  pdf.setFont('times', 'normal');
  pdf.setFontSize(11);
  pdf.text('Cyber Crime Police Station', pageWidth - MARGIN, y, { align: 'right' });
  y += 6;
  pdf.text('Jaipur, Rajasthan', pageWidth - MARGIN, y, { align: 'right' });

  return y;
};

/**
 * Renders table header row
 */
const getTableCols = (pageWidth) => {
  const tableWidth = pageWidth - (2 * MARGIN);
  const snoW = 16;
  const amtW = 42;
  const accW = Math.floor((tableWidth - snoW - amtW) * 0.48);
  const utrW = tableWidth - snoW - accW - amtW;
  return {
    tableWidth,
    sno: { x: MARGIN, w: snoW },
    acc: { x: MARGIN + snoW, w: accW },
    utr: { x: MARGIN + snoW + accW, w: utrW },
    amt: { x: MARGIN + snoW + accW + utrW, w: amtW }
  };
};

const renderTableHeader = (pdf, y) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const cols = getTableCols(pageWidth);

  const rowHeight = 10;

  // Header background
  pdf.setFillColor(245, 245, 245);
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.3);
  pdf.rect(MARGIN, y, cols.tableWidth, rowHeight, 'FD');

  // Column separators
  pdf.line(cols.acc.x, y, cols.acc.x, y + rowHeight);
  pdf.line(cols.utr.x, y, cols.utr.x, y + rowHeight);
  pdf.line(cols.amt.x, y, cols.amt.x, y + rowHeight);

  // Header text
  pdf.setFont('times', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text('S.No.', cols.sno.x + 3, y + 7);
  pdf.text('Account Number', cols.acc.x + 4, y + 7);
  pdf.text('Transaction ID / UTR', cols.utr.x + 4, y + 7);
  pdf.text('Amount (Rs.)', cols.amt.x + cols.amt.w - 4, y + 7, { align: 'right' });

  return y + rowHeight;
};

/**
 * Renders one data row in the table
 */
const renderTableRow = (pdf, y, rowData) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const cols = getTableCols(pageWidth);

  const rowHeight = 9;

  // Row border
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.15);
  pdf.rect(MARGIN, y, cols.tableWidth, rowHeight, 'D');

  // Column separators
  pdf.line(cols.acc.x, y, cols.acc.x, y + rowHeight);
  pdf.line(cols.utr.x, y, cols.utr.x, y + rowHeight);
  pdf.line(cols.amt.x, y, cols.amt.x, y + rowHeight);

  // Row data
  pdf.setFont('times', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  // S.No. (centered)
  pdf.text(rowData.sno.toString(), cols.sno.x + cols.sno.w / 2, y + 6.5, { align: 'center' });

  // Account Number (bold)
  pdf.setFont('times', 'bold');
  const accText = rowData.account.toString();
  const maxAccWidth = cols.acc.w - 8;
  const trimmedAcc = pdf.splitTextToSize(accText, maxAccWidth)[0];
  pdf.text(trimmedAcc, cols.acc.x + 4, y + 6.5);

  // UTR (monospace-style)
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(8);
  const utrText = rowData.utr.toString();
  const maxUtrWidth = cols.utr.w - 8;
  const trimmedUtr = pdf.splitTextToSize(utrText, maxUtrWidth)[0];
  pdf.text(trimmedUtr, cols.utr.x + 4, y + 6.5);

  // Amount (right-aligned, bold) — Clean ₹ to Rs. for jsPDF compatibility
  pdf.setFont('times', 'bold');
  pdf.setFontSize(10);
  let amtText = rowData.amount.toString().replace(/₹/g, 'Rs.').trim();
  pdf.text(amtText, cols.amt.x + cols.amt.w - 4, y + 6.5, { align: 'right' });

  return y + rowHeight;
};


/**
 * MAIN: Generate a complete per-bank PDF letter with auto-pagination
 * This handles large tables that span multiple pages gracefully.
 */
export const generateBulkPdf = (pdf, data, isFirstPage) => {
  if (!isFirstPage) pdf.addPage();

  // Render the header (only on the first page of this letter)
  let y = renderLetterHeader(pdf, data);

  // Render table header
  y = renderTableHeader(pdf, y);

  // Sort records: group by account number for account-wise clarity
  const sortedRecords = [...data.records].sort((a, b) => {
    const accA = (a.accountNumber || '').toString();
    const accB = (b.accountNumber || '').toString();
    return accA.localeCompare(accB);
  });

  // Render all rows with auto-pagination
  for (let i = 0; i < sortedRecords.length; i++) {
    const rec = sortedRecords[i];

    // Check if we need a new page
    if (y + 12 > PAGE_HEIGHT - FOOTER_RESERVE) {
      // Draw bottom border of last visible portion
      const pageWidth = pdf.internal.pageSize.getWidth();
      pdf.setDrawColor(60, 60, 60);
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN, y, pageWidth - MARGIN, y);

      // Page footer indicator
      pdf.setFont('times', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`...continued on next page (${data.bankName})`, pageWidth / 2, y + 5, { align: 'center' });

      pdf.addPage();
      y = 15;

      // Continuation header
      pdf.setFont('times', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`CONTINUATION — ${data.bankName} — REF: CCPS/JP/NOTICE/${data.year}/${data.refId}`, MARGIN, y);
      y += 8;

      // Re-render table header on new page
      y = renderTableHeader(pdf, y);
    }

    y = renderTableRow(pdf, y, {
      sno: i + 1,
      account: rec.accountNumber,
      utr: rec.transactionId,
      amount: rec.amount
    });
  }

  // Detect suspicious routing (same account appearing with multiple UTRs)
  const accountCounts = {};
  sortedRecords.forEach(r => {
    const acc = r.accountNumber?.toString() || '';
    accountCounts[acc] = (accountCounts[acc] || 0) + 1;
  });
  const hasSuspiciousRouting = Object.values(accountCounts).some(count => count > 1);

  // Render footer
  renderLetterFooter(pdf, { ...data, hasSuspiciousRouting }, y);
};

/**
 * UTILITY: Group transactions by bank name
 * Returns: { bankName: string, records: [...] }[]
 */
export const groupTransactionsByBank = (transactions) => {
  const groups = {};

  transactions.forEach(t => {
    const bank = (t.platform || t.bankName || 'Unknown Bank').trim();
    if (!groups[bank]) {
      groups[bank] = {
        name: bank,
        records: []
      };
    }
    groups[bank].records.push({
      account: t.receiver_acc || t.accountNumber,
      utr: t.utr_no || t.transactionId,
      amount: t.amount,
      date: t.trans_date,
      layer: t.layer || 'L1'
    });
  });

  // Sort within each bank: group by account number
  Object.values(groups).forEach(group => {
    group.records.sort((a, b) => {
      const accA = (a.account || '').toString();
      const accB = (b.account || '').toString();
      if (accA !== accB) return accA.localeCompare(accB);
      return 0;
    });
  });

  return Object.values(groups);
};

/**
 * MASTER FUNCTION: Generate one combined PDF with separate letters for each bank
 * Each bank starts on a fresh page of the PDF.
 */
export const generateAllBankLettersPdf = (transactions, caseId) => {
  const jspdf = new jsPDF('p', 'mm', 'a4');
  const bankGroups = groupTransactionsByBank(transactions);

  let refCounter = 782;
  let isFirst = true;

  bankGroups.forEach((group) => {
    const letterData = {
      year: new Date().getFullYear(),
      refId: `${caseId}/${refCounter}-JP`,
      date: new Date().toLocaleDateString('en-GB'),
      bankName: group.name,
      records: group.records.map((r, i) => ({
        accountNumber: (r.account || '').toString(),
        transactionId: (r.utr || '').toString(),
        amount: typeof r.amount === 'number'
          ? r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })
          : r.amount
      })),
      startDate: '01/01/2024',
      endDate: new Date().toLocaleDateString('en-GB'),
      headerLine1: data.headerLine1 || 'OFFICE OF THE DEPUTY SUPERITENDENT OF POLICE',
      headerLine2: data.headerLine2 || 'STATION, JAIPUR, RAJASTHAN, INDIA',
      headerLine3: data.headerLine3 || ' Ghat Gate, Agra Road, Jaipur, Rajasthan',
      subjectText: data.subjectText || 'SUBJECT: NOTICE UNDER SECTION 94/106 BNSS 2023 - REQUEST FOR INFORMATION AND DEBIT FREEZE OF FRAUDULENT ACCOUNT(S).',
      bodyText: data.bodyText || 'This is to inform you that a cyber crime investigation is currently underway regarding multiple fraudulent transactions. During technical analysis, the following account(s) held in your bank have been identified as involved in the receipt/transfer of misappropriated funds:',
      footerText: data.footerText || 'FURTHER, YOU ARE REQUESTED TO IMMEDIATELY DEBIT FREEZE THE AFOREMENTIONED ACCOUNT(S) TO PREVENT FURTHER LOSS OF FUNDS.'
    };

    generateBulkPdf(jspdf, letterData, isFirst);
    isFirst = false;
    refCounter++;
  });

  return jspdf;
};
