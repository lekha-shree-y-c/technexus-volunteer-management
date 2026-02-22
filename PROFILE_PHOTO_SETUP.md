# Profile Photo Upload Setup Guide

This guide explains how to set up the volunteer profile photo feature in your Supabase backend.

## 1. Add Photo URL Column to Database

Run this SQL migration in your Supabase SQL editor:

```sql
-- Add photo_url column to volunteers table
ALTER TABLE volunteers
ADD COLUMN photo_url TEXT DEFAULT NULL;

-- Optional: Add an index for faster queries
CREATE INDEX idx_volunteers_photo_url ON volunteers(photo_url);
```

## 2. Create Storage Bucket

Follow these steps to create a storage bucket for volunteer photos:

### Via Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Name it: `volunteer-photos`
5. Set **Public bucket** to **ON** (so users can view the photos)
6. Click **Create bucket**

### Via Supabase CLI:

```bash
supabase storage buckets create volunteer-photos --public
```

## 3. Configure Storage Policies (Recommended for Security)

In your Supabase Dashboard:

1. Go to **Storage** → **volunteer-photos**
2. Click the three dots menu → **Edit policies**
3. Add the following policy for uploads:

**Policy for authenticated uploads:**
```sql
CREATE POLICY "Allow authenticated users to upload photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'volunteer-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to update their photos"
  ON storage.objects
  FOR UPDATE
  WITH CHECK (
    bucket_id = 'volunteer-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow public read access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'volunteer-photos');
```

## 4. Features Implemented

### Photo Upload Flow:
- ✅ File selection (JPG/PNG only)
- ✅ Client-side preview
- ✅ Image cropping with zoom and rotation adjustment
- ✅ Automatic image compression (max 1MB)
- ✅ Automatic resizing to 256x256px
- ✅ Upload to Supabase storage
- ✅ Store photo URL in database

### Components Created:
- **PhotoUpload.tsx** - File input and preview UI
- **ImageCropModal.tsx** - Image cropping interface with zoom/rotation
- **image-utils.ts** - Image processing utilities

### Updated Components:
- **AddVolunteerModal.tsx** - Added photo upload capability
- **EditVolunteerModal.tsx** - Added photo upload/change/remove capability
- **VolunteerCard.tsx** - Display photos with fallback to initials

## 5. Usage Without Authentication

If you don't have authentication enabled, update the storage policies to allow anonymous uploads:

```sql
CREATE POLICY "Allow anonymous uploads"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'volunteer-photos');

CREATE POLICY "Allow public read access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'volunteer-photos');
```

## 6. Troubleshooting

### Issue: "Failed to upload photo"
- Check that the `volunteer-photos` bucket exists
- Verify storage policies are configured correctly
- Check browser console for detailed error messages

### Issue: "Photo not displaying"
- Confirm bucket is set to **PUBLIC**
- Check that the photo_url was saved in the database
- Verify the Storage URL format is correct

### Issue: "Crop modal not appearing"
- Ensure dependencies are installed: `npm install react-easy-crop browser-image-compression`
- Check browser console for JavaScript errors

## 7. Environment Variables

No additional environment variables needed - uses existing Supabase configuration from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 8. Database Schema

```sql
-- Volunteer table with photo_url column
CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  place TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  joining_date DATE NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 9. Next Steps

1. Run the SQL migration to add `photo_url` column
2. Create the `volunteer-photos` storage bucket
3. Configure storage policies as shown above
4. Test by adding/editing a volunteer and uploading a photo
5. The photo will automatically be displayed on the volunteer card

## 10. Performance Optimization

- Images are automatically compressed to max 1MB
- Images are resized to 256x256px for optimal storage
- Client-side cropping prevents unnecessary uploads
- Browser image compression library handles optimization

---

For more details on Supabase Storage, see: https://supabase.com/docs/guides/storage
