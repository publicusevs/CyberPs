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
};

module.exports = NoticesService;
