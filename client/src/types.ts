export type GenerationType = 'anuncio' | 'facebook' | 'slogan' | 'nombres'
export type AppMode = GenerationType | 'chat'

export interface GenerationInput {
  type: GenerationType
  businessType: string
  product: string
  channel: string
  tone: string
  location?: string
  additionalDetails?: string
}

export interface GenerationRecord {
  id: number
  type: GenerationType
  business_type: string
  product: string
  channel: string | null
  tone: string | null
  location: string | null
  result: string
  created_at: string
}

export interface ChatMessage {
  id?: number | string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}
