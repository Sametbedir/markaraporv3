import { prisma } from '@/lib/prisma';
import { FORMULA_VARIABLES } from './catalog';

/** Formüllerde kullanılabilecek değişkenler: hazır olanlar + markanın dosyadan gelen özel metrikleri */
export async function allowedVariables(brandId: string): Promise<Set<string>> {
  const custom = await prisma.metricDefinition.findMany({ where: { brandId, kind: 'custom' }, select: { key: true } });
  return new Set([...FORMULA_VARIABLES.map((v) => v.key), ...custom.map((c) => c.key)]);
}
