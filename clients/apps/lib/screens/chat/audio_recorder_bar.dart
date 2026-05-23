import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

class AudioRecorderBar extends StatelessWidget {
  final Duration elapsed;
  final List<double> levels;
  final VoidCallback onCancel;
  final VoidCallback onSend;

  const AudioRecorderBar({
    super.key,
    required this.elapsed,
    required this.levels,
    required this.onCancel,
    required this.onSend,
  });

  String _formatDuration(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.lineSubtle),
      ),
      child: Row(
        children: [
          _PulsingDot(),
          const SizedBox(width: 8),
          Expanded(
            child: SizedBox(
              height: 28,
              child: CustomPaint(
                painter: _WaveformPainter(levels: levels, color: AppColors.primary),
                size: Size.infinite,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            _formatDuration(elapsed),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(width: 4),
          IconButton(
            tooltip: 'Cancel',
            icon: const Icon(Icons.close_rounded, size: 18),
            color: AppColors.textTertiary,
            onPressed: onCancel,
          ),
          GestureDetector(
            onTap: onSend,
            child: Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}

class _PulsingDot extends StatefulWidget {
  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        return Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: const Color(0xFFEF4444).withValues(alpha: 0.4 + _ctrl.value * 0.6),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFEF4444).withValues(alpha: 0.4 * _ctrl.value),
                blurRadius: 6,
                spreadRadius: 1,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final List<double> levels;
  final Color color;
  _WaveformPainter({required this.levels, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    if (levels.isEmpty) return;
    final paint = Paint()
      ..color = color
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.fill;
    const gap = 2.0;
    final barWidth = (size.width - gap * (levels.length - 1)) / levels.length;
    for (var i = 0; i < levels.length; i++) {
      final v = levels[i].clamp(0.0, 1.0);
      final h = (size.height * 0.2 + size.height * 0.8 * v).clamp(2.0, size.height);
      final x = i * (barWidth + gap);
      final y = (size.height - h) / 2;
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, y, barWidth, h),
        const Radius.circular(2),
      );
      canvas.drawRRect(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _WaveformPainter oldDelegate) =>
      oldDelegate.levels != levels;
}
