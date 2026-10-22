import { beforeEach, describe, expect, it } from 'vitest'
import { saveFood, readFoods, portionNutrition } from '@/services/foodLibrary'
beforeEach(() => localStorage.clear())
describe('personal food library', () => {
  it('scales a serving while keeping unknown nutrients unknown', () => {
    const food = { name: 'Meu alimento', kcal: 200, protein_g: 10, carbs_g: null, fat_g: 0 }
    expect(portionNutrition(food, 150)).toEqual({ kcal: 300, protein_g: 15, carbs_g: null, fat_g: 0 })
    saveFood('owner', food)
    expect(readFoods('owner')).toHaveLength(1)
    expect(readFoods('other')).toHaveLength(0)
  })
  it('rejects impossible portions and invalid label values', () => {
    expect(() => portionNutrition({}, -10)).toThrow()
    expect(() => saveFood('owner', { name: 'Alimento', kcal: -1, protein_g: null, carbs_g: null, fat_g: null })).toThrow()
  })
})
