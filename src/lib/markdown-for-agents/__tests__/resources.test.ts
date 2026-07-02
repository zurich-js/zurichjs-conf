import { describe, expect, it } from 'vitest';
import { isAgentReadyPath } from '../resources';

describe('isAgentReadyPath', () => {
  it('allows public conference routes', () => {
    expect(isAgentReadyPath('/schedule')).toBe(true);
    expect(isAgentReadyPath('/speakers')).toBe(true);
    expect(isAgentReadyPath('/speakers/jane-doe')).toBe(true);
    expect(isAgentReadyPath('/talks')).toBe(true);
    expect(isAgentReadyPath('/talks/optimizing-renders')).toBe(true);
  });

  it('tolerates trailing slashes', () => {
    expect(isAgentReadyPath('/schedule/')).toBe(true);
    expect(isAgentReadyPath('/speakers/jane-doe/')).toBe(true);
  });

  it('rejects unrelated and dangerous paths', () => {
    expect(isAgentReadyPath('/')).toBe(false);
    expect(isAgentReadyPath('/admin')).toBe(false);
    expect(isAgentReadyPath('/cfp/login')).toBe(false);
    expect(isAgentReadyPath('/api/speakers')).toBe(false);
    expect(isAgentReadyPath('/speakers/jane-doe/edit')).toBe(false);
    expect(isAgentReadyPath('/speakers/../admin')).toBe(false);
  });
});
