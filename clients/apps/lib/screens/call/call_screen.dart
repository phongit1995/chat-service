import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart' hide ConnectionState;
import 'package:livekit_client/livekit_client.dart' as lk show ConnectionState;
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../models/call.dart';
import '../../providers/call_provider.dart';
import '../../theme/widgets.dart';

/// Global call screen. Mounted at app root. Renders nothing when idle,
/// a floating mini-widget when active+collapsed, or a full-screen call
/// when expanded. Owns the LiveKit Room lifecycle.
class CallScreen extends ConsumerStatefulWidget {
  const CallScreen({super.key});

  @override
  ConsumerState<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends ConsumerState<CallScreen> {
  Room? _room;
  String? _connectedCallId;
  String? _connectedRoomName;
  EventsListener<RoomEvent>? _listener;
  bool _connecting = false;
  bool _micMuted = false;
  bool _camOff = false;
  int _elapsed = 0;
  Timer? _timer;
  lk.ConnectionState _connState = lk.ConnectionState.disconnected;

  @override
  void dispose() {
    _teardownRoom();
    _timer?.cancel();
    WakelockPlus.disable();
    super.dispose();
  }

  Future<void> _ensureRoom(ActiveCall call) async {
    // Same room already connected — nothing to do.
    if (_room != null &&
        _connectedCallId == call.callId &&
        _connectedRoomName == call.roomName) {
      return;
    }
    if (_connecting) return;
    _connecting = true;

    await _teardownRoom();

    final room = Room(
      roomOptions: const RoomOptions(
        adaptiveStream: true,
        dynacast: true,
      ),
    );
    _room = room;
    _connectedCallId = call.callId;
    _connectedRoomName = call.roomName;

    final listener = room.createListener();
    _listener = listener;
    listener.on<RoomDisconnectedEvent>((_) {
      if (mounted) setState(() {});
    });
    listener.on<ParticipantDisconnectedEvent>((_) {
      // Remote left → finalize call from our side.
      if (!mounted) return;
      ref.read(callProvider.notifier).endActive();
    });

    try {
      await room.connect(call.wsUrl, call.token);
      await room.localParticipant?.setMicrophoneEnabled(true);
      if (call.callType == CallType.video) {
        await room.localParticipant?.setCameraEnabled(true);
      }
      WakelockPlus.enable();
    } catch (_) {
      // Connection failed — end call so UI doesn't get stuck.
      if (mounted) ref.read(callProvider.notifier).endActive();
    } finally {
      _connecting = false;
      if (mounted) setState(() => _connState = room.connectionState);
    }
  }

  Future<void> _teardownRoom() async {
    _timer?.cancel();
    _timer = null;
    final listener = _listener;
    _listener = null;
    final room = _room;
    _room = null;
    _connectedCallId = null;
    _connectedRoomName = null;
    if (listener != null) {
      await listener.dispose();
    }
    if (room != null) {
      await room.disconnect();
      await room.dispose();
    }
    WakelockPlus.disable();
  }

  void _toggleMic() {
    final pub = _room?.localParticipant?.audioTrackPublications.firstOrNull;
    final next = !_micMuted;
    setState(() => _micMuted = next);
    final track = pub?.track;
    if (track != null) {
      if (next) {
        track.mute();
      } else {
        track.unmute();
      }
    } else {
      _room?.localParticipant
          ?.setMicrophoneEnabled(!next)
          .then((_) => null)
          .catchError((_) {});
    }
  }

  void _toggleCam() {
    final pub = _room?.localParticipant?.videoTrackPublications.firstOrNull;
    final next = !_camOff;
    setState(() => _camOff = next);
    final track = pub?.track;
    if (track != null) {
      if (next) {
        track.mute();
      } else {
        track.unmute();
      }
    } else {
      _room?.localParticipant
          ?.setCameraEnabled(!next)
          .then((_) => null)
          .catchError((_) {});
    }
  }

  String _formatTime(int s) {
    final m = s ~/ 60;
    final sec = s % 60;
    return '$m:${sec.toString().padLeft(2, '0')}';
  }

  String _statusLabel(CallMode mode) {
    if (mode == CallMode.outgoing) return 'Ringing…';
    if (_connState == lk.ConnectionState.connecting) return 'Connecting…';
    if (_connState == lk.ConnectionState.reconnecting) return 'Reconnecting…';
    if (mode == CallMode.active) return _formatTime(_elapsed);
    return 'Connected';
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(callProvider);
    final inCall =
        state.mode == CallMode.outgoing || state.mode == CallMode.active;
    final active = state.active;

    if (!inCall || active == null) {
      // Teardown when leaving a call
      if (_room != null) {
        Future.microtask(_teardownRoom);
      }
      return const SizedBox.shrink();
    }

    // Connect/reconnect when active call changes
    if (_connectedCallId != active.callId ||
        _connectedRoomName != active.roomName) {
      Future.microtask(() => _ensureRoom(active));
    }

    // Start elapsed timer once connection becomes active
    if (state.mode == CallMode.active && _timer == null) {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _elapsed++);
      });
    } else if (state.mode != CallMode.active && _timer != null) {
      _timer?.cancel();
      _timer = null;
      _elapsed = 0;
    }

    if (!state.expanded) {
      return _CallMiniWidget(
        active: active,
        statusLabel: _statusLabel(state.mode),
        onExpand: () => ref.read(callProvider.notifier).setExpanded(true),
        onEnd: () => ref.read(callProvider.notifier).endActive(),
      );
    }

    return _ExpandedCall(
      active: active,
      room: _room,
      mode: state.mode,
      micMuted: _micMuted,
      camOff: _camOff,
      statusLabel: _statusLabel(state.mode),
      onMinimize: () => ref.read(callProvider.notifier).setExpanded(false),
      onToggleMic: _toggleMic,
      onToggleCam: _toggleCam,
      onEnd: () => ref.read(callProvider.notifier).endActive(),
    );
  }
}

class _ExpandedCall extends StatelessWidget {
  final ActiveCall active;
  final Room? room;
  final CallMode mode;
  final bool micMuted;
  final bool camOff;
  final String statusLabel;
  final VoidCallback onMinimize;
  final VoidCallback onToggleMic;
  final VoidCallback onToggleCam;
  final VoidCallback onEnd;

  const _ExpandedCall({
    required this.active,
    required this.room,
    required this.mode,
    required this.micMuted,
    required this.camOff,
    required this.statusLabel,
    required this.onMinimize,
    required this.onToggleMic,
    required this.onToggleCam,
    required this.onEnd,
  });

  @override
  Widget build(BuildContext context) {
    final isVideo = active.callType == CallType.video;
    final name = active.peer.displayName;

    final remoteTrackRaw = room?.remoteParticipants.values.firstOrNull
        ?.videoTrackPublications.firstOrNull?.track;
    final localTrackRaw =
        room?.localParticipant?.videoTrackPublications.firstOrNull?.track;
    final remoteVideoTrack =
        remoteTrackRaw is VideoTrack ? remoteTrackRaw : null;
    final localVideoTrack =
        localTrackRaw is VideoTrack ? localTrackRaw : null;

    return Material(
      color: Colors.transparent,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF020617), Color(0xFF1E1B4B)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Top bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    IconButton(
                      tooltip: 'Minimize',
                      onPressed: onMinimize,
                      icon: const Icon(Icons.remove_rounded, color: Colors.white),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            statusLabel,
                            style: const TextStyle(
                              color: Color(0xE6FFFFFF),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      isVideo ? 'VIDEO' : 'VOICE',
                      style: const TextStyle(
                        color: Color(0xB3FFFFFF),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ],
                ),
              ),

              // Main area
              Expanded(
                child: Stack(
                  children: [
                    if (isVideo &&
                        remoteVideoTrack != null &&
                        !remoteVideoTrack.muted)
                      Positioned.fill(
                        child: VideoTrackRenderer(remoteVideoTrack),
                      )
                    else
                      Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            GradientAvatar(
                              imageUrl: active.peer.avatar,
                              name: name,
                              size: 140,
                            ),
                            const SizedBox(height: 24),
                            Text(
                              name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              statusLabel,
                              style: const TextStyle(
                                color: Color(0xE6FFFFFF),
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ),

                    if (isVideo && localVideoTrack != null && !camOff)
                      Positioned(
                        top: 16,
                        right: 16,
                        child: Container(
                          width: 110,
                          height: 150,
                          decoration: BoxDecoration(
                            color: Colors.black,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                              width: 2,
                            ),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x99000000),
                                blurRadius: 12,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: VideoTrackRenderer(
                              localVideoTrack,
                              mirrorMode: VideoViewMirrorMode.mirror,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),

              // Bottom controls
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _CtrlButton(
                      active: micMuted,
                      onTap: onToggleMic,
                      icon: micMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
                      tooltip: micMuted ? 'Unmute' : 'Mute',
                    ),
                    const SizedBox(width: 16),
                    if (isVideo)
                      _CtrlButton(
                        active: camOff,
                        onTap: onToggleCam,
                        icon: camOff
                            ? Icons.videocam_off_rounded
                            : Icons.videocam_rounded,
                        tooltip: camOff ? 'Camera on' : 'Camera off',
                      ),
                    if (isVideo) const SizedBox(width: 16),
                    _EndButton(onTap: onEnd),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CtrlButton extends StatelessWidget {
  final bool active;
  final VoidCallback onTap;
  final IconData icon;
  final String tooltip;
  const _CtrlButton({
    required this.active,
    required this.onTap,
    required this.icon,
    required this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: active ? Colors.white : Colors.white.withValues(alpha: 0.18),
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            color: active ? const Color(0xFF0F172A) : Colors.white,
            size: 24,
          ),
        ),
      ),
    );
  }
}

class _EndButton extends StatelessWidget {
  final VoidCallback onTap;
  const _EndButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'End call',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 64,
          height: 64,
          decoration: const BoxDecoration(
            color: Color(0xFFEF4444),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Color(0x66EF4444),
                blurRadius: 20,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: const Icon(
            Icons.call_end_rounded,
            color: Colors.white,
            size: 28,
          ),
        ),
      ),
    );
  }
}

class _CallMiniWidget extends StatelessWidget {
  final ActiveCall active;
  final String statusLabel;
  final VoidCallback onExpand;
  final VoidCallback onEnd;

  const _CallMiniWidget({
    required this.active,
    required this.statusLabel,
    required this.onExpand,
    required this.onEnd,
  });

  @override
  Widget build(BuildContext context) {
    final isVideo = active.callType == CallType.video;
    final name = active.peer.displayName;

    return SafeArea(
      child: Align(
        alignment: Alignment.bottomRight,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onExpand,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                width: 280,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1E293B), Color(0xFF1E1B4B)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x66000000),
                      blurRadius: 20,
                      offset: Offset(0, 8),
                    ),
                  ],
                  border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                ),
                child: Row(
                  children: [
                    GradientAvatar(
                      imageUrl: active.peer.avatar,
                      name: name,
                      size: 44,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            '${isVideo ? "📹" : "📞"} $statusLabel',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0x99FFFFFF),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Expand',
                      onPressed: onExpand,
                      icon: const Icon(Icons.open_in_full_rounded, color: Colors.white, size: 18),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.15),
                        minimumSize: const Size(36, 36),
                        padding: EdgeInsets.zero,
                      ),
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      tooltip: 'End call',
                      onPressed: onEnd,
                      icon: const Icon(Icons.call_end_rounded, color: Colors.white, size: 18),
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        minimumSize: const Size(36, 36),
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
