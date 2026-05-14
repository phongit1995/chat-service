import 'package:flutter/material.dart';
import '../../providers/typing_provider.dart';
import '../../theme/app_colors.dart';

class TypingIndicator extends StatefulWidget {
  final Map<String, TypingInfo> typingUsers;

  const TypingIndicator({super.key, required this.typingUsers});

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final List<Animation<double>> _dots;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();

    _dots = List.generate(3, (i) {
      final start = i * 0.2;
      return TweenSequence<double>([
        TweenSequenceItem(
          tween: Tween(begin: 0.0, end: -6.0)
              .chain(CurveTween(curve: Curves.easeOut)),
          weight: 30,
        ),
        TweenSequenceItem(
          tween: Tween(begin: -6.0, end: 0.0)
              .chain(CurveTween(curve: Curves.easeIn)),
          weight: 30,
        ),
        TweenSequenceItem(
          tween: ConstantTween(0.0),
          weight: 40,
        ),
      ]).animate(
        CurvedAnimation(
          parent: _ctrl,
          curve: Interval(start, (start + 0.6).clamp(0, 1)),
        ),
      );
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  String _buildText() {
    final users = widget.typingUsers.values.toList();
    final count = users.length;
    if (count == 1) return '${users[0].username} is typing';
    if (count == 2) {
      return '${users[0].username} and ${users[1].username} are typing';
    }
    if (count == 3) {
      return '${users[0].username}, ${users[1].username} and ${users[2].username} are typing';
    }
    return '${users[0].username}, ${users[1].username} and ${count - 2} others are typing';
  }

  @override
  Widget build(BuildContext context) {
    if (widget.typingUsers.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(left: 16, bottom: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.bgOverlay,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomRight: Radius.circular(16),
                bottomLeft: Radius.circular(4),
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedBuilder(
                  animation: _ctrl,
                  builder: (_, __) => Row(
                    children: List.generate(3, (i) {
                      final colors = [
                        AppColors.primary400,
                        AppColors.accentPurple,
                        AppColors.accentBlue,
                      ];
                      return Transform.translate(
                        offset: Offset(0, _dots[i].value),
                        child: Container(
                          width: 7,
                          height: 7,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            color: colors[i],
                            shape: BoxShape.circle,
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  '${_buildText()}…',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
