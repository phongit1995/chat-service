import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import 'package:photo_view/photo_view.dart';

import '../../utils/image_meta.dart';
import '../../utils/reactions.dart';
import '../app_colors.dart';
import '../app_gradients.dart';
import '../app_typography.dart';
import 'gradient_avatar.dart';

class MessageBubble extends StatelessWidget {
  final String messageId;
  final String content;
  final String messageType;
  final String? metadata;
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
  final bool isEdited;
  final Map<String, List<String>>? reactions;
  final String myUserId;
  final Future<void> Function(String messageId, String type)? onReact;
  final void Function(String messageId)? onEdit;
  final Future<void> Function(String messageId)? onDelete;
  final String? senderId;
  final ValueChanged<String>? onOpenProfile;

  const MessageBubble({
    super.key,
    required this.messageId,
    required this.content,
    this.messageType = 'text',
    this.metadata,
    required this.isMine,
    this.senderId,
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
    this.isEdited = false,
    this.reactions,
    this.myUserId = '',
    this.onReact,
    this.onEdit,
    this.onDelete,
    this.onOpenProfile,
  });

  Widget? _buildStatusIcon() {
    if (!isMine) return null;
    if (status == 'sending' || status == 'uploading') {
      return const SizedBox(
        width: 12,
        height: 12,
        child: CircularProgressIndicator(
          strokeWidth: 1.5,
          color: AppColors.textTertiary,
        ),
      );
    }
    if (status == 'failed') {
      return Icon(Icons.error_outline, size: 14, color: Colors.redAccent.shade100);
    }
    if (!isLastOwnMessage) return null;
    if (conversationSeen) {
      return const Text('✓✓',
          style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w700));
    }
    return const Text('✓', style: TextStyle(color: AppColors.textTertiary, fontSize: 12));
  }

  void _openLightbox(BuildContext context, String url) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black87,
        pageBuilder: (_, __, ___) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            iconTheme: const IconThemeData(color: Colors.white),
            elevation: 0,
          ),
          body: PhotoView(
            imageProvider: url.startsWith('file://')
                ? FileImage(File(url.replaceFirst('file://', '')))
                : CachedNetworkImageProvider(url) as ImageProvider,
            backgroundDecoration: const BoxDecoration(color: Colors.black),
            minScale: PhotoViewComputedScale.contained,
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, BorderRadius radius) {
    if (messageType == 'image') {
      final meta = ImageMetadata.parse(metadata);
      if (meta == null) {
        return Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.bgOverlay, borderRadius: radius),
          child: const Text('[image]'),
        );
      }
      final ar = (meta.width != null && meta.height != null && meta.width! > 0 && meta.height! > 0)
          ? meta.width! / meta.height!
          : 4 / 3;
      Widget img;
      if (meta.url.startsWith('file://') || meta.localPath != null) {
        final path = meta.localPath ?? meta.url.replaceFirst('file://', '');
        img = Image.file(File(path), fit: BoxFit.cover);
      } else {
        img = CachedNetworkImage(
          imageUrl: meta.url,
          fit: BoxFit.cover,
          placeholder: (_, __) => Container(color: AppColors.bgOverlay),
          errorWidget: (_, __, ___) => Container(
            color: AppColors.bgOverlay,
            child: const Icon(Icons.broken_image, color: AppColors.textTertiary),
          ),
        );
      }
      return GestureDetector(
        onTap: status == 'uploading' ? null : () => _openLightbox(context, meta.url),
        child: ClipRRect(
          borderRadius: radius,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 260, maxHeight: 320),
            child: AspectRatio(
              aspectRatio: ar,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  img,
                  if (status == 'uploading')
                    Container(
                      color: Colors.black.withValues(alpha: 0.4),
                      child: const Center(
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Container(
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
  }

  Widget _buildReactionsChip() {
    final entries = (reactions ?? {}).entries.where((e) => e.value.isNotEmpty).toList()
      ..sort((a, b) => b.value.length.compareTo(a.value.length));
    if (entries.isEmpty) return const SizedBox.shrink();
    final emojis = entries
        .map((e) => reactionEmoji[e.key])
        .where((s) => s != null && s.isNotEmpty)
        .cast<String>()
        .toList();
    final total = entries.fold<int>(0, (s, e) => s + e.value.length);
    return Container(
      margin: const EdgeInsets.only(top: 4),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.lineSubtle),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final e in emojis) Text(e, style: const TextStyle(fontSize: 14)),
          if (total > 1) ...[
            const SizedBox(width: 4),
            Text('$total',
                style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w600)),
          ],
        ],
      ),
    );
  }

  void _showActionsMenu(BuildContext context) {
    final canReact = onReact != null && status != 'sending' && status != 'uploading' && status != 'failed';
    final canEdit = isMine && messageType == 'text' && onEdit != null && status == 'sent';
    final canDelete = isMine && onDelete != null && status == 'sent';
    final canCopy = messageType == 'text' && content.isNotEmpty;
    if (!canReact && !canEdit && !canDelete && !canCopy) return;

    final myReacted = <String>{
      for (final e in (reactions ?? {}).entries)
        if (e.value.contains(myUserId)) e.key
    };

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetCtx) => SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (canReact) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: reactionTypes.map((type) {
                    final mine = myReacted.contains(type);
                    return GestureDetector(
                      onTap: () {
                        Navigator.pop(sheetCtx);
                        onReact!(messageId, type);
                      },
                      child: Container(
                        width: 44,
                        height: 44,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: mine ? AppColors.primary100 : Colors.transparent,
                          shape: BoxShape.circle,
                          border: mine
                              ? Border.all(color: AppColors.primary400, width: 2)
                              : null,
                        ),
                        child: Text(reactionEmoji[type] ?? '',
                            style: const TextStyle(fontSize: 26)),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const Divider(height: 1, color: AppColors.lineSubtle),
            ],
            if (canCopy)
              ListTile(
                leading: const Icon(Icons.copy_outlined, color: AppColors.textPrimary),
                title: const Text('Copy'),
                onTap: () async {
                  Navigator.pop(sheetCtx);
                  await Clipboard.setData(ClipboardData(text: content));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: const Text('Copied',
                            style: TextStyle(fontSize: 12)),
                        duration: const Duration(milliseconds: 900),
                        behavior: SnackBarBehavior.floating,
                        backgroundColor: Colors.black87,
                        width: 120,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                    );
                  }
                },
              ),
            if (canEdit)
              ListTile(
                leading: const Icon(Icons.edit_outlined, color: AppColors.textPrimary),
                title: const Text('Edit'),
                onTap: () {
                  Navigator.pop(sheetCtx);
                  onEdit!(messageId);
                },
              ),
            if (canDelete)
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Colors.redAccent),
                title: const Text('Delete', style: TextStyle(color: Colors.redAccent)),
                onTap: () async {
                  Navigator.pop(sheetCtx);
                  final ok = await showDialog<bool>(
                    context: context,
                    builder: (dCtx) => AlertDialog(
                      title: const Text('Delete message?'),
                      content: const Text('This action cannot be undone.'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(dCtx, false),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(dCtx, true),
                          child: const Text('Delete',
                              style: TextStyle(color: Colors.redAccent)),
                        ),
                      ],
                    ),
                  );
                  if (ok == true) await onDelete!(messageId);
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const lg = Radius.circular(AppRadius.xl);
    const sm = Radius.circular(AppRadius.sm);
    final radius = isMine
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
    final showName = !isMine && isGroup && isFirstInStreak && (senderName?.isNotEmpty ?? false);
    final showAvatar = !isMine && isLastInStreak;

    final bubble = GestureDetector(
      onLongPress: () => _showActionsMenu(context),
      child: _buildContent(context, radius),
    );

    final column = Column(
      crossAxisAlignment: isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showName)
          Padding(
            padding: const EdgeInsets.only(bottom: 2, left: 8),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: (onOpenProfile != null && senderId != null)
                  ? () => onOpenProfile!(senderId!)
                  : null,
              child: Text(
                senderName!,
                style: const TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textTertiary),
              ),
            ),
          ),
        bubble,
        _buildReactionsChip(),
        if (showTime || status == 'sending' || status == 'uploading' || status == 'failed')
          Padding(
            padding: const EdgeInsets.only(top: 2, left: 4, right: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(time, style: const TextStyle(color: AppColors.textTertiary, fontSize: 11)),
                if (isEdited) ...[
                  const SizedBox(width: 6),
                  const Text('edited',
                      style: TextStyle(
                          color: AppColors.textTertiary,
                          fontSize: 11,
                          fontStyle: FontStyle.italic)),
                ],
                if (statusIcon != null) ...[const SizedBox(width: 6), statusIcon],
              ],
            ),
          ),
      ],
    );

    return Padding(
      padding: EdgeInsets.only(top: isFirstInStreak ? 12 : 4),
      child: Row(
        mainAxisAlignment: isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMine)
            SizedBox(
              width: 32,
              child: showAvatar
                  ? GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: (onOpenProfile != null && senderId != null)
                          ? () => onOpenProfile!(senderId!)
                          : null,
                      child: GradientAvatar(
                          name: senderName ?? '', imageUrl: senderAvatar, size: 28),
                    )
                  : null,
            ),
          if (!isMine) const SizedBox(width: 6),
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
              child: Opacity(opacity: isFailed ? 0.7 : 1.0, child: column),
            ),
          ),
        ],
      ),
    );
  }
}
