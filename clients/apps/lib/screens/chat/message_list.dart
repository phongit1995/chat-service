import 'package:flutter/material.dart';

import '../../models/models.dart';
import '../../theme/widgets.dart';

class MessageList extends StatelessWidget {
  final Conversation conversation;
  final List<Message> messages;
  final User? user;
  final ScrollController scrollController;

  const MessageList({
    super.key,
    required this.conversation,
    required this.messages,
    required this.user,
    required this.scrollController,
  });

  @override
  Widget build(BuildContext context) {
    final sortedMessages = [...messages]
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));

    int lastOwnIdx = -1;
    for (var i = sortedMessages.length - 1; i >= 0; i--) {
      if (sortedMessages[i].senderId == user?.id) {
        lastOwnIdx = i;
        break;
      }
    }

    final convSeen =
        conversation.isLastMessageFromMe && conversation.seen == true;
    const streakGapMs = 5 * 60 * 1000;

    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: sortedMessages.length,
      itemBuilder: (_, i) {
        final message = sortedMessages[i];
        final isMine = message.senderId == user?.id;
        final currentTime =
            DateTime.tryParse(message.createdAt)?.millisecondsSinceEpoch ?? 0;

        bool sameAsPrev = false;
        bool sameAsNext = false;

        if (i > 0) {
          final prev = sortedMessages[i - 1];
          final prevTime =
              DateTime.tryParse(prev.createdAt)?.millisecondsSinceEpoch ?? 0;
          sameAsPrev =
              prev.senderId == message.senderId &&
              (currentTime - prevTime) < streakGapMs;
        }
        if (i < sortedMessages.length - 1) {
          final next = sortedMessages[i + 1];
          final nextTime =
              DateTime.tryParse(next.createdAt)?.millisecondsSinceEpoch ?? 0;
          sameAsNext =
              next.senderId == message.senderId &&
              (nextTime - currentTime) < streakGapMs;
        }

        return MessageBubble(
          content: message.content,
          isMine: isMine,
          senderName: isMine ? null : message.senderName,
          senderAvatar: isMine ? null : message.senderAvatar,
          time: _formatTime(message.createdAt),
          status: message.status,
          isLastOwnMessage: i == lastOwnIdx,
          conversationSeen: convSeen,
          isGroup: conversation.type == 'group',
          isFirstInStreak: !sameAsPrev,
          isLastInStreak: !sameAsNext,
          showTime: !sameAsNext,
        );
      },
    );
  }

  String _formatTime(String iso) {
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return '';
    return '${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
  }
}
