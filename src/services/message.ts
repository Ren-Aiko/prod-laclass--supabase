// =====================================================================
// src/services/message.ts
// Client Contact Concierge Message Service
// =====================================================================

import { supabase } from './client';
import { MessagePayload } from '../types/database';

export async function submitContactMessage(payload: MessagePayload): Promise<boolean> {
  const { error } = await supabase.from('messages').insert([payload]);
  if (error) {
    console.error('[submitContactMessage error]:', error);
    throw new Error(error.message);
  }
  return true;
}
