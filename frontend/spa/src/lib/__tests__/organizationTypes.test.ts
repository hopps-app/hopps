import { describe, expect, it } from 'vitest';

import { organizationTypesForCountry } from '../organizationTypes';

describe('organizationTypesForCountry', () => {
    it('offers the German legal forms in Germany', () => {
        expect(organizationTypesForCountry('DE')[0]).toBe('EINGETRAGENER_VEREIN');
        expect(organizationTypesForCountry('DE')).toContain('GEMEINNUETZIGE_UG');
        expect(organizationTypesForCountry('DE')).not.toContain('VEREIN');
    });

    it('offers the plain Verein everywhere else', () => {
        expect(organizationTypesForCountry('CH')[0]).toBe('VEREIN');
        expect(organizationTypesForCountry('AT')).not.toContain('EINGETRAGENER_VEREIN');
        expect(organizationTypesForCountry('AT')).not.toContain('GEMEINNUETZIGE_UG');
    });
});
