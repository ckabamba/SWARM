import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ask, AskMessage } from '../../types/warmpath';
import { THEME } from '../../theme/tokens';

interface AskConversationModalProps {
  visible: boolean;
  ask: Ask | null;
  sender: AskMessage['sender'];
  onSend: (askId: number, sender: AskMessage['sender'], text: string) => void;
  onAccept?: (askId: number) => void;
  onClose: () => void;
}

export default function AskConversationModal({
  visible,
  ask,
  sender,
  onSend,
  onAccept,
  onClose,
}: AskConversationModalProps) {
  const [messageText, setMessageText] = useState('');

  if (!ask) return null;

  const messages = ask.messages || [{
    id: ask.id,
    sender: 'student' as const,
    sender_name: ask.student_name,
    text: ask.message,
    created_at: ask.created_at,
  }];

  const handleSend = () => {
    const text = messageText.trim();
    if (!text) return;
    onSend(ask.id, sender, text);
    setMessageText('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerDetails}>
              <Text style={styles.title}>{ask.student_name}</Text>
              <Text style={styles.subtitle}>
                {ask.status === 'accepted' ? 'CALL REQUEST ACCEPTED' : 'ALUMNI ASK'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close conversation">
              <Ionicons name="close" size={23} color={THEME.colors.ash} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sharedTie}>{ask.shared_tie}</Text>
            {messages.map((message) => {
              const isMine = message.sender === sender;
              return (
                <View
                  key={message.id}
                  style={[styles.messageBubble, isMine ? styles.ownMessage : styles.otherMessage]}
                >
                  <Text style={[styles.senderName, isMine && styles.ownSenderName]}>
                    {message.sender_name}
                  </Text>
                  <Text style={[styles.messageText, isMine && styles.ownMessageText]}>
                    {message.text}
                  </Text>
                  <Text style={[styles.timestamp, isMine && styles.ownTimestamp]}>
                    {message.created_at}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {sender === 'alum' && ask.status === 'sent' && onAccept && (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => onAccept(ask.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptButtonText}>ACCEPT CALL REQUEST</Text>
            </TouchableOpacity>
          )}

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Write a message..."
              placeholderTextColor={THEME.colors.ash}
              multiline
              maxLength={1000}
              accessibilityLabel="Message"
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Ionicons name="arrow-up" size={18} color={THEME.colors.void} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  modal: {
    maxHeight: '86%',
    minHeight: '58%',
    backgroundColor: THEME.colors.panelSolid,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  headerDetails: {
    gap: 3,
  },
  title: {
    ...THEME.typography.title,
    fontSize: 17,
  },
  subtitle: {
    ...THEME.typography.cap,
    color: THEME.colors.gold,
    fontSize: 8,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    gap: 12,
    paddingVertical: 16,
  },
  sharedTie: {
    ...THEME.typography.bodyAsh,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: THEME.rounded.message,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 233, 168, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 233, 168, 0.28)',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  senderName: {
    ...THEME.typography.cap,
    color: THEME.colors.gold,
    fontSize: 8,
    marginBottom: 5,
  },
  ownSenderName: {
    color: THEME.colors.glow,
  },
  messageText: {
    ...THEME.typography.body,
    fontSize: 13,
    lineHeight: 19,
  },
  ownMessageText: {
    color: THEME.colors.glow,
  },
  timestamp: {
    ...THEME.typography.bodyAsh,
    fontSize: 9,
    textAlign: 'right',
    marginTop: 5,
  },
  ownTimestamp: {
    color: 'rgba(255, 233, 168, 0.65)',
  },
  acceptButton: {
    alignItems: 'center',
    borderRadius: THEME.rounded.pill,
    backgroundColor: THEME.colors.glow,
    paddingVertical: 12,
    marginBottom: 12,
  },
  acceptButtonText: {
    color: THEME.colors.void,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: THEME.rounded.field,
    backgroundColor: THEME.colors.surface,
    padding: 8,
  },
  input: {
    flex: 1,
    maxHeight: 96,
    minHeight: 38,
    color: THEME.colors.bone,
    fontSize: 14,
    paddingHorizontal: 6,
    paddingTop: 9,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.glow,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
