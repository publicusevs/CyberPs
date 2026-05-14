/**
 * notices.service.js — Business logic for Legal Notices.
 *
 * saveNotice: saves structured notice to legal_notices table.
 * (PDF-to-fir_documents is handled by cases.service.savePdfNotice.)
 */

'use strict';

const NoticesRepository = require('./notices.repository');
const AppError = require('../../core/AppError');

const NoticesService = {

    async saveNotice(data, user) {
        await NoticesRepository.insert({
            caseId: data.case_id,
            policeStationId: user.police_station_id,
            platformName: data.platform_name,
            legalSections: data.legal_sections,
            issuedBy: data.issued_by,
            receiverName: data.receiver_name,
            receiverAddress: data.receiver_address,
            receiverEmail: data.receiver_email,
            targetAccountDetails: data.target_account_details,
            requestedDataPoints: data.requested_data_points,
            noticeContent: data.notice_content,
            status: data.status || 'Draft',
        });
    },

    async getNoticesByCase(caseId) {
        return NoticesRepository.getByCase(caseId);
    },

    async getNoticeDetail(noticeId) {
        const notice = await NoticesRepository.getById(noticeId);
        if (!notice) throw new AppError('Notice not found', 404);

        // Parse stored JSON fields
        notice.legal_sections = JSON.parse(notice.legal_sections || '[]');
        notice.target_account_details = JSON.parse(notice.target_account_details || '{}');
        notice.requested_data_points = JSON.parse(notice.requested_data_points || '[]');
        return notice;
    },

    async updateNotice(noticeId, { notice_content, status }) {
        await NoticesRepository.update(noticeId, { noticeContent: notice_content, status });
    },

    /**
     * Generate one or more bank notices from the Notices Engine.
     * @param {object} payload - { case_id, notice_category, notice_type_code, banks: [{name, accounts}] }
     * @param {object} user    - JWT user object ({ user_id, name, police_station_id })
     * @returns {Array} Array of { dispatch_no, bank_name, notice_id }
     */
    async generateBankNotices(payload, user) {
        const { case_id, notice_category = 'BANK', notice_type_code, banks } = payload;
        if (!banks || banks.length === 0) throw new AppError('No banks selected', 400);
        if (!notice_type_code) throw new AppError('Notice type is required', 400);

        const year = new Date().getFullYear();
        const psId = user.police_station_id || 0;
        const issuedBy = user.name || 'System';
        const results = [];

        for (const bank of banks) {
            // Get unique sequential dispatch number per station per year
            const seq = await NoticesRepository.getNextDispatchSeq(year, psId);
            const dispatchNo = `CYB/${year}/${psId}/${String(seq).padStart(6, '0')}`;

            let finalContent = bank.content || '';
            if (finalContent) {
                finalContent = finalContent
                    .replace(/\{BANK_NAME\}/g, bank.name)
                    .replace(/\{ACCOUNT_NO\}/g, (bank.accounts || []).map(a => a.account).join(', '))
                    .replace(/\{DISPATCH_NO\}/g, dispatchNo)
                    .replace(/\{DATE\}/g, new Date().toLocaleDateString('en-GB'));
            }

            const noticeId = await NoticesRepository.insertWithDispatch({
                caseId: case_id,
                policeStationId: psId,
                bankName: bank.name,
                noticeTypeCode: notice_type_code,
                noticeCategory: notice_category,
                issuedBy,
                dispatchNo,
                selectedAccounts: bank.accounts || [],
                status: 'Generated',
                content: finalContent
            });

            results.push({ dispatch_no: dispatchNo, bank_name: bank.name, notice_id: noticeId, notice_content: finalContent });
        }

        return results;
    },

    /**
     * Get the dispatch register for a case — all engine-generated notices.
     */
    async getDispatchRegister(caseId) {
        const rows = await NoticesRepository.getDispatchByCaseId(caseId);
        return rows.map(r => ({
            ...r,
            selected_accounts: (() => {
                try { return JSON.parse(r.selected_accounts || '[]'); }
                catch { return []; }
            })()
        }));
    },
};

module.exports = NoticesService;
