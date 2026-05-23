import 'package:flutter/material.dart';

import '../../models/user_status.dart';
import '../app_colors.dart';
import '../app_gradients.dart';
import '../app_typography.dart';

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
    final trimmed = name.trim();
    if (trimmed.isEmpty) return '?';
    final parts = trimmed.split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.substring(0, trimmed.length >= 2 ? 2 : 1).toUpperCase();
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
    switch (UserStatus.fromValue(status)) {
      case UserStatus.online:
        return AppColors.success;
      case UserStatus.away:
        return AppColors.warning;
      case UserStatus.busy:
        return AppColors.danger;
      case UserStatus.offline:
        return AppColors.textTertiary;
      case UserStatus.unknown:
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

    if (statusDot == null) return avatar;

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
