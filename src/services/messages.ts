import { ContactMessage } from '../types';
import { invokeEdgeFunction } from '../utils/supabase';
import { submitContactMessage, fetchContactMessagesAdmin } from './contactService';

export const sendContactMessage = async (message: ContactMessage): Promise<boolean> => {
  try {
    // 1. Try decoupled contact service (inserts directly into messages table with body)
    await submitContactMessage({
      name: message.name,
      email: message.email,
      body: message.message,
      phone: message.phone,
    });
    return true;
  } catch (err: any) {
    console.warn('[submitContactMessage failed, trying edge function]:', err);
    try {
      await invokeEdgeFunction('contact-message', {
        method: 'POST',
        body: {
          name: message.name,
          email: message.email,
          phone: message.phone,
          message: message.message,
        },
      });
      return true;
    } catch (edgeErr: any) {
      console.error('[sendContactMessage Error]:', edgeErr);
      throw edgeErr;
    }
  }
};

export const fetchContactMessages = async (): Promise<ContactMessage[]> => {
  try {
    const rawList = await invokeEdgeFunction<any[]>('admin-messages', {
      method: 'GET',
    });

    if (Array.isArray(rawList)) {
      return rawList.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone || '',
        message: m.message,
        date: (m.created_at || '').split('T')[0],
        status: m.status || 'Unread',
      }));
    }
  } catch (e) {
    console.warn('[fetchContactMessages Error]:', e);
  }

  return [];
};

export const sendContactMessageToSheet = sendContactMessage;
