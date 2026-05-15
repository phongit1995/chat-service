import 'dart:async';
import 'package:desktop_multi_window/desktop_multi_window.dart';
import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart' hide ConnectionState;
import 'package:livekit_client/livekit_client.dart' as lk show ConnectionState;
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../models/call.dart';
import '../../providers/call_provider.dart' show formatCallDuration;
import '../../theme/widgets.dart';

/// Entry point for the dedicated desktop call window. Lives in its own
/// Flutter engine — does not share Riverpod state with the main window.
///
/// Connects to LiveKit using args passed by the main window. When the user
/// ends the call or closes the window, notifies main window via IPC and
/// closes itself.
class CallWindowApp extends StatefulWidget {
  final WindowController windowController;
  final Map<String, dynamic> args;

  const CallWindowApp({
    super.key,
    required this.windowController,
    required this.args,
  });

  @override
  State<CallWindowApp> createState() => _CallWindowAppState();
}

class _CallWindowAppState extends State<CallWindowApp> {
  Room? _room;
  EventsListener<RoomEvent>? _listener;
  bool _connecting = false;
  bool _micMuted = false;
  bool _camOff = false;
  int _elapsed = 0;
  Timer? _timer;
  lk.ConnectionState _connState = lk.ConnectionState.disconnected;
  bool _ended = false;

  String get _wsUrl => widget.args['wsUrl'] as String;
  String get _token => widget.args['token'] as String;
  String get _callId => widget.args['callId'] as String;
  CallType get _callType =>
      widget.args['callType'] == 'video' ? CallType.video : CallType.audio;
  String get _peerName => widget.args['peerName'] as String? ?? 'Unknown';
  String? get _peerAvatar => widget.args['peerAvatar'] as String?;
  bool get _isOutgoing => (widget.args['mode'] as String?) == 'outgoing';

  @override
  void initState() {
    super.initState();
    _connect();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _teardown();
    WakelockPlus.disable();
    super.dispose();
  }

  Future<void> _connect() async {
    if (_connecting) return;
    _connecting = true;

    final room = Room(
      roomOptions: const RoomOptions(adaptiveStream: true, dynacast: true),
    );
    _room = room;

    final listener = room.createListener();
    _listener = listener;
    listener.on<RoomDisconnectedEvent>((_) {
      if (mounted) setState(() {});
    });
    listener.on<ParticipantDisconnectedEvent>((_) {
      _endCall();
    });

    try {
      await room.connect(_wsUrl, _token);
      await room.localParticipant?.setMicrophoneEnabled(true);
      if (_callType == CallType.video) {
        await room.localParticipant?.setCameraEnabled(true);
      }
      WakelockPlus.enable();
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _elapsed++);
      });
    } catch (_) {
      _endCall();
    } finally {
      _connecting = false;
      if (mounted) setState(() => _connState = room.connectionState);
    }
  }

  Future<void> _teardown() async {
    final listener = _listener;
    _listener = null;
    final room = _room;
    _room = null;
    if (listener != null) await listener.dispose();
    if (room != null) {
      await room.disconnect();
      await room.dispose();
    }
  }

  Future<void> _endCall() async {
    if (_ended) return;
    _ended = true;
    await _teardown();
    try {
      await DesktopMultiWindow.invokeMethod(0, 'call.ended', {
        'callId': _callId,
        'durationSeconds': _elapsed,
      });
    } catch (_) {}
    await widget.windowController.close();
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
          .catchError((_) => null);
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
          .catchError((_) => null);
    }
  }

  String _statusLabel() {
    if (_isOutgoing && _connState != lk.ConnectionState.connected) {
      return 'Ringing…';
    }
    if (_connState == lk.ConnectionState.connecting) return 'Connecting…';
    if (_connState == lk.ConnectionState.reconnecting) return 'Reconnecting…';
    if (_connState == lk.ConnectionState.connected) {
      return formatCallDuration(_elapsed);
    }
    return 'Connected';
  }

  @override
  Widget build(BuildContext context) {
    final isVideo = _callType == CallType.video;
    final remoteTrackRaw = _room?.remoteParticipants.values.firstOrNull
        ?.videoTrackPublications.firstOrNull?.track;
    final localTrackRaw =
        _room?.localParticipant?.videoTrackPublications.firstOrNull?.track;
    final remoteVideoTrack =
        remoteTrackRaw is VideoTrack ? remoteTrackRaw : null;
    final localVideoTrack =
        localTrackRaw is VideoTrack ? localTrackRaw : null;

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF020617), Color(0xFF1E1B4B)],
            ),
          ),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 12,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _peerName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _statusLabel(),
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
                              imageUrl: _peerAvatar,
                              name: _peerName,
                              size: 140,
                            ),
                            const SizedBox(height: 24),
                            Text(
                              _peerName,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _statusLabel(),
                              style: const TextStyle(
                                color: Color(0xE6FFFFFF),
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (isVideo && localVideoTrack != null && !_camOff)
                      Positioned(
                        top: 16,
                        right: 16,
                        child: Container(
                          width: 160,
                          height: 110,
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
              Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: 24, horizontal: 16,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _CtrlButton(
                      active: _micMuted,
                      onTap: _toggleMic,
                      icon: _micMuted ? Icons.mic_off_rounded : Icons.mic_rounded,
                      tooltip: _micMuted ? 'Unmute' : 'Mute',
                    ),
                    const SizedBox(width: 16),
                    if (isVideo)
                      _CtrlButton(
                        active: _camOff,
                        onTap: _toggleCam,
                        icon: _camOff
                            ? Icons.videocam_off_rounded
                            : Icons.videocam_rounded,
                        tooltip: _camOff ? 'Camera on' : 'Camera off',
                      ),
                    if (isVideo) const SizedBox(width: 16),
                    _EndButton(onTap: _endCall),
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
