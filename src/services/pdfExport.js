// ──────────────────────────────────────────────────────────
//  Voryn — PDF Export Service
//  Usa jsPDF + autoTable (carregados via CDN dinamicamente)
//  Sem dependência no bundle principal
// ──────────────────────────────────────────────────────────

const CDN_JSPDF    = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
const CDN_AUTOTBL  = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'

async function loadJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF

  // Mesmo risco documentado em PersonalInviteGuide.jsx (QRCanvas): scripts
  // de terceiro via CDN sem Subresource Integrity. Aqui o risco é mais
  // sério — estas libs têm acesso direto aos dados do aluno (peso, nome,
  // fotos) no momento da exportação em PDF. Não adicionamos `integrity`
  // fixo pelo mesmo motivo: hashes do cdnjs têm relatos documentados de
  // estarem incorretos para certas versões, e isso bloquearia a função
  // inteira. crossOrigin + referrerPolicy reduzem a superfície de ataque
  // (isolam erros de CORS, evitam leak de referrer) sem esse risco de
  // regressão. Mitigação mais completa seria hospedar cópia própria.
  await new Promise((res, rej) => {
    if (document.getElementById('jspdf-script')) { res(); return }
    const s = document.createElement('script')
    s.id = 'jspdf-script'; s.src = CDN_JSPDF
    s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer'
    s.onload = res; s.onerror = rej
    document.head.appendChild(s)
  })
  await new Promise((res, rej) => {
    if (document.getElementById('autotable-script')) { res(); return }
    const s = document.createElement('script')
    s.id = 'autotable-script'; s.src = CDN_AUTOTBL
    s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer'
    s.onload = res; s.onerror = rej
    document.head.appendChild(s)
  })
  return window.jspdf.jsPDF
}

// ── Helpers ──────────────────────────────────────────────────
const PURPLE = [130, 10, 209]
const DARK   = [13,  13,  13]
const GRAY1  = [30,  30,  30]
const GRAY3  = [100,100, 100]
const WHITE  = [242,242, 247]

function header(doc, title, subtitle) {
  // Background
  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 28, 'F')
  // Purple accent bar
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, 4, 28, 'F')
  // Title
  doc.setTextColor(...WHITE)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('VORYN', 12, 11)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...[180, 180, 190])
  doc.text('Premium Gym Tracker', 12, 17)
  // Title right
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text(title, 210 - 12, 11, { align: 'right' })
  if (subtitle) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...[160, 160, 170])
    doc.text(subtitle, 210 - 12, 18, { align: 'right' })
  }
  // Footer line
  doc.setDrawColor(...PURPLE)
  doc.setLineWidth(0.4)
  doc.line(0, 28, 210, 28)
}

function footer(doc, pageNum, total) {
  const h = doc.internal.pageSize.height
  doc.setDrawColor(...[50, 50, 60])
  doc.setLineWidth(0.3)
  doc.line(12, h - 12, 198, h - 12)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY3)
  doc.text('Gerado pelo Voryn App · vorynapp.com.br', 12, h - 6)
  doc.text(`Página ${pageNum} de ${total}`, 198, h - 6, { align: 'right' })
}

function sectionTitle(doc, text, y) {
  doc.setFillColor(...[20, 20, 30])
  doc.roundedRect(12, y, 186, 8, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PURPLE)
  doc.text(text.toUpperCase(), 16, y + 5.5)
  return y + 12
}

function infoRow(doc, label, value, y, x = 12) {
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY3)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text(String(value ?? '—'), x + 36, y)
  return y + 6
}

// ── PDF 1: Ficha de Treino ───────────────────────────────────
export async function exportRoutinePDF({ studentName, routines, trainerName }) {
  const JsPDF = await loadJsPDF()
  const doc   = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 297, 'F')

  header(doc, 'Ficha de Treino', studentName || 'Aluno')

  let y = 36
  const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

  if (trainerName) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...GRAY3)
    doc.text(`Personal Trainer: ${trainerName}`, 12, y)
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 198, y, { align: 'right' })
    y += 8
  }

  const activeDays = Object.entries(routines || {}).filter(([, r]) => r?.exercises?.length > 0)

  if (!activeDays.length) {
    doc.setFontSize(11)
    doc.setTextColor(...GRAY3)
    doc.text('Nenhuma rotina cadastrada.', 105, 140, { align: 'center' })
  } else {
    for (const [dayIdx, routine] of activeDays) {
      if (y > 250) {
        doc.addPage()
        doc.setFillColor(...DARK)
        doc.rect(0, 0, 210, 297, 'F')
        header(doc, 'Ficha de Treino', studentName)
        y = 36
      }

      y = sectionTitle(doc, `${DAYS[dayIdx]} — ${routine.name || 'Treino'}`, y)

      doc.autoTable({
        startY:   y,
        margin:   { left: 12, right: 12 },
        theme:    'plain',
        styles:   { fillColor: [20,20,30], textColor: WHITE, fontSize: 8.5, cellPadding: 3.5 },
        headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [25,25,35] },
        columns: [
          { header: '#',           dataKey: 'num'   },
          { header: 'Exercício',   dataKey: 'name'  },
          { header: 'Grupo',       dataKey: 'muscle'},
          { header: 'Séries',      dataKey: 'sets'  },
          { header: 'Reps',        dataKey: 'reps'  },
          { header: 'Obs.',        dataKey: 'notes' },
        ],
        body: (routine.exercises || []).map((ex, i) => ({
          num:    i + 1,
          name:   ex.name,
          muscle: ex.muscle || '—',
          sets:   ex.sets || 3,
          reps:   ex.reps || '10',
          notes:  ex.notes || '',
        })),
      })

      y = doc.lastAutoTable.finalY + 8
    }
  }

  // Footer em todas as páginas
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    footer(doc, i, total)
  }

  doc.save(`voryn-ficha-${(studentName || 'aluno').replace(/\s/g,'-').toLowerCase()}.pdf`)
}

// ── PDF 2: Avaliação Física ──────────────────────────────────
export async function exportAssessmentPDF({ studentName, assessments, trainerName }) {
  const JsPDF = await loadJsPDF()
  const doc   = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 297, 'F')
  header(doc, 'Avaliação Física', studentName)

  let y = 36

  if (trainerName) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...GRAY3)
    doc.text(`Personal Trainer: ${trainerName}`, 12, y)
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 198, y, { align: 'right' })
    y += 10
  }

  if (!assessments?.length) {
    doc.setFontSize(11)
    doc.setTextColor(...GRAY3)
    doc.text('Nenhuma avaliação registrada.', 105, 140, { align: 'center' })
  } else {
    // Tabela de histórico
    y = sectionTitle(doc, 'Histórico de Avaliações', y)
    doc.autoTable({
      startY:  y,
      margin:  { left: 12, right: 12 },
      theme:   'plain',
      styles:  { fillColor: [20,20,30], textColor: WHITE, fontSize: 8.5, cellPadding: 3.5 },
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [25,25,35] },
      columns: [
        { header: 'Data',        dataKey: 'date'     },
        { header: 'Peso (kg)',   dataKey: 'weight'   },
        { header: '% Gordura',   dataKey: 'body_fat' },
        { header: 'Massa Musc.', dataKey: 'muscle'   },
        { header: 'Observações', dataKey: 'notes'    },
      ],
      body: assessments.map(a => ({
        date:     new Date(a.date + 'T12:00').toLocaleDateString('pt-BR'),
        weight:   a.weight   ? `${a.weight}kg`  : '—',
        body_fat: a.body_fat ? `${a.body_fat}%` : '—',
        muscle:   a.muscle_mass ? `${a.muscle_mass}kg` : '—',
        notes:    a.notes || '',
      })),
    })

    y = doc.lastAutoTable.finalY + 10

    // Variação entre primeira e última
    if (assessments.length >= 2) {
      const first = assessments[assessments.length - 1]
      const last  = assessments[0]
      y = sectionTitle(doc, 'Evolução (Primeira × Última)', y)
      const rows = []
      if (first.weight && last.weight) {
        const diff = (parseFloat(last.weight) - parseFloat(first.weight)).toFixed(1)
        rows.push(['Peso', `${first.weight}kg`, `${last.weight}kg`, `${diff > 0 ? '+' : ''}${diff}kg`])
      }
      if (first.body_fat && last.body_fat) {
        const diff = (parseFloat(last.body_fat) - parseFloat(first.body_fat)).toFixed(1)
        rows.push(['% Gordura', `${first.body_fat}%`, `${last.body_fat}%`, `${diff > 0 ? '+' : ''}${diff}%`])
      }
      if (rows.length) {
        doc.autoTable({
          startY:   y,
          margin:   { left: 12, right: 12 },
          theme:    'plain',
          styles:   { fillColor: [20,20,30], textColor: WHITE, fontSize: 8.5, cellPadding: 3.5 },
          headStyles: { fillColor: [40, 40, 60], textColor: [180,180,190], fontStyle: 'bold', fontSize: 8 },
          columns: [
            { header: 'Métrica',  dataKey: 0 },
            { header: 'Inicial',  dataKey: 1 },
            { header: 'Atual',    dataKey: 2 },
            { header: 'Variação', dataKey: 3 },
          ],
          body: rows,
        })
      }
    }
  }

  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) { doc.setPage(i); footer(doc, i, total) }
  doc.save(`voryn-avaliacao-${(studentName || 'aluno').replace(/\s/g,'-').toLowerCase()}.pdf`)
}

// ── PDF 3: Relatório de Progresso ───────────────────────────
export async function exportProgressPDF({ studentName, metrics, workoutLogs, prs, trainerName }) {
  const JsPDF = await loadJsPDF()
  const doc   = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 297, 'F')
  header(doc, 'Relatório de Progresso', studentName)

  let y = 36

  if (trainerName) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GRAY3)
    doc.text(`Personal: ${trainerName}`, 12, y)
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 198, y, { align: 'right' })
    y += 10
  }

  // Stats grid
  y = sectionTitle(doc, 'Resumo Geral', y)
  const stats = [
    ['Total de Treinos',    metrics?.total        ?? 0],
    ['Sequência Atual',     `${metrics?.streak || 0} dias`],
    ['Melhor Sequência',    `${metrics?.bestStreak || 0} dias`],
    ['Volume Total',        metrics?.totalVolume ? `${(metrics.totalVolume/1000).toFixed(1)}t` : '—'],
  ]
  stats.forEach(([label, val]) => {
    y = infoRow(doc, label, val, y)
  })
  y += 4

  // PRs
  if (prs && Object.keys(prs).length > 0) {
    y = sectionTitle(doc, 'Records Pessoais (PRs)', y)
    const prRows = Object.entries(prs).map(([exercise, data]) => [
      exercise,
      data.weight ? `${data.weight}kg` : '—',
      data.reps   ? `${data.reps} reps` : '—',
      data.updated_at ? new Date(data.updated_at).toLocaleDateString('pt-BR') : '—',
    ])
    doc.autoTable({
      startY:   y,
      margin:   { left: 12, right: 12 },
      theme:    'plain',
      styles:   { fillColor: [20,20,30], textColor: WHITE, fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PURPLE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [25,25,35] },
      columns: [
        { header: 'Exercício', dataKey: 0 },
        { header: 'Peso',      dataKey: 1 },
        { header: 'Reps',      dataKey: 2 },
        { header: 'Data',      dataKey: 3 },
      ],
      body: prRows,
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Últimos 10 treinos
  if (workoutLogs?.length > 0) {
    if (y > 230) { doc.addPage(); doc.setFillColor(...DARK); doc.rect(0,0,210,297,'F'); header(doc,'Relatório de Progresso', studentName); y = 36 }
    y = sectionTitle(doc, 'Últimos Treinos', y)
    doc.autoTable({
      startY:   y,
      margin:   { left: 12, right: 12 },
      theme:    'plain',
      styles:   { fillColor: [20,20,30], textColor: WHITE, fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [40,40,60], textColor: [180,180,190], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [25,25,35] },
      columns: [
        { header: 'Data',     dataKey: 'date'     },
        { header: 'Treino',   dataKey: 'name'     },
        { header: 'Duração',  dataKey: 'duration' },
        { header: 'Volume',   dataKey: 'volume'   },
        { header: 'Exercícios', dataKey: 'exCount' },
      ],
      body: workoutLogs.slice(0, 10).map(l => ({
        date:     new Date(l.created_at || l.started_at || l.date).toLocaleDateString('pt-BR'),
        name:     l.name || 'Treino',
        duration: l.duration ? `${Math.round(l.duration / 60)}min` : '—',
        volume:   l.total_volume ? `${(l.total_volume/1000).toFixed(1)}t` : '—',
        exCount:  l.exercises_count ?? (l.exercises?.length ?? '—'),
      })),
    })
  }

  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) { doc.setPage(i); footer(doc, i, total) }
  doc.save(`voryn-progresso-${(studentName || 'aluno').replace(/\s/g,'-').toLowerCase()}.pdf`)
}
