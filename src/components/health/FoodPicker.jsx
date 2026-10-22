import React, { useState } from 'react'
import { readFoods, saveFood, removeFood, portionNutrition } from '@/services/foodLibrary'

export default function FoodPicker({ userId, onApply }) {
  const [foods, setFoods] = useState(() => readFoods(userId))
  const [search, setSearch] = useState('')
  const [grams, setGrams] = useState(100)
  const [basket, setBasket] = useState([])
  const [draft, setDraft] = useState({ name: '', kcal: '', protein_g: '', carbs_g: '', fat_g: '' })
  const [error, setError] = useState('')
  function add(food) {
    try { setBasket(current => [...current, { id: crypto.randomUUID(), name: food.name, grams: Number(grams), ...portionNutrition(food, Number(grams)) }]); setError('') } catch (err) { setError(err.message) }
  }
  const totals = Object.fromEntries(['kcal', 'protein_g', 'carbs_g', 'fat_g'].map(key => [key, basket.length && basket.every(item => item[key] != null) ? Math.round(basket.reduce((sum, item) => sum + item[key], 0) * 10) / 10 : null]))
  return <details className="health-detail space-y-3"><summary className="font-semibold cursor-pointer">Meus alimentos e porções</summary>
    <p className="text-xs">Cadastre os valores do rótulo por 100 g e monte sua refeição. Sua biblioteca fica neste aparelho e funciona offline. Nutrientes não informados permanecem desconhecidos.</p>
    <label>Buscar nos meus alimentos<input className="f-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome do alimento" /></label>
    <label>Quantidade a adicionar (g)<input className="f-input" type="number" min="0.1" max="10000" step="0.1" value={grams} onChange={event => setGrams(event.target.value)} /></label>
    {foods.filter(food => food.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map(food => <div key={food.id} className="health-record"><div><strong>{food.name}</strong><p>{food.kcal} kcal / 100 g</p></div><div className="flex gap-3"><button type="button" className="health-text-button" onClick={() => add(food)}>Adicionar</button><button type="button" className="health-text-button" onClick={() => { try { setFoods(removeFood(userId, food.id)) } catch (err) { setError(err.message) } }}>Remover da biblioteca</button></div></div>)}
    {!foods.length && <p className="text-sm">Cadastre seu primeiro alimento abaixo.</p>}
    <details><summary className="cursor-pointer">+ Cadastrar alimento pelo rótulo</summary><div className="space-y-3 mt-3"><label>Nome<input className="f-input" maxLength="80" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></label><div className="health-form-grid">{[['kcal', 'Calorias (kcal)'], ['protein_g', 'Proteínas (g)'], ['carbs_g', 'Carboidratos (g)'], ['fat_g', 'Gorduras (g)']].map(([key, label]) => <label key={key}>{label} por 100 g<input className="f-input" type="number" min="0" max="5000" step="0.1" placeholder={key === 'kcal' ? 'Obrigatório para cadastrar' : 'Opcional'} value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div><button type="button" className="f-btn f-btn-ghost" onClick={() => { try { setFoods(saveFood(userId, { ...draft, ...Object.fromEntries(['kcal', 'protein_g', 'carbs_g', 'fat_g'].map(key => [key, draft[key] === '' ? null : Number(draft[key])])) })); setDraft({ name: '', kcal: '', protein_g: '', carbs_g: '', fat_g: '' }); setError('') } catch (err) { setError(err.message) } }}>Salvar na biblioteca</button></div></details>
    {basket.length > 0 && <div className="space-y-3"><h3 className="font-semibold">Itens desta refeição</h3>{basket.map(item => <p key={item.id} className="text-sm">{item.name} · {item.grams} g · {item.kcal} kcal <button type="button" className="health-text-button" onClick={() => setBasket(current => current.filter(row => row.id !== item.id))}>Retirar</button></p>)}<strong>{totals.kcal} kcal</strong><p className="text-xs">Aplicar preenche calorias, nutrientes conhecidos e descrição no formulário. Depois confira os valores e toque em Salvar registro. Substitui os valores já preenchidos.</p><button className="f-btn f-btn-ghost" type="button" onClick={() => onApply({ ...totals, note: basket.map(item => `${item.name} (${item.grams} g)`).join(', ').slice(0, 250) })}>Aplicar ao registro</button></div>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </details>
}
