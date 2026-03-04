import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl } from '../scanner.js';

describe('normalizeUrl', () => {
  it('adds https:// if no protocol', () => {
    assert.equal(normalizeUrl('example.com'), 'https://example.com');
  });

  it('preserves https://', () => {
    assert.equal(normalizeUrl('https://example.com'), 'https://example.com');
  });

  it('preserves http://', () => {
    assert.equal(normalizeUrl('http://example.com'), 'http://example.com');
  });

  it('strips trailing slashes', () => {
    assert.equal(normalizeUrl('https://example.com/'), 'https://example.com');
    assert.equal(normalizeUrl('https://example.com///'), 'https://example.com');
  });

  it('trims whitespace', () => {
    assert.equal(normalizeUrl('  example.com  '), 'https://example.com');
  });

  it('handles URLs with paths', () => {
    assert.equal(normalizeUrl('example.com/path'), 'https://example.com/path');
  });
});
