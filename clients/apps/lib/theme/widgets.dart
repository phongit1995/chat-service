import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_gradients.dart';
import 'app_typography.dart';

class GradientButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final bool loading;
  final bool fullWidth;
  final EdgeInsets padding;

  const GradientButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.loading = false,
    this.fullWidth = false,
    this.padding = const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || loading;
    final btn = AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        gradient: disabled ? null : AppGradients.signature,
        color: disabled ? AppColors.textDisabled : null,
        borderRadius: BorderRadius.circular(AppRadius.full),
        boxShadow: disabled ? null : AppShadows.glowGradient,
      ),
      padding: padding,
      child: Center(
        child: loading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(Colors.white),
                ),
              )
            : DefaultTextStyle.merge(
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  fontFamily: AppTypography.body,
                ),
                child: child,
              ),
      ),
    );
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: disabled ? null : onPressed,
        borderRadius: BorderRadius.circular(AppRadius.full),
        child: fullWidth ? SizedBox(width: double.infinity, child: btn) : btn,
      ),
    );
  }
}

class GradientText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final Gradient gradient;
  const GradientText(
    this.text, {
    super.key,
    this.style,
    this.gradient = AppGradients.signature,
  });

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      blendMode: BlendMode.srcIn,
      shaderCallback: (bounds) => gradient.createShader(
        Rect.fromLTWH(0, 0, bounds.width, bounds.height),
      ),
      child: Text(
        text,
        style: (style ?? AppTypography.h1).copyWith(color: Colors.white),
      ),
    );
  }
}

class GradientAvatar extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final double size;
  final bool storyRing;
  final bool seen;
  final String? status;

  const GradientAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.size = 40,
    this.storyRing = false,
    this.seen = false,
    this.status,
  });

  String get _initials {
    final t = name.trim();
    if (t.isEmpty) return '?';
    final parts = t.split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return t.substring(0, t.length >= 2 ? 2 : 1).toUpperCase();
  }

  Gradient get _fallback {
    final code = name.isEmpty ? 0 : name.codeUnitAt(0);
    final palette = [
      const LinearGradient(
        colors: [AppColors.accentYellow, AppColors.accentOrange],
      ),
      const LinearGradient(colors: [AppColors.accentOrange, AppColors.primary]),
      const LinearGradient(colors: [AppColors.primary, AppColors.accentPurple]),
      const LinearGradient(
        colors: [AppColors.accentPurple, AppColors.accentBlue],
      ),
      const LinearGradient(colors: [AppColors.accentCoral, AppColors.primary]),
    ];
    return palette[code % palette.length];
  }

  Color? get _statusColor {
    switch (status) {
      case 'online':
        return AppColors.success;
      case 'away':
        return AppColors.warning;
      case 'busy':
        return AppColors.danger;
      case 'offline':
        return AppColors.textTertiary;
      default:
        return null;
    }
  }

  double get _statusDotSize {
    if (size <= 32) return 8;
    if (size <= 40) return 10;
    if (size <= 48) return 12;
    return 16;
  }

  @override
  Widget build(BuildContext context) {
    final core = ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: imageUrl != null && imageUrl!.isNotEmpty
            ? Image.network(
                imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _fallbackBox(),
              )
            : _fallbackBox(),
      ),
    );

    Widget avatar = core;

    if (storyRing) {
      avatar = Container(
        padding: const EdgeInsets.all(2.5),
        decoration: BoxDecoration(
          gradient: seen ? null : AppGradients.signature,
          color: seen ? AppColors.line : null,
          shape: BoxShape.circle,
        ),
        child: Container(
          padding: const EdgeInsets.all(2),
          decoration: const BoxDecoration(
            color: AppColors.bgBase,
            shape: BoxShape.circle,
          ),
          child: core,
        ),
      );
    }

    final statusDot = _statusColor == null
        ? null
        : Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: _statusDotSize,
              height: _statusDotSize,
              decoration: BoxDecoration(
                color: _statusColor,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.bgBase, width: 2),
              ),
            ),
          );

    if (statusDot == null) {
      return avatar;
    }

    return Stack(clipBehavior: Clip.none, children: [avatar, statusDot]);
  }

  Widget _fallbackBox() => Container(
    decoration: BoxDecoration(gradient: _fallback),
    alignment: Alignment.center,
    child: Text(
      _initials,
      style: TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w600,
        fontSize: size * 0.35,
        fontFamily: AppTypography.body,
      ),
    ),
  );
}

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
