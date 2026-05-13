import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../models/ws_events.dart';
import '../services/socket_service.dart';
import 'active_conversation_provider.dart';
import 'auth_provider.dart';
import 'core_providers.dart';

class ConversationsNotifier extends AsyncNotifier<List<Conversation>> {
  @override
  Future<List<Conversation>> build() async {
    return ref.read(conversationServiceProvider).getConversations();
  }

  Future<void> reload() async {
    try {
      final list = await ref
          .read(conversationServiceProvider)
          .getConversations();
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void markRead(String conversationId) {
    final list = state.value ?? [];
    final idx = list.indexWhere(
      (conversation) => conversation.id == conversationId,
    );
    if (idx < 0) return;

    final old = list[idx];
    if (old.unreadCount == 0) return;

    final newList = [...list];
    newList[idx] = old.copyWith(unreadCount: 0);
    state = AsyncValue.data(newList);
  }

  void handleConversationUpdated(ConversationUpdatedPayload data) {
    final seen = data.seen;
    if (seen == null) {
      reload();
      return;
    }

    final list = state.value ?? [];
    final idx = list.indexWhere((conversation) => conversation.id == data.id);
    if (idx < 0) {
      reload();
      return;
    }

    final newList = [...list];
    newList[idx] = list[idx].copyWith(seen: seen);
    state = AsyncValue.data(newList);
  }

  void handleConversationDeleted(String id) {
    final list = state.value ?? [];
    state = AsyncValue.data(
      list.where((conversation) => conversation.id != id).toList(),
    );

    if (ref.read(activeConversationProvider) == id) {
      ref.read(activeConversationProvider.notifier).set(null);
    }
  }

  void handleNewMessage(NewMessageEvent event) {
    final msg = event.message;
    final list = state.value ?? [];
    final idx = list.indexWhere(
      (conversation) => conversation.id == msg.conversationId,
    );

    final me = ref.read(authProvider).user?.id;
    final activeId = ref.read(activeConversationProvider);
    final isActive = activeId == msg.conversationId;
    final isFromMe = msg.senderId == me;

    if (idx < 0) {
      _insertConversationFromEvent(
        event,
        isFromMe: isFromMe,
        isActive: isActive,
      );
      return;
    }

    final old = list[idx];
    final updated = old.copyWith(
      lastMessageText: msg.content,
      lastMessageAt: msg.createdAt,
      lastMessageSenderId: msg.senderId,
      lastMessageSenderName: msg.senderName,
      isLastMessageFromMe: isFromMe,
      seen: isFromMe ? false : isActive,
      unreadCount: _nextUnreadCount(
        old,
        isFromMe: isFromMe,
        isActive: isActive,
      ),
    );

    state = AsyncValue.data([
      updated,
      ...list.where((conversation) => conversation.id != msg.conversationId),
    ]);

    if (isActive && !isFromMe) {
      ref
          .read(conversationServiceProvider)
          .markAsRead(msg.conversationId)
          .catchError((_) {});
    }
  }

  void _insertConversationFromEvent(
    NewMessageEvent event, {
    required bool isFromMe,
    required bool isActive,
  }) {
    final base = event.conversation;
    if (base == null) {
      reload();
      return;
    }

    final msg = event.message;
    final list = state.value ?? [];
    final newConversation = Conversation(
      id: base.id,
      type: base.type,
      name: base.name,
      avatar: base.avatar,
      lastMessageText: msg.content,
      lastMessageAt: msg.createdAt,
      lastMessageSenderId: msg.senderId,
      lastMessageSenderName: msg.senderName,
      isLastMessageFromMe: isFromMe,
      seen: isFromMe ? false : isActive,
      unreadCount: isFromMe ? 0 : (isActive ? 0 : 1),
      participantCount: base.participantCount,
      otherUser: base.otherUser,
    );

    state = AsyncValue.data([newConversation, ...list]);
  }

  int _nextUnreadCount(
    Conversation conversation, {
    required bool isFromMe,
    required bool isActive,
  }) {
    if (isActive) return 0;
    if (!isFromMe) return conversation.unreadCount + 1;
    return conversation.unreadCount;
  }
}

final conversationsProvider =
    AsyncNotifierProvider<ConversationsNotifier, List<Conversation>>(
      ConversationsNotifier.new,
    );
