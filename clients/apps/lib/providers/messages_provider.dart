import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/models.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

class MessagesState {
  final String? conversationId;
  final List<Message> messages;
  final bool loading;
  final bool sending;
  final Object? error;

  const MessagesState({
    this.conversationId,
    this.messages = const [],
    this.loading = false,
    this.sending = false,
    this.error,
  });

  MessagesState copyWith({
    String? conversationId,
    List<Message>? messages,
    bool? loading,
    bool? sending,
    Object? error,
    bool clearError = false,
  }) => MessagesState(
    conversationId: conversationId ?? this.conversationId,
    messages: messages ?? this.messages,
    loading: loading ?? this.loading,
    sending: sending ?? this.sending,
    error: clearError ? null : (error ?? this.error),
  );
}

class MessagesNotifier extends Notifier<MessagesState> {
  @override
  MessagesState build() => const MessagesState();

  Future<void> load(String conversationId) async {
    state = MessagesState(conversationId: conversationId, loading: true);
    try {
      final list = await ref
          .read(messageServiceProvider)
          .getMessages(conversationId);
      list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      if (state.conversationId != conversationId) return;
      state = state.copyWith(messages: list, loading: false, clearError: true);
    } catch (e) {
      if (state.conversationId != conversationId) return;
      state = state.copyWith(loading: false, error: e);
    }
  }

  void clear() {
    state = const MessagesState();
  }

  void applyIncoming(Message m) {
    if (m.conversationId != state.conversationId) return;
    final idx = state.messages.indexWhere(
      (e) =>
          e.id == m.id ||
          (m.clientMsgId != null && e.clientMsgId == m.clientMsgId),
    );
    if (idx >= 0) {
      final updated = [...state.messages];
      updated[idx] = m;
      state = state.copyWith(messages: updated);
    } else {
      state = state.copyWith(messages: [...state.messages, m]);
    }
  }

  Future<bool> send(String text) async {
    final convId = state.conversationId;
    if (convId == null || text.isEmpty || state.sending) return false;

    final clientMsgId = const Uuid().v4();
    final me = ref.read(authProvider).user;
    final optimistic = Message(
      id: clientMsgId,
      conversationId: convId,
      senderId: me?.id ?? '',
      senderName: me?.displayName,
      senderAvatar: me?.avatar ?? me?.avatarURL,
      content: text,
      type: 'text',
      status: 'sending',
      createdAt: DateTime.now().toIso8601String(),
      clientMsgId: clientMsgId,
    );

    state = state.copyWith(
      messages: [...state.messages, optimistic],
      sending: true,
    );

    try {
      await ref
          .read(messageServiceProvider)
          .sendMessage(convId, text, clientMsgId: clientMsgId);
      if (state.conversationId == convId) {
        state = state.copyWith(sending: false);
      }
      return true;
    } catch (e) {
      if (state.conversationId == convId) {
        state = state.copyWith(
          messages: state.messages
              .map(
                (m) => m.clientMsgId == clientMsgId
                    ? m.copyWith(status: 'failed')
                    : m,
              )
              .toList(),
          sending: false,
          error: e,
        );
      }
      return false;
    }
  }
}

final messagesProvider = NotifierProvider<MessagesNotifier, MessagesState>(
  MessagesNotifier.new,
);
