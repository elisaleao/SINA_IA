import { beforeEach, describe, expect, it } from 'vitest';

import { purgeLegacyLocalData } from '../legacy-storage';

describe('purgeLegacyLocalData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes the three legacy registration keys', () => {
    localStorage.setItem('pia.student.registration', '{}');
    localStorage.setItem('pia.teacher.registration', '{}');
    localStorage.setItem('pia.student.learning-profile', '{}');

    purgeLegacyLocalData();

    expect(localStorage.getItem('pia.student.registration')).toBeNull();
    expect(localStorage.getItem('pia.teacher.registration')).toBeNull();
    expect(
      localStorage.getItem('pia.student.learning-profile')
    ).toBeNull();
  });

  it('keeps every other key untouched', () => {
    localStorage.setItem('sina_access_token', 'token');
    localStorage.setItem('sina_vlibras_ativo', 'true');

    purgeLegacyLocalData();

    expect(localStorage.getItem('sina_access_token')).toBe('token');
    expect(localStorage.getItem('sina_vlibras_ativo')).toBe('true');
  });
});
