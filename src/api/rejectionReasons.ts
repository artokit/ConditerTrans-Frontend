import type { RejectionReason } from '../types';
import { apiRequest } from './client';

const REJECTION_REASONS_API = '/rejection-reasons';

export function fetchRejectionReasons(): Promise<RejectionReason[]> {
  return apiRequest<RejectionReason[]>(REJECTION_REASONS_API);
}

export function createRejectionReason(name: string): Promise<RejectionReason> {
  return apiRequest<RejectionReason>(REJECTION_REASONS_API, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
