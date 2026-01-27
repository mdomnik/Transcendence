export const DIFFICULTY_PROFILES = {
  1: {
    label: 'EASY',
    successRate: '≈65% correct',
    rules: `
- Avoid trivial facts
- Use one constraint or condition
- All answers must feel plausible
`,
  },

  2: {
    label: 'MEDIUM',
    successRate: '≈40% correct',
    rules: `
- Must combine 2 related facts or rules
- Add a condition or edge case
- All answers must feel plausible
`,
  },

  3: {
    label: 'HARD',
    successRate: '≈15% correct',
    rules: `
- Must involve a rule + exception or hidden condition
- No surface-level facts
- All answers must be extremely close
`,
  },
};
