import { z } from 'zod'
import type { PlanOutput } from '../types/project'

const screenSeedSchema = z.object({
  name: z.string().min(1),
  screenType: z.union([z.literal('visual'), z.literal('info')]),
  description: z.string().min(1),
})

export const planOutputSchema = z.object({
  appHighLevel: z.string().min(1),
  featureList: z.string().min(1),
  appFlow: z.string().min(1),
  suggestedStack: z.string().min(1),
  screens: z.array(screenSeedSchema).min(1).max(20),
  cursorRules: z.string().min(1),
})

export function normalizePlanOutput(input: unknown): PlanOutput {
  const parsed = planOutputSchema.safeParse(input)
  if (parsed.success) {
    return parsed.data
  }

  return {
    appHighLevel: '# App Overview\n\nPlan generation returned malformed data. Please regenerate.',
    featureList: '# Feature List\n\n- [ ] Regenerate plan output',
    appFlow: '# App Flow\n\n1. Regenerate plan output',
    suggestedStack: '# Suggested Stack\n\nPlease regenerate stack details.',
    screens: [
      {
        name: 'Home',
        screenType: 'visual',
        description: 'A fallback home screen generated after JSON validation failed.',
      },
    ],
    cursorRules: '# Project Context\n\nFallback rules generated due to JSON validation failure.',
  }
}
