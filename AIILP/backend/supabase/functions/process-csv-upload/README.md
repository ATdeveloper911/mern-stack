# Process CSV Upload Edge Function

This edge function processes CSV files uploaded by universities for bulk student registration.

## Usage

Call this function after uploading a CSV file to Supabase Storage:

```javascript
const { data, error } = await supabase.functions.invoke('process-csv-upload', {
    body: {
        filePath: 'bulk-uploads/university-id/timestamp-file.csv',
        universityId: 'university-uuid',
        bulkUploadId: 'bulk-upload-uuid'
    }
});
```

## Environment Variables

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

## Response

```json
{
    "success": true,
    "results": {
        "successful": [...],
        "failed": [...],
        "total": 100
    }
}
```

