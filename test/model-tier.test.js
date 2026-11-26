import assert from 'node:assert/strict';
import test from 'node:test';
import { modelTierSchema } from '../src/config/model-tier.js';

test('defaults requests to the basic model tier', () => {
  assert.equal(modelTierSchema.parse(undefined), 'basic');
});

test('accepts only named model tiers, not arbitrary model IDs', () => {
  assert.equal(modelTierSchema.parse('advanced'), 'advanced');
  assert.equal(modelTierSchema.safeParse('gemini-3.8-flash').success, false);
});
