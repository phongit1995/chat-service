import 'package:flutter/material.dart';

import '../../models/call.dart';
import '../../models/models.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_typography.dart';
import '../../theme/widgets.dart';
import '../../utils/relative_time.dart';
import '../call/call_button.dart';

class ChatAppBar extends StatelessWidget implements PreferredSizeWidget {
  final Conversation? conversation;
  final VoidCallback onBack;
  final ValueChanged<String>? onOpenProfile;

  const ChatAppBar({
    super.key,
    required this.conversation,
    required this.onBack,
    this.onOpenProfile,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final title = conversation?.displayName ?? 'Chat';
    final isDirect = conversation?.isDirect == true;
    final isOnline = isDirect && (conversation?.otherUser?.isOnline ?? false);
    final subtitle = isDirect
        ? (isOnline
              ? 'Active now'
              : formatLastActive(conversation?.otherUser?.lastActiveAt))
        : '${conversation?.participantCount ?? 0} members';
    final subtitleColor = isOnline
        ? AppColors.success
        : (isDirect && subtitle.startsWith('Active')
              ? AppColors.textSecondary
              : AppColors.textTertiary);

    return AppBar(
      backgroundColor: AppColors.bgSurface,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      leading: IconButton(
        icon: const Icon(
          Icons.arrow_back_ios_new_rounded,
          color: AppColors.textPrimary,
          size: 20,
        ),
        onPressed: onBack,
      ),
      title: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: (isDirect && conversation?.otherUser?.id != null && onOpenProfile != null)
            ? () => onOpenProfile!(conversation!.otherUser!.id)
            : null,
        child: Row(
        children: [
          Stack(
            children: [
              GradientAvatar(
                name: title,
                imageUrl: conversation?.avatar,
                size: 36,
              ),
              if (isOnline)
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: AppColors.success,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.bgSurface, width: 2),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontFamily: AppTypography.display,
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: subtitleColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
      ),
      actions: [
        if (isDirect && conversation?.otherUser != null)
          CallButton(
            conversationId: conversation!.id,
            peer: CallerBrief(
              id: conversation!.otherUser!.id,
              username: conversation!.otherUser!.username,
              fullName: conversation!.otherUser!.fullName,
              avatar: conversation!.otherUser!.avatar,
            ),
          ),
        IconButton(
          icon: const Icon(
            Icons.more_horiz_rounded,
            color: AppColors.textSecondary,
          ),
          onPressed: () {},
        ),
      ],
    );
  }
}
