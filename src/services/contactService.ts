// =====================================================================
// src/services/contactService.ts
// Decoupled Contact Concierge Service Layer (Messages table CRUD)
// =====================================================================

import { getSupabase, isSupabaseConfigured } from '../utils/supabase';
import { ContactMessage } from '../types';

/**
 * Submit contact inquiry into `messages` table
 */
export async function submitContactMessage(payload: {
  name: string;
  email: string;
  body: string;
  phone?: string;
}): Promise<{ success: boolean; id: string; message: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      body: payload.body.trim(),
      message: payload.body.trim(), // backward compatibility with legacy schema
      phone: payload.phone?.trim() || null,
      status: 'Unread',
    })
    .select()
    .single();

  if (error) {
    console.error('[contactService.submitContactMessage error]:', error);
    throw new Error(error.message || 'Failed to transmit concierge message.');
  }

  return {
    success: true,
    id: data.id,
    message: 'Your inquiry has been received. Our concierge atelier will get back to you shortly.',
  };
}

/**
 * Fetch messages for Admin Panel
 */
export async function fetchContactMessagesAdmin(): Promise<ContactMessage[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('[contactService.fetchContactMessagesAdmin error]:', error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      message: row.body || row.message || '',
      date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: row.status || 'Unread',
    }));
  } catch (err) {
    console.error('[contactService.fetchContactMessagesAdmin error]:', err);
    return [];
  }
}
