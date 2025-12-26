import { supabase } from '@/lib/supabase/client';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface ImageUploadResult {
  url: string | null;
  path: string | null;
  error: string | null;
}

/**
 * Request camera and media library permissions
 */
export async function requestImagePermissions(): Promise<boolean> {
  try {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
}

/**
 * Pick an image from the device
 */
export async function pickImage(
  allowsEditing: boolean = true,
  aspect: [number, number] = [4, 3],
  quality: number = 0.8
): Promise<string | null> {
  try {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing,
      aspect,
      quality,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
}

/**
 * Take a photo with the camera
 */
export async function takePhoto(
  allowsEditing: boolean = true,
  aspect: [number, number] = [4, 3],
  quality: number = 0.8
): Promise<string | null> {
  try {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing,
      aspect,
      quality,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
}

/**
 * Upload an image to the inspector-images bucket
 * @param imageUri - Local URI of the image
 * @param userId - User ID (will be used as folder name)
 * @param fileName - Optional custom file name (defaults to timestamp)
 * @param description - Optional description for the image
 * @param institutionId - Optional institution ID
 * @param collectionId - Optional collection ID
 */
export async function uploadInspectorImage(
  imageUri: string,
  userId: string,
  fileName?: string,
  description?: string,
  institutionId?: number,
  collectionId?: number
): Promise<ImageUploadResult> {
  try {
    // Get file extension
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';

    // Generate file name if not provided
    const finalFileName = fileName || `${Date.now()}.${fileExt}`;

    // Create file path: {user_id}/{filename}
    const filePath = `${userId}/${finalFileName}`;

    // Convert image to blob
    const response = await fetch(imageUri);
    if (!response.ok) {
      return {
        url: null,
        path: null,
        error: 'Failed to read image file',
      };
    }

    const blob = await response.blob();
    const fileSize = blob.size;

    // Determine MIME type
    const mimeType = `image/${fileExt === 'jpg' || fileExt === 'jpeg' ? 'jpeg' : fileExt}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inspector-images')
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return {
        url: null,
        path: null,
        error: uploadError.message || 'Failed to upload image',
      };
    }

    // Get public URL (for private buckets, use signed URL)
    const { data: { publicUrl } } = supabase.storage
      .from('inspector-images')
      .getPublicUrl(filePath);

    // For private buckets, we need to use signed URLs
    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('inspector-images')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    const imageUrl = signedUrlData?.signedUrl || publicUrl;

    // Save metadata to database
    const { data: imageRecord, error: dbError } = await supabase
      .from('inspector_images')
      .insert({
        inspector_id: userId,
        file_path: filePath,
        file_name: finalFileName,
        file_size: fileSize,
        mime_type: mimeType,
        description: description || null,
        institution_id: institutionId || null,
        collection_id: collectionId || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving image metadata:', dbError);
      // Don't fail the upload if metadata save fails
    }

    return {
      url: imageUrl,
      path: filePath,
      error: null,
    };
  } catch (error: any) {
    console.error('Error uploading inspector image:', error);
    return {
      url: null,
      path: null,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Delete an image from the inspector-images bucket
 */
export async function deleteInspectorImage(
  filePath: string,
  imageId?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('inspector-images')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting image from storage:', storageError);
      return {
        success: false,
        error: storageError.message || 'Failed to delete image',
      };
    }

    // Delete metadata from database if imageId is provided
    if (imageId) {
      const { error: dbError } = await supabase
        .from('inspector_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        console.error('Error deleting image metadata:', dbError);
        // Don't fail if metadata delete fails
      }
    }

    return {
      success: true,
      error: null,
    };
  } catch (error: any) {
    console.error('Error deleting inspector image:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Get signed URL for a private image
 */
export async function getImageSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('inspector-images')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}

/**
 * Get all images uploaded by an inspector
 */
export async function getInspectorImages(
  inspectorId: string,
  institutionId?: number,
  collectionId?: number
): Promise<any[]> {
  try {
    let query = supabase
      .from('inspector_images')
      .select('*')
      .eq('inspector_id', inspectorId)
      .order('uploaded_at', { ascending: false });

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    if (collectionId) {
      query = query.eq('collection_id', collectionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inspector images:', error);
      return [];
    }

    // Get signed URLs for all images
    const imagesWithUrls = await Promise.all(
      (data || []).map(async (image) => {
        const signedUrl = await getImageSignedUrl(image.file_path);
        return {
          ...image,
          url: signedUrl,
        };
      })
    );

    return imagesWithUrls;
  } catch (error) {
    console.error('Error getting inspector images:', error);
    return [];
  }
}
