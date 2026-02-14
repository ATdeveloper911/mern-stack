import { useEffect } from 'react'
import { supabase } from '../utils/supabase'

export function useRealtime(channelName, onChange) {
  useEffect(() => {
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        onChange?.(payload)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName, onChange])
}