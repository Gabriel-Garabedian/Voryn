// ──────────────────────────────────────────────────────────
//  Voryn — Créditos de mídia
//
//  Todo o material visual de terceiros que o app usa está
//  catalogado em public/media/credits.json, com o título original,
//  o autor, a licença e o link da página-fonte no Wikimedia Commons.
//
//  Este módulo é a única forma de o app ler esses dados: a landing e
//  as telas do app importam daqui, então o crédito exibido ao usuário
//  e o arquivo de licença não podem divergir.
//
//  Regras de licença que valem para todo o material do diretório:
//    · CC BY / CC BY-SA → exige crédito (autor + licença). O crédito
//      aparece no rodapé da landing e na tela de créditos do app.
//    · Domínio público → não exige crédito, mas o autor é listado
//      mesmo assim, por honestidade com quem fotografou.
//    · CC BY-SA → se a imagem for alterada (recorte, recoloração), a
//      versão modificada precisa circular sob a mesma licença.
// ──────────────────────────────────────────────────────────

import creditsData from '../../public/media/credits.json'

// Nomes de arquivo dentro de public/media → caminho servível pelo Vite.
export const MEDIA_BASE = '/media'

const CREDITS = creditsData.map(item => ({
  file: item.file,
  path: `${MEDIA_BASE}/${item.file.split('/').pop()}`,
  poster: item.poster ? `${MEDIA_BASE}/${item.poster.split('/').pop()}` : null,
  media: item.media,
  title: item.title,
  creator: item.creator,
  license: item.license,
  licenseCode: item.licenseCode,
  licenseUrl: item.licenseUrl,
  creditRequired: item.creditRequired,
  page: item.page,
  credit: item.credit,
}))

export const MEDIA_CREDITS = CREDITS

// Créditos que a landing exibe no rodapé: só os que a página realmente
// mostra. Uma foto que não está na página não gera crédito visível.
export const LANDING_CREDITS = CREDITS.filter(c => c.creditRequired)

/**
 * Fotos reais exibidas na faixa da landing. A legenda mora aqui, junto do
 * apontamento para o catálogo — o crédito sai do mesmo lugar que o
 * arquivo, então a legenda exibida e a licença não podem divergir.
 */
export const LANDING_PHOTOS = [
  { file: 'fitness-dumbbell-marked-with-a-green-logo.jpg', caption: 'Halteres no suporte' },
  { file: 'woman-standing-in-front-of-a-dumbbell.jpg',       caption: 'Rosca com haltere' },
  { file: 'rio-2016-weightlifting-men-s-69-kg.jpg',         caption: 'Arranque na Rio 2016' },
  { file: 'weightlifting-at-the-2018-summer-youth-olympics.jpg', caption: 'Competição de halterofilamento' },
].map(p => {
  const credit = CREDITS.find(c => c.file.endsWith(`/${p.file}`))
  return credit ? { ...p, ...credit } : null
}).filter(Boolean)

/** Nome do arquivo de mídia → objeto de crédito (ou undefined). */
export function creditFor(fileName) {
  return CREDITS.find(c => c.file.endsWith(`/${fileName}`) || c.file === fileName)
}

/**
 * Crédito de uma linha para um item de mídia, pronto pro rodapé.
 * Formato: "Título", Autor, Licença, via Wikimedia Commons.
 */
export function creditLine(item) {
  return `"${item.title}", ${item.creator}, ${item.license}, via Wikimedia Commons`
}

/**
 * Resumo "autor (licenças)" — um por autor, sem repetir o mesmo nome.
 * É o que a landing mostra no rodapé, gerado a partir do catálogo:
 * se um arquivo novo entrar em credits.json, o rodapé muda sozinho.
 */
export function creditSummary() {
  const byCreator = new Map()
  for (const c of CREDITS) {
    if (!byCreator.has(c.creator)) byCreator.set(c.creator, new Set())
    byCreator.get(c.creator).add(c.license)
  }
  return [...byCreator.entries()].map(
    ([creator, licenses]) => `${creator} (${[...licenses].join(', ')})`
  )
}
