import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/audio_provider.dart';
import '../app_colors.dart';

class AudioBubble extends ConsumerStatefulWidget {
  final String messageId;
  final String? metadata;
  final bool isMine;
  final BorderRadius borderRadius;

  const AudioBubble({
    super.key,
    required this.messageId,
    required this.metadata,
    required this.isMine,
    required this.borderRadius,
  });

  @override
  ConsumerState<AudioBubble> createState() => _AudioBubbleState();
}

class _AudioBubbleState extends ConsumerState<AudioBubble> {
  late final _AudioMeta? _meta;

  @override
  void initState() {
    super.initState();
    _meta = _parseMeta(widget.metadata);
  }

  String _formatDuration(double sec) {
    final s = sec.floor();
    final m = s ~/ 60;
    final ss = s % 60;
    return '$m:${ss.toString().padLeft(2, '0')}';
  }

  Future<void> _togglePlay() async {
    final meta = _meta;
    if (meta == null) return;
    final playback = ref.read(audioPlaybackProvider);
    final speed = ref.read(audioSpeedProvider);
    final isCurrent = playback.currentId == widget.messageId;
    final isPlaying =
        isCurrent && (await playback.playingStream.first);
    if (isPlaying) {
      await playback.pause();
    } else {
      await playback.play(widget.messageId, meta.url, speed: speed);
    }
  }

  @override
  Widget build(BuildContext context) {
    final meta = _meta;
    final bg = widget.isMine ? AppColors.primary : AppColors.bgElevated;
    final fg = widget.isMine ? Colors.white : AppColors.textPrimary;
    final dim = widget.isMine
        ? Colors.white.withValues(alpha: 0.6)
        : AppColors.textTertiary;
    final activeBar = widget.isMine ? Colors.white : AppColors.primary;
    final inactiveBar = widget.isMine
        ? Colors.white.withValues(alpha: 0.35)
        : AppColors.textTertiary.withValues(alpha: 0.4);

    if (meta == null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: bg, borderRadius: widget.borderRadius),
        child: Text('🎵 Audio unavailable', style: TextStyle(color: fg)),
      );
    }

    final currentId = ref.watch(currentPlayingAudioProvider).value;
    final isCurrent = currentId == widget.messageId;
    final speed = ref.watch(audioSpeedProvider);
    final playback = ref.watch(audioPlaybackProvider);

    return Container(
      constraints: const BoxConstraints(minWidth: 200, maxWidth: 260),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(color: bg, borderRadius: widget.borderRadius),
      child: Row(
        children: [
          StreamBuilder<bool>(
            stream: playback.playingStream,
            initialData: false,
            builder: (_, snap) {
              final playing = isCurrent && (snap.data ?? false);
              return GestureDetector(
                onTap: _togglePlay,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: widget.isMine
                        ? Colors.white.withValues(alpha: 0.2)
                        : AppColors.primary.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    color: fg,
                    size: 22,
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _WaveformWithProgress(
                  waveform: meta.waveform,
                  duration: meta.duration,
                  isCurrent: isCurrent,
                  activeColor: activeBar,
                  inactiveColor: inactiveBar,
                  onSeek: (ratio) async {
                    if (!isCurrent) return;
                    final dur = playback.duration;
                    if (dur == null) return;
                    await playback.seek(
                      Duration(milliseconds: (dur.inMilliseconds * ratio).round()),
                    );
                  },
                ),
                const SizedBox(height: 2),
                StreamBuilder<Duration>(
                  stream: playback.positionStream,
                  initialData: Duration.zero,
                  builder: (_, snap) {
                    final pos = isCurrent ? snap.data ?? Duration.zero : Duration.zero;
                    final shown = isCurrent && pos.inMilliseconds > 0
                        ? pos.inSeconds.toDouble()
                        : meta.duration;
                    return Text(
                      _formatDuration(shown),
                      style: TextStyle(
                        fontSize: 10,
                        color: dim,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => ref.read(audioSpeedProvider.notifier).cycle(),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: widget.isMine
                    ? Colors.white.withValues(alpha: 0.15)
                    : AppColors.textTertiary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${speed % 1 == 0 ? speed.toInt() : speed}x',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: fg,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _WaveformWithProgress extends ConsumerWidget {
  final List<double> waveform;
  final double duration;
  final bool isCurrent;
  final Color activeColor;
  final Color inactiveColor;
  final ValueChanged<double> onSeek;

  const _WaveformWithProgress({
    required this.waveform,
    required this.duration,
    required this.isCurrent,
    required this.activeColor,
    required this.inactiveColor,
    required this.onSeek,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playback = ref.watch(audioPlaybackProvider);
    return StreamBuilder<Duration>(
      stream: playback.positionStream,
      initialData: Duration.zero,
      builder: (_, snap) {
        final pos = isCurrent ? snap.data ?? Duration.zero : Duration.zero;
        final total = playback.duration?.inMilliseconds.toDouble() ?? duration * 1000;
        final progress = total > 0
            ? (pos.inMilliseconds / total).clamp(0.0, 1.0)
            : 0.0;
        return LayoutBuilder(
          builder: (ctx, c) => GestureDetector(
            onTapDown: (d) {
              final ratio = (d.localPosition.dx / c.maxWidth).clamp(0.0, 1.0);
              onSeek(ratio);
            },
            behavior: HitTestBehavior.opaque,
            child: SizedBox(
              height: 26,
              width: double.infinity,
              child: CustomPaint(
                painter: _WaveformProgressPainter(
                  waveform: waveform,
                  progress: progress,
                  activeColor: activeColor,
                  inactiveColor: inactiveColor,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _WaveformProgressPainter extends CustomPainter {
  final List<double> waveform;
  final double progress;
  final Color activeColor;
  final Color inactiveColor;
  _WaveformProgressPainter({
    required this.waveform,
    required this.progress,
    required this.activeColor,
    required this.inactiveColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final bars = waveform.isEmpty ? List<double>.filled(40, 0.3) : waveform;
    const gap = 2.0;
    final barW = (size.width - gap * (bars.length - 1)) / bars.length;
    for (var i = 0; i < bars.length; i++) {
      final v = bars[i].clamp(0.0, 1.0);
      final h = (size.height * 0.25 + size.height * 0.75 * v).clamp(3.0, size.height);
      final filled = (i + 1) / bars.length <= progress;
      final paint = Paint()..color = filled ? activeColor : inactiveColor;
      final x = i * (barW + gap);
      final y = (size.height - h) / 2;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, y, barW, h),
          const Radius.circular(2),
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _WaveformProgressPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.activeColor != activeColor ||
      oldDelegate.waveform != waveform;
}

class _AudioMeta {
  final String url;
  final double duration;
  final List<double> waveform;
  _AudioMeta({required this.url, required this.duration, required this.waveform});
}

_AudioMeta? _parseMeta(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  try {
    final m = jsonDecode(raw) as Map<String, dynamic>;
    final url = m['url'] as String?;
    if (url == null || url.isEmpty) return null;
    final duration = (m['duration'] as num?)?.toDouble() ?? 0.0;
    final wf = m['waveform'];
    final waveform = wf is List
        ? wf.map((e) => (e as num).toDouble()).toList()
        : <double>[];
    return _AudioMeta(url: url, duration: duration, waveform: waveform);
  } catch (_) {
    return null;
  }
}
