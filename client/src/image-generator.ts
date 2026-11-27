export type VectorStyle = 'organico' | 'minimalista' | 'editorial'
export type VectorSize = 'cuadrado' | 'horizontal' | 'vertical'

export interface VectorInput {
  businessType: string
  product: string
  style: VectorStyle
  size: VectorSize
}

export interface GeneratedVector {
  svg: string
  imageUrl: string
  alt: string
  dimensions: string
}

const palettes: Record<VectorStyle, {
  background: string
  ink: string
  accent: string
  secondary: string
  paper: string
}> = {
  organico: {
    background: '#eaf0e4',
    ink: '#234c38',
    accent: '#d78558',
    secondary: '#adc38e',
    paper: '#fffaf0',
  },
  minimalista: {
    background: '#edf1ee',
    ink: '#243c35',
    accent: '#6f9884',
    secondary: '#d4e0d7',
    paper: '#fffefa',
  },
  editorial: {
    background: '#f1e8dc',
    ink: '#332d29',
    accent: '#b75843',
    secondary: '#d5b57e',
    paper: '#fff8ee',
  },
}

const canvasSizes: Record<VectorSize, { width: number; height: number }> = {
  cuadrado: { width: 1024, height: 1024 },
  horizontal: { width: 1536, height: 1024 },
  vertical: { width: 1024, height: 1536 },
}

function escapeXml(value: string) {
  const validXmlCharacters = Array.from(value).filter((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    const isAllowedControl = codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d
    const isInvalidRange = (codePoint < 0x20 && !isAllowedControl)
      || (codePoint >= 0xd800 && codePoint <= 0xdfff)
      || codePoint === 0xfffe
      || codePoint === 0xffff
    return !isInvalidRange
  }).join('')

  return validXmlCharacters.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] ?? character)
}

function wrapText(value: string, maxCharacters: number, maxLines: number) {
  let remaining = Array.from(value.trim().replace(/\s+/g, ' ')).join('')
  const lines: string[] = []
  while (remaining && lines.length < maxLines) {
    const characters = Array.from(remaining)
    let cut = Math.min(maxCharacters, characters.length)
    if (characters.length > cut) {
      const segment = characters.slice(0, cut).join('')
      const lastSpace = segment.lastIndexOf(' ')
      if (lastSpace > 0) cut = lastSpace
    }

    lines.push(characters.slice(0, cut).join('').trim())
    remaining = characters.slice(cut).join('').trim()
  }

  if (remaining && lines.length) {
    const lastLine = lines.length - 1
    lines[lastLine] = `${Array.from(lines[lastLine]).slice(0, maxCharacters - 1).join('').trimEnd()}…`
  }

  return lines
}

function truncateText(value: string, maxCharacters: number) {
  const characters = Array.from(value)
  return characters.length > maxCharacters
    ? `${characters.slice(0, maxCharacters).join('')}…`
    : value
}

function textLines(lines: string[], x: number, y: number, fontSize: number, lineHeight: number, anchor = 'start') {
  return `<text x="${x}" y="${y}" fill="currentColor" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="-2" text-anchor="${anchor}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')}</text>`
}

export function createVector(input: VectorInput): GeneratedVector {
  const { width, height } = canvasSizes[input.size]
  const palette = palettes[input.style]
  const business = escapeXml(input.businessType.trim())
  const businessLabel = escapeXml(truncateText(input.businessType.trim().toLocaleUpperCase(), 36))
  const rawProduct = input.product.trim()
  const product = escapeXml(rawProduct)
  const productSubtitle = escapeXml(truncateText(rawProduct, 62))
  const horizontal = input.size === 'horizontal'
  const vertical = input.size === 'vertical'
  const centerX = horizontal ? 1210 : 760
  const centerY = vertical ? 560 : 510
  const radius = vertical ? 245 : 210
  const titleX = vertical ? width / 2 : 76
  const titleY = vertical ? 930 : 385
  const titleLines = wrapText(input.product, vertical ? 22 : 17, 3)
  const titleFontSize = vertical ? 68 : 62
  const textAnchor = vertical ? 'middle' : 'start'
  const ctaY = height - 90
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">${business}: ${product}</title>
  <desc id="description">Ilustración publicitaria vectorial creada localmente para ${business}.</desc>
  <defs>
    <linearGradient id="orb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.secondary}" />
      <stop offset="100%" stop-color="${palette.accent}" />
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="${palette.ink}" flood-opacity=".14" />
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="${palette.background}" />
  <circle cx="${width - 72}" cy="68" r="220" fill="${palette.paper}" opacity=".54" />
  <circle cx="40" cy="${height - 110}" r="270" fill="${palette.secondary}" opacity=".24" />
  <path d="M0 ${height * 0.79} C ${width * 0.24} ${height * 0.73}, ${width * 0.47} ${height * 0.91}, ${width} ${height * 0.78} V${height} H0Z" fill="${palette.paper}" opacity=".66" />
  <g fill="${palette.ink}" font-family="Arial, Helvetica, sans-serif">
    <rect x="76" y="72" width="54" height="54" rx="18" fill="${palette.ink}" />
    <text x="103" y="110" text-anchor="middle" fill="${palette.paper}" font-size="29" font-weight="700">i.</text>
    <text x="150" y="96" font-size="15" font-weight="700" letter-spacing="3">IMPULSO</text>
    <text x="150" y="119" font-size="12" letter-spacing="1.5" opacity=".7">DISEÑO VECTORIAL</text>
    <text x="76" y="235" fill="${palette.accent}" font-size="17" font-weight="700" letter-spacing="2">${businessLabel}</text>
    ${textLines(titleLines, titleX, titleY, titleFontSize, titleFontSize * 1.08, textAnchor).replace('currentColor', palette.ink)}
    <text x="${horizontal ? 76 : titleX}" y="${vertical ? 1210 : 690}" font-size="20" letter-spacing=".5" opacity=".76">${productSubtitle}</text>
    <rect x="${vertical ? (width - 250) / 2 : 76}" y="${ctaY - 46}" width="250" height="58" rx="29" fill="${palette.ink}" />
    <text x="${vertical ? width / 2 : 201}" y="${ctaY - 10}" text-anchor="middle" fill="${palette.paper}" font-size="15" font-weight="700" letter-spacing="1.4">DESCÚBRELO HOY</text>
  </g>
  <g filter="url(#shadow)">
    <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="url(#orb)" />
    <circle cx="${centerX}" cy="${centerY}" r="${radius - 24}" fill="${palette.paper}" opacity=".35" />
    <rect x="${centerX - 100}" y="${centerY - 90}" width="200" height="225" rx="48" fill="${palette.paper}" />
    <rect x="${centerX - 54}" y="${centerY - 136}" width="108" height="66" rx="20" fill="${palette.ink}" />
    <rect x="${centerX - 78}" y="${centerY - 4}" width="156" height="82" rx="20" fill="${palette.accent}" />
    <path d="M${centerX - 53} ${centerY + 36} C${centerX - 18} ${centerY + 4}, ${centerX + 9} ${centerY + 67}, ${centerX + 52} ${centerY + 25}" fill="none" stroke="${palette.paper}" stroke-width="8" stroke-linecap="round" opacity=".9" />
    <path d="M${centerX - 17} ${centerY - 111} C${centerX - 70} ${centerY - 190}, ${centerX - 127} ${centerY - 153}, ${centerX - 119} ${centerY - 104} C${centerX - 86} ${centerY - 88}, ${centerX - 49} ${centerY - 91}, ${centerX - 17} ${centerY - 111}Z" fill="${palette.ink}" opacity=".92" />
    <path d="M${centerX - 107} ${centerY - 111} C${centerX - 73} ${centerY - 122}, ${centerX - 45} ${centerY - 127}, ${centerX - 18} ${centerY - 111}" fill="none" stroke="${palette.paper}" stroke-width="5" stroke-linecap="round" opacity=".7" />
  </g>
  <g fill="${palette.accent}">
    <path d="M${centerX + radius * .78} ${centerY - radius * .72} l10 22 22 10 -22 10 -10 22 -10 -22 -22 -10 22 -10z" />
    <circle cx="${centerX - radius * .84}" cy="${centerY + radius * .55}" r="12" />
    <circle cx="${centerX + radius * .92}" cy="${centerY + radius * .54}" r="8" />
  </g>
</svg>`

  return {
    svg,
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    alt: `Ilustración vectorial de ${input.product} para ${input.businessType}`,
    dimensions: `${width} × ${height}`,
  }
}
