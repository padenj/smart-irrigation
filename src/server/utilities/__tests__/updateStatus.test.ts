import { describe, expect, it } from 'vitest';
import { createDefaultUpdateStatus } from '../../../shared/updateStatus';
import { deriveCheckedUpdateStatus, normalizeUpdateStatus, shouldReuseRecentUpdateCheck } from '../updateStatus';

describe('updateStatus utilities', () => {
    it('derives availability when the latest release is newer than the current version', () => {
        const currentStatus = normalizeUpdateStatus(
            {
                ...createDefaultUpdateStatus(),
                currentVersion: '1.0.64',
                serviceAvailable: true,
            },
            '1.0.64',
            true
        );

        const nextStatus = deriveCheckedUpdateStatus(currentStatus, {
            version: '1.0.65',
            assetUrl: 'https://example.com/release.zip',
            checkedAt: '2026-05-24T16:00:00.000Z',
        });

        expect(nextStatus.state).toBe('available');
        expect(nextStatus.updateAvailable).toBe(true);
        expect(nextStatus.latestVersion).toBe('1.0.65');
        expect(nextStatus.targetVersion).toBe('1.0.65');
    });

    it('marks the system up-to-date when versions match', () => {
        const currentStatus = normalizeUpdateStatus(
            {
                ...createDefaultUpdateStatus(),
                currentVersion: '1.0.65',
                serviceAvailable: true,
            },
            '1.0.65',
            true
        );

        const nextStatus = deriveCheckedUpdateStatus(currentStatus, {
            version: '1.0.65',
            assetUrl: 'https://example.com/release.zip',
            checkedAt: '2026-05-24T16:00:00.000Z',
        });

        expect(nextStatus.state).toBe('up-to-date');
        expect(nextStatus.updateAvailable).toBe(false);
        expect(nextStatus.targetVersion).toBeNull();
    });

    it('reuses recent check results when they are still fresh', () => {
        const now = Date.parse('2026-05-24T16:10:00.000Z');
        const status = normalizeUpdateStatus(
            {
                ...createDefaultUpdateStatus(),
                lastCheckedAt: '2026-05-24T16:08:30.000Z',
                latestVersion: '1.0.65',
            },
            '1.0.64',
            true
        );

        expect(shouldReuseRecentUpdateCheck(status, now)).toBe(true);
        expect(shouldReuseRecentUpdateCheck(status, now + 10 * 60 * 1000)).toBe(false);
    });
});
