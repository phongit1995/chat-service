import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart' show RTCVideoViewObjectFit;
import 'package:livekit_client/livekit_client.dart';

import '../../providers/call_provider.dart';
import '../../theme/widgets.dart';
import 'draggable_pip.dart';

class MiniCallWidget extends ConsumerWidget {
  final ActiveCall active;
  final Room? room;
  final String statusLabel;
  final VoidCallback onExpand;
  final VoidCallback onEnd;
  const MiniCallWidget({
    super.key,
    required this.active,
    required this.room,
    required this.statusLabel,
    required this.onExpand,
    required this.onEnd,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final miniPos = ref.watch(callProvider.select((s) => s.miniPos));
    final remoteTrackRaw =
        room?.remoteParticipants.values.firstOrNull?.videoTrackPublications.firstOrNull?.track;
    final remoteVideoTrack = remoteTrackRaw is VideoTrack ? remoteTrackRaw : null;
    final hasVideo = remoteVideoTrack != null && !remoteVideoTrack.muted;

    final width = hasVideo ? 160.0 : 240.0;
    final height = hasVideo ? 220.0 : 90.0;

    return Material(
      color: Colors.transparent,
      child: DraggablePip(
        position: miniPos,
        width: width,
        height: height,
        initialOffsetFromCorner: const Offset(16, 24),
        initialCorner: Alignment.bottomRight,
        onChange: (p) => ref.read(callProvider.notifier).setMiniPos(p),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Container(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
              ),
              boxShadow: const [
                BoxShadow(color: Color(0x99000000), blurRadius: 20, offset: Offset(0, 6)),
              ],
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              borderRadius: BorderRadius.circular(16),
            ),
            child: hasVideo
                ? _VideoMini(track: remoteVideoTrack, name: active.peer.displayName, statusLabel: statusLabel, onExpand: onExpand, onEnd: onEnd)
                : _AudioMini(active: active, statusLabel: statusLabel, onExpand: onExpand, onEnd: onEnd),
          ),
        ),
      ),
    );
  }
}

class _VideoMini extends StatelessWidget {
  final VideoTrack track;
  final String name;
  final String statusLabel;
  final VoidCallback onExpand;
  final VoidCallback onEnd;
  const _VideoMini({
    required this.track,
    required this.name,
    required this.statusLabel,
    required this.onExpand,
    required this.onEnd,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Positioned.fill(
          child: VideoTrackRenderer(
            track,
            fit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
          ),
        ),
        Positioned(
          top: 0, left: 0, right: 0,
          child: Container(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 12),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xCC000000), Colors.transparent],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                Text(statusLabel,
                    style: const TextStyle(color: Color(0xE6FFFFFF), fontSize: 10)),
              ],
            ),
          ),
        ),
        Positioned(
          right: 6, bottom: 6,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _MiniBtn(icon: Icons.open_in_full_rounded, onTap: onExpand, bg: Colors.black54),
              const SizedBox(width: 4),
              _MiniBtn(icon: Icons.call_end_rounded, onTap: onEnd, bg: const Color(0xFFEF4444)),
            ],
          ),
        ),
      ],
    );
  }
}

class _AudioMini extends StatelessWidget {
  final ActiveCall active;
  final String statusLabel;
  final VoidCallback onExpand;
  final VoidCallback onEnd;
  const _AudioMini({
    required this.active,
    required this.statusLabel,
    required this.onExpand,
    required this.onEnd,
  });

  @override
  Widget build(BuildContext context) {
    final name = active.peer.displayName;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      child: Row(
        children: [
          GradientAvatar(imageUrl: active.peer.avatar, name: name, size: 40),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(name, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(statusLabel,
                    style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 11)),
              ],
            ),
          ),
          _MiniBtn(icon: Icons.open_in_full_rounded, onTap: onExpand, bg: Colors.white.withValues(alpha: 0.15)),
          const SizedBox(width: 6),
          _MiniBtn(icon: Icons.call_end_rounded, onTap: onEnd, bg: const Color(0xFFEF4444)),
        ],
      ),
    );
  }
}

class _MiniBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color bg;
  const _MiniBtn({required this.icon, required this.onTap, required this.bg});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
        child: Icon(icon, size: 16, color: Colors.white),
      ),
    );
  }
}
