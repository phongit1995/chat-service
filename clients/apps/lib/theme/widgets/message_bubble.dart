import 'package:flutter/material.dart';

import '../app_colors.dart';
import '../app_gradients.dart';
import '../app_typography.dart';
import 'gradient_avatar.dart';

class MessageBubble extends StatelessWidget {
  final String content;
  final bool isMine;
  final String? senderName;
  final String? senderAvatar;
  final String time;
  final String status;
  final bool isLastOwnMessage;
  final bool conversationSeen;
  final bool isGroup;
  final bool isFirstInStreak;
  final bool isLastInStreak;
  final bool showTime;

  const MessageBubble({
    super.key,
    required this.content,
    required this.isMine,
    this.senderName,
    this.senderAvatar,
    required this.time,
    this.status = 'sent',
    this.isLastOwnMessage = false,
    this.conversationSeen = false,
    this.isGroup = false,
    this.isFirstInStreak = true,
    this.isLastInStreak = true,
    this.showTime = true,
  });

  Widget? _buildStatusIcon() {
    if (!isMine) return null;

    if (status == 'sending') {
      return SizedBox(
        width: 12,
        height: 12,
        child: CircularProgressIndicator(
          strokeWidth: 1.5,
          color: AppColors.textTertiary,
        ),
      );
    }
    if (status == 'failed') {
      return Icon(
        Icons.error_outline,
        size: 14,
        color: Colors.redAccent.shade100,
      );
    }
    if (!isLastOwnMessage) return null;
    if (conversationSeen) {
      return const Text(
        '✓✓',
        style: TextStyle(
          color: AppColors.primary,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      );
    }
    return const Text(
      '✓',
      style: TextStyle(color: AppColors.textTertiary, fontSize: 12),
    );
  }

  @override
  Widget build(BuildContext context) {
    const lg = Radius.circular(AppRadius.xl);
    const sm = Radius.circular(AppRadius.sm);
    final BorderRadius radius = isMine
        ? BorderRadius.only(
            topLeft: lg,
            topRight: isFirstInStreak ? lg : sm,
            bottomLeft: lg,
            bottomRight: isLastInStreak ? lg : sm,
          )
        : BorderRadius.only(
            topLeft: isFirstInStreak ? lg : sm,
            topRight: lg,
            bottomLeft: isLastInStreak ? lg : sm,
            bottomRight: lg,
          );

    final statusIcon = _buildStatusIcon();
    final isFailed = status == 'failed';
    final showName =
        !isMine &&
        isGroup &&
        isFirstInStreak &&
        (senderName?.isNotEmpty ?? false);
    final showAvatar = !isMine && isLastInStreak;

    final bubble = Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        gradient: isMine ? AppGradients.signature : null,
        color: isMine ? null : AppColors.bgOverlay,
        borderRadius: radius,
        boxShadow: isMine ? AppShadows.sm : null,
      ),
      child: Text(
        content,
        style: TextStyle(
          color: isMine ? Colors.white : AppColors.textPrimary,
          fontSize: 15,
          height: 1.35,
        ),
      ),
    );

    final column = Column(
      crossAxisAlignment: isMine
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showName)
          Padding(
            padding: const EdgeInsets.only(bottom: 2, left: 8),
            child: Text(
              senderName!,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.textTertiary,
              ),
            ),
          ),
        bubble,
        if (showTime || status == 'sending' || status == 'failed')
          Padding(
            padding: const EdgeInsets.only(top: 2, left: 4, right: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  time,
                  style: const TextStyle(
                    color: AppColors.textTertiary,
                    fontSize: 11,
                  ),
                ),
                if (statusIcon != null) ...[
                  const SizedBox(width: 6),
                  statusIcon,
                ],
              ],
            ),
          ),
      ],
    );

    return Padding(
      padding: EdgeInsets.only(top: isFirstInStreak ? 12 : 4),
      child: Row(
        mainAxisAlignment: isMine
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMine)
            SizedBox(
              width: 32,
              child: showAvatar
                  ? GradientAvatar(
                      name: senderName ?? '',
                      imageUrl: senderAvatar,
                      size: 28,
                    )
                  : null,
            ),
          if (!isMine) const SizedBox(width: 6),
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.72,
              ),
              child: Opacity(opacity: isFailed ? 0.7 : 1.0, child: column),
            ),
          ),
        ],
      ),
    );
  }
}
