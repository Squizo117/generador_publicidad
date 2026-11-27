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
  dimensions: string
  alt: string
}

export function vectorDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
