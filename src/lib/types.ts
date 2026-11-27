export type StockStatus = 'ok' | 'low' | 'out'

export type Item = {
  id: string
  name: string
  part_number: string | null
  description: string | null
  category_id: string | null
  category_name: string | null
  manufacturer: string | null
  manufacturer_part_number: string | null
  material: string | null
  specifications: string | null
  image_url: string | null
  supplier_url: string | null
  notes: string | null
  location_id: string | null
  location_name: string | null
  quantity_on_hand: number
  quantity_allocated: number
  quantity_available: number
  min_stock_threshold: number
  unit: string
  source: 'manual' | 'fusion' | 'csv'
  fusion_document_id: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  stock_status: StockStatus
}

export type Category = { id: string; name: string }
export type Location = { id: string; name: string; parent_id: string | null }
export type Profile = { id: string; email: string; display_name: string; is_active: boolean }

export type Transaction = {
  id: string
  type: 'initial' | 'count' | 'received' | 'damaged' | 'correction'
  previous_quantity: number
  new_quantity: number
  quantity_change: number
  notes: string | null
  created_at: string
  profiles: { display_name: string } | null
}

export type DashboardStats = {
  unique_items: number
  total_quantity: number
  total_allocated: number
  total_available: number
  low_count: number
  zero_available_count: number
  by_category: { name: string; items: number; quantity: number }[]
  low_items: { id: string; name: string; part_number: string | null; quantity_on_hand: number; quantity_available: number; min_stock_threshold: number; unit: string; stock_status: StockStatus }[]
  recent_activity: { id: string; type: string; quantity_change: number; created_at: string; item_name: string; unit: string; user_name: string | null }[]
}
