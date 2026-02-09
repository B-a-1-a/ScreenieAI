import { describe, expect, it } from 'vitest'
import { normalizePlanOutput, planOutputSchema } from './validation'

describe('plan output validation', () => {
  it('accepts a valid plan payload', () => {
    const payload = {
      appHighLevel: '# App',
      featureList: '# Features',
      appFlow: '# Flow',
      suggestedStack: '# Stack',
      screens: [
        {
          name: 'Login',
          screenType: 'visual',
          description: 'Login view',
        },
      ],
      cursorRules: '# Rules',
    }

    expect(planOutputSchema.safeParse(payload).success).toBe(true)
  })

  it('returns fallback on malformed payload', () => {
    const malformed = {
      appHighLevel: '',
      featureList: '',
    }

    const normalized = normalizePlanOutput(malformed)
    expect(normalized.screens.length).toBe(1)
    expect(normalized.appHighLevel.includes('malformed')).toBe(true)
  })
})
