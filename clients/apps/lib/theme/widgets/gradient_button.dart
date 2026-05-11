import 'package:flutter/material.dart';

import '../app_colors.dart';
import '../app_gradients.dart';
import '../app_typography.dart';

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
    final button = AnimatedContainer(
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
        child: fullWidth
            ? SizedBox(width: double.infinity, child: button)
            : button,
      ),
    );
  }
}
