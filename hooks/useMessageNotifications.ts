'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getUserMessages } from '@/lib/supabase/messages';
import { showMessageNotification } from '@/lib/utils/notifications';
import { useRouter } from 'next/navigation';

export function useMessageNotifications() {
    const { userData } = useAuth();
    const router = useRouter();
    const lastMessageCountRef = useRef<number>(0);
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        if (!userData?.id) return;

        const checkForNewMessages = async () => {
            try {
                const messages = await getUserMessages(userData.id);
                const unreadMessages = messages.filter(msg => !msg.readBy.includes(userData.id));
                const currentUnreadCount = unreadMessages.length;

                // Skip notification on initial load
                if (isInitialLoadRef.current) {
                    lastMessageCountRef.current = currentUnreadCount;
                    isInitialLoadRef.current = false;
                    return;
                }

                // Check if there are new unread messages
                if (currentUnreadCount > lastMessageCountRef.current) {
                    const newMessagesCount = currentUnreadCount - lastMessageCountRef.current;
                    const latestMessage = unreadMessages[0]; // Most recent unread message

                    if (latestMessage) {
                        showMessageNotification(
                            `New Message from ${latestMessage.senderName}`,
                            latestMessage.subject,
                            () => {
                                router.push('/dashboard/messages');
                            }
                        );
                    } else if (newMessagesCount > 1) {
                        showMessageNotification(
                            'New Messages',
                            `You have ${newMessagesCount} new messages`,
                            () => {
                                router.push('/dashboard/messages');
                            }
                        );
                    }
                }

                lastMessageCountRef.current = currentUnreadCount;
            } catch (error) {
                console.error('Error checking for new messages:', error);
            }
        };

        // Check immediately
        checkForNewMessages();

        // Then check every 15 seconds
        const interval = setInterval(checkForNewMessages, 15000);

        return () => clearInterval(interval);
    }, [userData?.id, router]);
}
