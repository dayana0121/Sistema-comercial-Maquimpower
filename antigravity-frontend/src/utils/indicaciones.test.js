import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const mod = require('./indicaciones.cjs');

describe('Indicaciones util', () => {
    it('sets indicacion on detalle object', () => {
        const { setIndicacionOnDetalle } = mod;
        const det = { producto_id: 'p1', descripcion: 'Prod 1' };
        const updated = setIndicacionOnDetalle(det, 'indispensable');
        expect(updated.producto_id).toBe('p1');
        expect(updated.indicacion).toBe('indispensable');
        expect(det.indicacion).toBeUndefined();
    });

    it('getIndicacion returns empty string when absent', () => {
        const { getIndicacion } = mod;
        const det = { producto_id: 'p2' };
        expect(getIndicacion(det)).toBe('');
    });

    it('getIndicacion returns set value', () => {
        const { getIndicacion } = mod;
        const det = { producto_id: 'p3', indicacion: 'prescindible' };
        expect(getIndicacion(det)).toBe('prescindible');
    });
});
