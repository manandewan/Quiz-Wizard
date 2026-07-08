'use server';

import { supabase } from '@/lib/supabase';
import { getCurrentUser } from './auth';

export interface AttemptResult {
  success: boolean;
  isCorrect?: boolean;
  correctOptionIndex?: number;
  error?: string;
}

// Action to create a new MCQ
export async function createQuestion(
  category: string,
  textContent: string,
  options: string[],
  correctOptionIndex: number,
  imageFile?: File | null
): Promise<{ success: boolean; error?: string; question?: any }> {
  // 1. Verify that a teacher is making the request
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    return { success: false, error: 'Unauthorized: Only teachers can create questions.' };
  }

  // 2. Validate question input details
  if (!category || (category !== 'Quants' && category !== 'VA/RC')) {
    return { success: false, error: 'Invalid category selection.' };
  }
  const hasText = textContent.trim().length > 0;
  const hasImage = imageFile && imageFile.size > 0;
  if (!hasText && !hasImage) {
    return { success: false, error: 'Please enter question text or upload an image.' };
  }
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image file size must be less than 5MB.' };
    }
    if (!imageFile.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image.' };
    }
  }
  if (!Array.isArray(options) || options.length !== 4 || options.some(opt => !opt.trim())) {
    return { success: false, error: 'Please provide all 4 option choices.' };
  }
  if (correctOptionIndex < 0 || correctOptionIndex > 3) {
    return { success: false, error: 'Invalid correct option selection.' };
  }

  let uploadedFileName: string | null = null;
  try {
    let imageUrl = null;

    // 3. Upload Image to Supabase Storage if provided
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop() || 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      uploadedFileName = fileName;
      
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(fileName, buffer, {
          contentType: imageFile.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return { success: false, error: `Failed to upload image: ${uploadError.message}` };
      }

      // Retrieve public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(fileName);
      
      imageUrl = publicUrlData.publicUrl;
    }

    // 4. Save question metadata to the database
    const { data: newQuestion, error: dbError } = await supabase
      .from('questions')
      .insert({
        category,
        text_content: textContent.trim() || null,
        options: options.map(opt => opt.trim()),
        correct_option_index: correctOptionIndex,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving question:', dbError);
      if (uploadedFileName) {
        await supabase.storage.from('question-images').remove([uploadedFileName]);
      }
      return { success: false, error: `Failed to save question: ${dbError.message}` };
    }

    return { success: true, question: newQuestion };
  } catch (err) {
    console.error('Create question exception:', err);
    if (uploadedFileName) {
      try {
        await supabase.storage.from('question-images').remove([uploadedFileName]);
      } catch (cleanupErr) {
        console.error('Error cleaning up uploaded image:', cleanupErr);
      }
    }
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// Action to record a student's answer submission
export async function attemptQuestion(
  questionId: string,
  selectedOptionIndex: number
): Promise<AttemptResult> {
  // 1. Verify student session
  const student = await getCurrentUser();
  if (!student || student.role !== 'student') {
    return { success: false, error: 'Unauthorized: You must be logged in as a student.' };
  }

  if (selectedOptionIndex < 0 || selectedOptionIndex > 3) {
    return { success: false, error: 'Invalid option selection.' };
  }

  try {
    // 2. Fetch the target question to check correctness
    const { data: question, error: qError } = await supabase
      .from('questions')
      .select('correct_option_index')
      .eq('id', questionId)
      .single();

    if (qError || !question) {
      return { success: false, error: 'Question not found.' };
    }

    const isCorrect = question.correct_option_index === selectedOptionIndex;

    // 3. Log attempt to database (prevents retries via unique constraint)
    const { error: attemptError } = await supabase
      .from('attempts')
      .insert({
        student_id: student.id,
        question_id: questionId,
        is_correct: isCorrect,
        selected_option_index: selectedOptionIndex,
      });

    if (attemptError) {
      // Check if duplicate attempt
      if (attemptError.code === '23505') {
        return { success: false, error: 'You have already answered this question.' };
      }
      console.error('Error logging attempt:', attemptError);
      return { success: false, error: 'Failed to record attempt.' };
    }

    return {
      success: true,
      isCorrect,
      correctOptionIndex: question.correct_option_index
    };
  } catch (err) {
    console.error('Attempt question exception:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
