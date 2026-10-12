import { ContactMessage } from '../types';
import { invokeEdgeFunction } from '../utils/supabase';

export const sendContactMessage = async (message: ContactMessage): Promise<boolean> => {
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
  } catch (err: any) {
    console.error('[sendContactMessage Error]:', err.message);
    throw err;
  }
};

export const fetchContactMessages = async (): Promise<ContactMessage[]> => {
  try {
    const rawList = await invokeEdgeFunction<any[]>('admin-messages', {
      method: 'GET',
    });

    if (Array.isArray(rawList)) {
      return rawList.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone || '',
        message: m.message,
        date: (m.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
        status: m.status || 'Unread',
      }));
    }
  } catch (err: any) {
    console.error('[fetchContactMessages Error]:', err.message);
  }

  return [];
};

export const sendContactMessageToSheet = sendContactMessage;
