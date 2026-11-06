function pdfEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export function jobSheetPdf(lines: string[]): Buffer {
  const bodyLines = lines.length > 0 ? lines : ['Tailor job sheet']
  const commands = ['BT', '/F1 18 Tf', '48 790 Td', `(${pdfEscape(bodyLines[0] ?? 'Tailor')}) Tj`, '/F1 12 Tf']
  for (const line of bodyLines.slice(1)) {
    commands.push('0 -18 Td', `(${pdfEscape(line)}) Tj`)
  }
  commands.push('ET')
  const stream = commands.join('\n')
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ]
  let file = '%PDF-1.4\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(file))
    file += object
  }
  const xrefAt = Buffer.byteLength(file)
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  file += `${xref}trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
  return Buffer.from(file)
}
