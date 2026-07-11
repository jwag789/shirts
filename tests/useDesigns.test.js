// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { recordDesign, getDesignIds } from '../src/composables/useDesigns.js'

beforeEach(() => localStorage.clear())

describe('useDesigns (localStorage)', () => {
  it('records and returns ids, newest first', () => {
    recordDesign('a')
    recordDesign('b')
    expect(getDesignIds()).toEqual(['b', 'a'])
  })

  it('dedupes and moves an existing id to the front', () => {
    recordDesign('a')
    recordDesign('b')
    recordDesign('a')
    expect(getDesignIds()).toEqual(['a', 'b'])
  })

  it('ignores empty/invalid ids', () => {
    recordDesign('')
    recordDesign(null)
    expect(getDesignIds()).toEqual([])
  })

  it('caps the list at 100', () => {
    for (let i = 0; i < 130; i++) recordDesign('id-' + i)
    expect(getDesignIds()).toHaveLength(100)
    expect(getDesignIds()[0]).toBe('id-129')
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('inkspirit_designs', 'not json')
    expect(getDesignIds()).toEqual([])
  })
})
