# Performate Setup Guide

## Storage Bucket Configuration

The app requires two storage buckets to be created in Supabase. These buckets **must be created manually** in the Supabase Dashboard before using the app.

### Step 1: Navigate to Storage

1. Go to your Supabase Dashboard
2. Click on **Storage** in the left sidebar
3. Click **New Bucket**

### Step 2: Create Required Buckets

Create the following buckets with these settings:

#### 1. student-photos
- **Name**: `student-photos`
- **Public**: ✅ Yes
- **File size limit**: 5MB (optional, recommended)
- **Allowed MIME types**: `image/*` (optional, recommended)

#### 2. morning-bliss-photos
- **Name**: `morning-bliss-photos`
- **Public**: ✅ Yes
- **File size limit**: 5MB (optional, recommended)
- **Allowed MIME types**: `image/*` (optional, recommended)

### Step 3: Configure Storage Policies

For each bucket, enable the following policies:

#### Read Policy (SELECT)
```sql
-- Allow public read access to all files
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'bucket_name');
```

#### Write Policy (INSERT)
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'bucket_name' AND auth.role() = 'authenticated');
```

#### Update Policy (UPDATE)
```sql
-- Allow authenticated users to update files
CREATE POLICY "Authenticated Update" ON storage.objects
FOR UPDATE USING (bucket_id = 'bucket_name' AND auth.role() = 'authenticated');
```

#### Delete Policy (DELETE)
```sql
-- Allow authenticated users to delete files
CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE USING (bucket_id = 'bucket_name' AND auth.role() = 'authenticated');
```

Replace `'bucket_name'` with the actual bucket name in each policy.

### Step 4: Verify Setup

After creating the buckets, verify they exist by checking the browser console on app load. You should see:

```
Existing buckets: ['student-photos', 'morning-bliss-photos']
```

If any bucket is missing, you'll see a warning message.

## Important Notes

1. **Bucket creation via code won't work** - The client-side Supabase client doesn't have permissions to create buckets. They must be created manually in the dashboard.

2. **RLS Policies** - Row Level Security policies are automatically set up for database tables via migrations, but storage policies need to be configured manually.

3. **Public access required** - The buckets need to be public so that uploaded files can be accessed without authentication for display purposes.

## Troubleshooting

### "Bucket not found" error
- Verify the bucket exists in Supabase Dashboard
- Check the bucket name matches exactly (case-sensitive)
- Ensure the bucket is public

### Upload fails with permission error
- Verify storage policies are set up correctly
- Check that the user is authenticated when uploading
- Ensure RLS is properly configured

### Files upload but can't be accessed
- Verify bucket is set to public
- Check the public URL is being retrieved correctly
- Ensure storage policies allow SELECT operations

## Environment Variables

Make sure your `.env` file (or environment) contains:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note**: The environment variable name is `VITE_SUPABASE_ANON_KEY` (not `VITE_SUPABASE_SUPABASE_ANON_KEY`).

## Testing Uploads

After setup, test the following uploads:

1. **Student Photo** - Go to Add Students and upload a photo
2. **Morning Bliss Photo** - Go to Morning Bliss Scores and upload presentation photos

All uploads should work without bucket errors if the setup is correct.

