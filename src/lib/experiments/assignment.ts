import crypto from 'node:crypto';
import { prisma } from '../db/client';
import type { ExperimentVariant } from '@prisma/client';

export type AssignedVariant = {
  experimentId: string;
  variantId: string;
  key: string;
  label: string;
  templateType: ExperimentVariant['templateType'];
  templatePath: string | null;
};

function selectVariant(variants: ExperimentVariant[], seed: string) {
  const totalWeight = variants.reduce((total, variant) => total + variant.weight, 0);
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const numeric = parseInt(hash.slice(0, 8), 16);
  const bucket = numeric % Math.max(totalWeight, 1);
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant;
    }
  }
  return variants[variants.length - 1];
}

export async function resolveExperimentVariant(experimentKey: string, visitorKey: string): Promise<AssignedVariant | null> {
  const experiment = await prisma.experiment.findUnique({
    where: { key: experimentKey },
    include: { variants: true }
  });

  if (!experiment || experiment.variants.length === 0 || experiment.status !== 'RUNNING') {
    return null;
  }

  const existing = await prisma.experimentAssignment.findUnique({
    where: {
      experimentId_visitorKey: {
        experimentId: experiment.id,
        visitorKey
      }
    },
    include: { variant: true }
  });

  if (existing) {
    const { variant } = existing;
    return {
      experimentId: experiment.id,
      variantId: variant.id,
      key: variant.key,
      label: variant.label,
      templateType: variant.templateType,
      templatePath: variant.templatePath
    };
  }

  const selected = selectVariant(experiment.variants, `${visitorKey}:${experiment.id}`);

  await prisma.experimentAssignment.upsert({
    where: {
      experimentId_visitorKey: {
        experimentId: experiment.id,
        visitorKey
      }
    },
    update: { variantId: selected.id },
    create: {
      experimentId: experiment.id,
      variantId: selected.id,
      visitorKey
    }
  });

  return {
    experimentId: experiment.id,
    variantId: selected.id,
    key: selected.key,
    label: selected.label,
    templateType: selected.templateType,
    templatePath: selected.templatePath
  };
}
