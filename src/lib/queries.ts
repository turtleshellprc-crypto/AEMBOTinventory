import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Category, Location } from './types'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('id,name').order('name')
      if (error) throw error
      return data as Category[]
    },
  })
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('storage_locations').select('id,name,parent_id').order('name')
      if (error) throw error
      return data as Location[]
    },
  })
}
