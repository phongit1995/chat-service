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
  const GradientText(this.text, {super.key, this.style, this.gradient = AppGradients.signature});

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      blendMode: BlendMode.srcIn,
      shaderCallback: (bounds) => gradient.createShader(Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
      child: Text(text, style: (style ?? AppTypography.h1).copyWith(color: Colors.white)),
    );
  }
}

class GradientAvatar extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final double size;
  final bool storyRing;
  final bool seen;

  const GradientAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.size = 40,
    this.storyRing = false,
    this.seen = false,
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
      const LinearGradient(colors: [AppColors.accentYellow, AppColors.accentOrange]),
      const LinearGradient(colors: [AppColors.accentOrange, AppColors.primary]),
      const LinearGradient(colors: [AppColors.primary, AppColors.accentPurple]),
      const LinearGradient(colors: [AppColors.accentPurple, AppColors.accentBlue]),
      const LinearGradient(colors: [AppColors.accentCoral, AppColors.primary]),
    ];
    return palette[code % palette.length];
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

    if (!storyRing) return core;

    return Container(
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
  final String time;

  const MessageBubble({
    super.key,
    required this.content,
    required this.isMine,
    this.senderName,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    final radius = isMine
        ? const BorderRadius.only(
            topLeft: Radius.circular(AppRadius.xl),
            topRight: Radius.circular(AppRadius.xl),
            bottomLeft: Radius.circular(AppRadius.xl),
            bottomRight: Radius.circular(AppRadius.sm),
          )
        : const BorderRadius.only(
            topLeft: Radius.circular(AppRadius.xl),
            topRight: Radius.circular(AppRadius.xl),
            bottomLeft: Radius.circular(AppRadius.sm),
            bottomRight: Radius.circular(AppRadius.xl),
          );

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            gradient: isMine ? AppGradients.signature : null,
            color: isMine ? null : AppColors.bgOverlay,
            borderRadius: radius,
            boxShadow: isMine ? AppShadows.md : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isMine && senderName != null && senderName!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: GradientText(
                    senderName!,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              Text(
                content,
                style: TextStyle(
                  color: isMine ? Colors.white : AppColors.textPrimary,
                  fontSize: 15,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                time,
                style: TextStyle(
                  color: isMine ? Colors.white.withValues(alpha: 0.85) : AppColors.textTertiary,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
