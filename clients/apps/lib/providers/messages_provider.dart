import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

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

  Future<bool> sendImage(File file) async {
    final convId = state.conversationId;
    if (convId == null) return false;
    final clientMsgId = const Uuid().v4();
    final me = ref.read(authProvider).user;

    final bytes = await file.readAsBytes();
    int width = 0, height = 0;
    try {
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      width = frame.image.width;
      height = frame.image.height;
      frame.image.dispose();
    } catch (_) {}

    final localMeta = jsonEncode({
      'url': 'file://${file.path}',
      'mimeType': 'image/jpeg',
      'size': bytes.length,
      'width': width,
      'height': height,
      'fileName': file.uri.pathSegments.last,
      '_localPath': file.path,
    });

    final optimistic = Message(
      id: clientMsgId,
      conversationId: convId,
      senderId: me?.id ?? '',
      senderName: me?.displayName,
      senderAvatar: me?.avatar ?? me?.avatarURL,
      content: '',
      type: 'image',
      status: 'uploading',
      createdAt: DateTime.now().toIso8601String(),
      clientMsgId: clientMsgId,
      metadata: localMeta,
    );

    state = state.copyWith(messages: [...state.messages, optimistic]);

    try {
      final server = await ref
          .read(messageServiceProvider)
          .sendImageMessage(convId, file, clientMsgId: clientMsgId);
      if (state.conversationId == convId) {
        state = state.copyWith(
          messages: state.messages
              .map((m) => m.clientMsgId == clientMsgId ? server : m)
              .toList(),
        );
      }
      return true;
    } catch (e) {
      if (state.conversationId == convId) {
        state = state.copyWith(
          messages: state.messages
              .map((m) => m.clientMsgId == clientMsgId
                  ? m.copyWith(status: 'failed')
                  : m)
              .toList(),
          error: e,
        );
      }
      return false;
    }
  }

  Future<bool> toggleReaction(String messageId, String type) async {
    final convId = state.conversationId;
    if (convId == null) return false;
    final me = ref.read(authProvider).user;
    final myId = me?.id ?? '';

    final prev = state.messages;
    final optimistic = prev.map((m) {
      if (m.id != messageId) return m;
      final next = Map<String, List<String>>.from(m.reactions ?? {});
      final users = List<String>.from(next[type] ?? const []);
      if (users.contains(myId)) {
        users.remove(myId);
        if (users.isEmpty) {
          next.remove(type);
        } else {
          next[type] = users;
        }
      } else {
        users.add(myId);
        next[type] = users;
      }
      return m.copyWith(reactions: next);
    }).toList();
    state = state.copyWith(messages: optimistic);

    try {
      final server = await ref
          .read(messageServiceProvider)
          .toggleReaction(convId, messageId, type);
      if (state.conversationId == convId) {
        state = state.copyWith(
          messages: state.messages
              .map((m) => m.id == messageId
                  ? m.copyWith(reactions: server.reactions)
                  : m)
              .toList(),
        );
      }
      return true;
    } catch (e) {
      if (state.conversationId == convId) {
        state = state.copyWith(messages: prev, error: e);
      }
      return false;
    }
  }

  void applyReactionUpdate(String messageId, Map<String, List<String>> reactions) {
    state = state.copyWith(
      messages: state.messages
          .map((m) => m.id == messageId ? m.copyWith(reactions: reactions) : m)
          .toList(),
    );
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
