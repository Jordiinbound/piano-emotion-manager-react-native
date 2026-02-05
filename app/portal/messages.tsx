/**
 * Client Portal - Messages
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { trpc } from '../../utils/trpc';
import { useRouter } from 'expo-router';

export default function PortalMessagesScreen() {
  const router = useRouter();
  const [newMessage, setNewMessage] = useState('');

  const { data: messages, refetch } = trpc.clientPortal.messages.list.useQuery({
    limit: 50,
  });

  const sendMessageMutation = trpc.clientPortal.messages.send.useMutation();

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendMessageMutation.mutateAsync({
        message: newMessage.trim(),
      });

      setNewMessage('');
      refetch();
    } catch (error: any) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isFromClient = !!item.fromClientPortalUserId;

    return (
      <View
        style={[
          styles.messageBubble,
          isFromClient ? styles.messageBubbleClient : styles.messageBubbleTechnician,
        ]}
      >
        <Text style={styles.messageText}>{item.message}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mensajes</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={messages || []}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sendMessageMutation.isLoading}
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    color: '#2196F3',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  messageBubbleClient: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
  },
  messageBubbleTechnician: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
