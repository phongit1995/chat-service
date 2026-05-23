import 'dart:async';
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, TargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart' show RTCVideoViewObjectFit;
import 'package:livekit_client/livekit_client.dart' hide ConnectionState;
import 'package:livekit_client/livekit_client.dart' as lk show ConnectionState;
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../models/call.dart';
import '../../providers/call_provider.dart';
import '../../theme/widgets.dart';
import 'call_header.dart';
import 'call_settings_panel.dart';
import 'draggable_pip.dart';
import 'mini_call_widget.dart';

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
  int _elapsed = 0;
  Timer? _timer;
  lk.ConnectionState _connState = lk.ConnectionState.disconnected;
  bool _settingsOpen = false;
  bool _localSpeaking = false;
  bool _remoteSpeaking = false;

  @override
  void dispose() {
    _teardownRoom();
    _timer?.cancel();
    WakelockPlus.disable();
    super.dispose();
  }

  Timer? _debugSpeakerTimer;

  Future<void> _ensureRoom(ActiveCall call) async {
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
      if (!mounted) return;
      ref.read(callProvider.notifier).endActive();
    });
    listener.on<TrackSubscribedEvent>((_) {
      if (mounted) setState(() {});
    });
    listener.on<TrackPublishedEvent>((_) {
      if (mounted) setState(() {});
    });
    listener.on<ActiveSpeakersChangedEvent>((e) {
      if (!mounted) return;
      final local = room.localParticipant;
      final localSpeaking = local != null && e.speakers.any((s) => s.identity == local.identity);
      final remoteSpeaking = e.speakers.any((s) => local == null || s.identity != local.identity);
      debugPrint(
        '[call] ActiveSpeakers count=${e.speakers.length} '
        'speakers=${e.speakers.map((s) => "${s.identity}(${s.isSpeaking}/${s.audioLevel.toStringAsFixed(3)})").join(",")} '
        'localId=${local?.identity} localSpeaking=$localSpeaking remoteSpeaking=$remoteSpeaking',
      );
      if (localSpeaking != _localSpeaking || remoteSpeaking != _remoteSpeaking) {
        setState(() {
          _localSpeaking = localSpeaking;
          _remoteSpeaking = remoteSpeaking;
        });
      }
    });
    listener.on<TrackMutedEvent>((e) {
      debugPrint('[call] TrackMuted ${e.participant.identity} kind=${e.publication.kind}');
    });
    listener.on<TrackUnmutedEvent>((e) {
      debugPrint('[call] TrackUnmuted ${e.participant.identity} kind=${e.publication.kind}');
    });
    listener.on<LocalTrackPublishedEvent>((e) {
      debugPrint('[call] LocalTrackPublished kind=${e.publication.kind} source=${e.publication.source} muted=${e.publication.muted} sid=${e.publication.sid}');
    });

    var connected = false;
    try {
      await room.connect(call.wsUrl, call.token);
      connected = true;
      debugPrint('[call] Room connected url=${call.wsUrl} localId=${room.localParticipant?.identity}');
      try {
        await room.localParticipant?.setMicrophoneEnabled(true);
        debugPrint('[call] Mic enabled. audioTracks=${room.localParticipant?.audioTrackPublications.length}');
      } catch (err) {
        debugPrint('[call] setMicrophoneEnabled FAILED: $err');
      }
      try {
        await ref.read(callProvider.notifier).applySpeaker();
      } catch (_) {}
      if (call.callType == CallType.video) {
        try {
          await room.localParticipant?.setCameraEnabled(true);
          debugPrint('[call] Camera enabled');
        } catch (err) {
          debugPrint('[call] setCameraEnabled FAILED: $err');
        }
      }
      WakelockPlus.enable();
      _debugSpeakerTimer?.cancel();
      _debugSpeakerTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        final lp = room.localParticipant;
        final remotes = room.remoteParticipants.values;
        final lpInfo = lp == null
            ? 'no-local'
            : 'local=${lp.identity}(isSpeaking=${lp.isSpeaking},level=${lp.audioLevel.toStringAsFixed(3)},audioPubs=${lp.audioTrackPublications.length},muted=${lp.audioTrackPublications.firstOrNull?.muted})';
        final rInfo = remotes.isEmpty
            ? 'no-remote'
            : remotes.map((r) => '${r.identity}(isSpeaking=${r.isSpeaking},level=${r.audioLevel.toStringAsFixed(3)})').join(',');
        final active = room.activeSpeakers.map((p) => p.identity).join(',');
        debugPrint('[call] tick $lpInfo | remote=$rInfo | active=[$active]');
      });
    } catch (err) {
      debugPrint('[call] Room connect FAILED: $err');
      if (!connected && mounted) ref.read(callProvider.notifier).endActive();
    } finally {
      _connecting = false;
      if (mounted) setState(() => _connState = room.connectionState);
    }
  }

  Future<void> _teardownRoom() async {
    _timer?.cancel();
    _timer = null;
    _debugSpeakerTimer?.cancel();
    _debugSpeakerTimer = null;
    final listener = _listener;
    _listener = null;
    final room = _room;
    _room = null;
    _connectedCallId = null;
    _connectedRoomName = null;
    if (listener != null) await listener.dispose();
    if (room != null) {
      await room.disconnect();
      await room.dispose();
    }
    WakelockPlus.disable();
  }

  void _toggleMic() {
    final micMuted = ref.read(callProvider).micMuted;
    final next = !micMuted;
    ref.read(callProvider.notifier).setMicMuted(next);
    final pub = _room?.localParticipant?.audioTrackPublications.firstOrNull;
    final track = pub?.track;
    if (track != null) {
      if (next) { track.mute(); } else { track.unmute(); }
    } else {
      _room?.localParticipant
          ?.setMicrophoneEnabled(!next)
          .then((_) => null)
          .catchError((_) {});
    }
  }

  void _toggleCam() {
    final camOff = ref.read(callProvider).camOff;
    final next = !camOff;
    ref.read(callProvider.notifier).setCamOff(next);
    final pub = _room?.localParticipant?.videoTrackPublications.firstOrNull;
    final track = pub?.track;
    if (track != null) {
      if (next) { track.mute(); } else { track.unmute(); }
    } else {
      _room?.localParticipant
          ?.setCameraEnabled(!next)
          .then((_) => null)
          .catchError((_) {});
    }
  }

  String _statusLabel(CallMode mode) {
    if (mode == CallMode.outgoing) return 'Ringing…';
    if (_connState == lk.ConnectionState.connecting) return 'Connecting…';
    if (_connState == lk.ConnectionState.reconnecting) return 'Reconnecting…';
    if (mode == CallMode.active) return formatCallDuration(_elapsed);
    return 'Connected';
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<CallState>(callProvider, (prev, next) {
      final nextInCall =
          next.mode == CallMode.outgoing || next.mode == CallMode.active;
      final nextActive = next.active;
      if (!nextInCall || nextActive == null) {
        if (_room != null) _teardownRoom();
        return;
      }
      if (_connectedCallId != nextActive.callId ||
          _connectedRoomName != nextActive.roomName) {
        _ensureRoom(nextActive);
      }
    });

    final state = ref.watch(callProvider);
    final inCall =
        state.mode == CallMode.outgoing || state.mode == CallMode.active;
    final active = state.active;

    if (!inCall || active == null) {
      return const SizedBox.shrink();
    }

    if (state.mode == CallMode.active && _timer == null) {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _elapsed++);
      });
    } else if (state.mode != CallMode.active && _timer != null) {
      _timer?.cancel();
      _timer = null;
      _elapsed = 0;
    }

    final statusLabel = _statusLabel(state.mode);

    if (!state.expanded) {
      return MiniCallWidget(
        active: active,
        room: _room,
        statusLabel: statusLabel,
        onExpand: () => ref.read(callProvider.notifier).setExpanded(true),
        onEnd: () => ref.read(callProvider.notifier).endActive(),
      );
    }

    final isMobile = defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS;
    return _ExpandedCall(
      active: active,
      room: _room,
      mode: state.mode,
      micMuted: state.micMuted,
      camOff: state.camOff,
      speakerOn: state.speakerOn,
      showSpeakerToggle: isMobile,
      statusLabel: statusLabel,
      settingsOpen: _settingsOpen,
      localVideoPos: state.localVideoPos,
      localSpeaking: _localSpeaking,
      remoteSpeaking: _remoteSpeaking,
      onToggleMic: _toggleMic,
      onToggleCam: _toggleCam,
      onToggleSpeaker: () => ref.read(callProvider.notifier).toggleSpeaker(),
      onMinimize: () => ref.read(callProvider.notifier).setExpanded(false),
      onOpenSettings: () => setState(() => _settingsOpen = true),
      onCloseSettings: () => setState(() => _settingsOpen = false),
      onLocalVideoPos: (p) => ref.read(callProvider.notifier).setLocalVideoPos(p),
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
  final bool speakerOn;
  final bool showSpeakerToggle;
  final String statusLabel;
  final bool settingsOpen;
  final Offset? localVideoPos;
  final bool localSpeaking;
  final bool remoteSpeaking;
  final VoidCallback onToggleMic;
  final VoidCallback onToggleCam;
  final VoidCallback onToggleSpeaker;
  final VoidCallback onMinimize;
  final VoidCallback onOpenSettings;
  final VoidCallback onCloseSettings;
  final ValueChanged<Offset> onLocalVideoPos;
  final VoidCallback onEnd;

  const _ExpandedCall({
    required this.active,
    required this.room,
    required this.mode,
    required this.micMuted,
    required this.camOff,
    required this.speakerOn,
    required this.showSpeakerToggle,
    required this.statusLabel,
    required this.settingsOpen,
    required this.localVideoPos,
    required this.localSpeaking,
    required this.remoteSpeaking,
    required this.onToggleMic,
    required this.onToggleCam,
    required this.onToggleSpeaker,
    required this.onMinimize,
    required this.onOpenSettings,
    required this.onCloseSettings,
    required this.onLocalVideoPos,
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
        child: Stack(
          children: [
            Positioned.fill(
              child: isVideo && remoteVideoTrack != null && !remoteVideoTrack.muted
                  ? Stack(fit: StackFit.expand, children: [
                      VideoTrackRenderer(
                        remoteVideoTrack,
                        fit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                      ),
                      if (remoteSpeaking)
                        IgnorePointer(
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: const Color(0xCC4ADE80), width: 4),
                              boxShadow: const [
                                BoxShadow(color: Color(0x594ADE80), blurRadius: 40, spreadRadius: -4, offset: Offset(0, 0)),
                              ],
                            ),
                          ),
                        ),
                    ])
                  : _PeerAvatarBg(
                      name: name,
                      avatar: active.peer.avatar,
                      statusLabel: statusLabel,
                      speaking: remoteSpeaking,
                    ),
            ),

            if (isVideo && localVideoTrack != null && !camOff)
              Positioned.fill(
                child: SafeArea(
                  child: DraggablePip(
                    position: localVideoPos,
                    width: 110,
                    height: 150,
                    initialOffsetFromCorner: const Offset(16, 64),
                    initialCorner: Alignment.topRight,
                    onChange: onLocalVideoPos,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      decoration: BoxDecoration(
                        color: Colors.black,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: localSpeaking
                              ? const Color(0xFF4ADE80)
                              : Colors.white.withValues(alpha: 0.3),
                          width: localSpeaking ? 3 : 2,
                        ),
                        boxShadow: [
                          if (localSpeaking)
                            const BoxShadow(color: Color(0x804ADE80), blurRadius: 24, spreadRadius: 1)
                          else
                            const BoxShadow(color: Color(0x99000000), blurRadius: 12, offset: Offset(0, 4)),
                        ],
                      ),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: VideoTrackRenderer(
                              localVideoTrack,
                              mirrorMode: VideoViewMirrorMode.mirror,
                              fit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                            ),
                          ),
                          Positioned(
                            left: 6,
                            bottom: 6,
                            child: _MicBadge(muted: micMuted, speaking: localSpeaking),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

            Positioned(
              top: 0, left: 0, right: 0,
              child: SafeArea(
                bottom: false,
                child: CallHeader(
                  name: name,
                  statusLabel: statusLabel,
                  isVideo: isVideo,
                  onMinimize: onMinimize,
                  onOpenSettings: onOpenSettings,
                ),
              ),
            ),

            Positioned(
              bottom: 0, left: 0, right: 0,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [Color(0xB3000000), Color(0x4D000000), Colors.transparent],
                  ),
                ),
                child: SafeArea(
                  top: false,
                  child: Padding(
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
                        const SizedBox(width: 14),
                        if (isVideo)
                          _CtrlButton(
                            active: camOff,
                            onTap: onToggleCam,
                            icon: camOff ? Icons.videocam_off_rounded : Icons.videocam_rounded,
                            tooltip: camOff ? 'Camera on' : 'Camera off',
                          ),
                        if (isVideo) const SizedBox(width: 14),
                        if (showSpeakerToggle) ...[
                          _CtrlButton(
                            active: speakerOn,
                            onTap: onToggleSpeaker,
                            icon: speakerOn
                                ? Icons.volume_up_rounded
                                : Icons.phone_in_talk_rounded,
                            tooltip: speakerOn ? 'Speaker on' : 'Speaker off',
                          ),
                          const SizedBox(width: 14),
                        ],
                        _CtrlButton(
                          active: false,
                          onTap: onOpenSettings,
                          icon: Icons.tune_rounded,
                          tooltip: 'Settings',
                        ),
                        const SizedBox(width: 14),
                        _EndButton(onTap: onEnd),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            if (settingsOpen)
              Positioned.fill(
                child: GestureDetector(
                  onTap: onCloseSettings,
                  child: Container(
                    color: const Color(0x66000000),
                    alignment: Alignment.bottomCenter,
                    child: GestureDetector(
                      onTap: () {},
                      child: CallSettingsPanel(room: room, onClose: onCloseSettings),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _PeerAvatarBg extends StatelessWidget {
  final String name;
  final String? avatar;
  final String statusLabel;
  final bool speaking;
  const _PeerAvatarBg({
    required this.name,
    required this.avatar,
    required this.statusLabel,
    this.speaking = false,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: speaking
                  ? Border.all(color: const Color(0xFF4ADE80), width: 4)
                  : null,
              boxShadow: speaking
                  ? const [BoxShadow(color: Color(0x994ADE80), blurRadius: 30)]
                  : null,
            ),
            child: GradientAvatar(imageUrl: avatar, name: name, size: 140),
          ),
          const SizedBox(height: 24),
          Text(name,
              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Text(statusLabel,
              style: const TextStyle(color: Color(0xE6FFFFFF), fontSize: 16)),
        ],
      ),
    );
  }
}

class _MicBadge extends StatelessWidget {
  final bool muted;
  final bool speaking;
  const _MicBadge({required this.muted, required this.speaking});

  @override
  Widget build(BuildContext context) {
    final color = muted
        ? const Color(0xFFEF4444)
        : speaking
            ? const Color(0xFF22C55E)
            : const Color(0x99000000);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [
          if (speaking && !muted)
            const BoxShadow(color: Color(0x9922C55E), blurRadius: 10, spreadRadius: 1)
          else
            const BoxShadow(color: Color(0x66000000), blurRadius: 4, offset: Offset(0, 1)),
        ],
        border: speaking && !muted
            ? Border.all(color: const Color(0xCC86EFAC), width: 1.5)
            : null,
      ),
      child: Icon(
        muted ? Icons.mic_off_rounded : Icons.mic_rounded,
        size: 14,
        color: Colors.white,
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
              BoxShadow(color: Color(0x66EF4444), blurRadius: 20, offset: Offset(0, 6)),
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
