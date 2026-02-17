import { describe, it, expect, vi } from 'vitest';
import {
  apiError,
  apiValidationError,
  apiMethodNotAllowed,
  apiUnauthorized,
  apiServerError,
} from '../responses';
import type { NextApiResponse } from 'next';

function mockRes(): NextApiResponse {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as NextApiResponse;
}

describe('API Response Helpers', () => {
  describe('apiError', () => {
    it('sends the given status and message', () => {
      const res = mockRes();
      apiError(res, 403, 'Forbidden');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    });
  });

  describe('apiValidationError', () => {
    it('sends 400 with validation issues', () => {
      const res = mockRes();
      const zodError = {
        issues: [{ message: 'Required', path: ['email'] }],
      };
      apiValidationError(res, zodError as never);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        issues: zodError.issues,
      });
    });
  });

  describe('apiMethodNotAllowed', () => {
    it('sends 405', () => {
      const res = mockRes();
      apiMethodNotAllowed(res);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });

  describe('apiUnauthorized', () => {
    it('sends 401', () => {
      const res = mockRes();
      apiUnauthorized(res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('apiServerError', () => {
    it('sends 500', () => {
      const res = mockRes();
      apiServerError(res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
