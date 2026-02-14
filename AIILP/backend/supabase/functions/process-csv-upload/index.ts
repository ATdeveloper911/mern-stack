import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      })
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const body = await req.json().catch(() => ({}))
    const csvText: string | undefined = body?.csvText
    const filePath: string | undefined = body?.filePath
    const universityId: string | undefined = body?.universityId
    const bulkUploadId: string | undefined = body?.bulkUploadId

    if (!universityId || !bulkUploadId || (!csvText && !filePath)) {
      return new Response(JSON.stringify({ error: 'Missing required fields: universityId, bulkUploadId, and csvText or filePath' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      })
    }

    let csv = csvText || ''
    if (!csv && filePath) {
      // If needed later: download from Storage using service role.
      const { data, error } = await supabase.storage.from('csv-uploads').download(filePath)
      if (error) {
        return new Response(JSON.stringify({ error: `Failed to download CSV: ${error.message}` }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 400,
        })
      }
      csv = await data.text()
    }

    // Simple CSV parsing: count non-empty data rows excluding header
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
    const totalRecords = Math.max(0, lines.length - 1)

    // Update bulk_uploads record to indicate processing completed (placeholder)
    const { error: updateError } = await supabase
      .from('bulk_uploads')
      .update({ status: 'completed', successful_records: totalRecords, failed_records: 0, completed_at: new Date().toISOString() })
      .eq('id', bulkUploadId)
      .eq('university_id', universityId)

    if (updateError) {
      return new Response(JSON.stringify({ error: `Failed to update bulk_uploads: ${updateError.message}` }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ success: true, processed: totalRecords }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500,
    })
  }
})