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
/// Renders either a small ringing UI (mode == 'incoming') or the full call
/// UI (mode == 'active' / 'outgoing'). When in incoming mode, accept/decline
/// are sent back to main via IPC; main then either tells this window to
/// switch to active and resize, or closes it.
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

enum _UiMode { incoming, active }

const Size _kLargeSize = Size(960, 640);

class _CallWindowAppState extends State<CallWindowApp> {
  // ── Mode ──
  late _UiMode _uiMode;
  // True after peer has accepted an outgoing call (so we stop showing
  // "Ringing…" even though we stay in _UiMode.active throughout).
  bool _peerAccepted = false;

  // ── Call args (mutable so we can swap them when switching mode) ──
  late Map<String, dynamic> _args;

  // ── LiveKit (only when _uiMode == active) ──
  Room? _room;
  EventsListener<RoomEvent>? _listener;
  bool _connecting = false;
  bool _micMuted = false;
  bool _camOff = false;
  int _elapsed = 0;
  Timer? _timer;
  lk.ConnectionState _connState = lk.ConnectionState.disconnected;
  bool _ended = false;
  // Bug #2: prevents double-tap on accept/decline while IPC is in flight.
  bool _busy = false;

  String get _peerName => _args['peerName'] as String? ?? 'Unknown';
  String? get _peerAvatar => _args['peerAvatar'] as String?;
  String? get _peerUsername => _args['peerUsername'] as String?;
  CallType get _callType =>
      _args['callType'] == 'video' ? CallType.video : CallType.audio;
  String get _callId => _args['callId'] as String;
  bool get _isOutgoing => (_args['mode'] as String?) == 'outgoing';

  @override
  void initState() {
    super.initState();
    _args = Map<String, dynamic>.from(widget.args);
    _uiMode = _args['mode'] == 'incoming' ? _UiMode.incoming : _UiMode.active;

    // Receive instructions from the main window (switch to active, peer
    // accepted, end call).
    DesktopMultiWindow.setMethodHandler(_handleMainMessage);

    if (_uiMode == _UiMode.active) {
      _connect();
    }
  }

  @override
  void dispose() {
    // Bug #7: if user closes the window via OS title bar (X), let main
    // know so it can finalize the call. dispose() runs whether close came
    // from main or from OS, but _ended guards us from notifying twice.
    if (!_ended) {
      _ended = true;
      // Fire-and-forget — the engine is going down so we can't await.
      DesktopMultiWindow.invokeMethod(0, 'call.ended', {
        'callId': _callId,
        'durationSeconds': _elapsed,
      }).catchError((_) => null);
    }
    _timer?.cancel();
    _teardown();
    WakelockPlus.disable();
    super.dispose();
  }

  Future<dynamic> _handleMainMessage(call, fromWindowId) async {
    switch (call.method) {
      case 'call.switchToActive':
        // Bug #3: resize ourselves AFTER the layout swap so the new size
        // never gets paired with the old (incoming) UI for one frame.
        final args = Map<String, dynamic>.from(call.arguments as Map);
        if (!mounted) return null;
        setState(() {
          _args = {..._args, ...args, 'mode': 'active'};
          _uiMode = _UiMode.active;
          _peerAccepted = true;
        });
        try {
          widget.windowController
            ..setFrame(Offset.zero & _kLargeSize)
            ..center();
        } catch (_) {}
        await _connect();
        break;
      case 'call.peerAccepted':
        // Bug #1: outgoing window was already in active LiveKit mode, but
        // status said "Ringing…". Now peer has joined — drop that label.
        if (!mounted) return null;
        setState(() => _peerAccepted = true);
        break;
      case 'call.end':
        await _closeFromMain();
        break;
    }
    return null;
  }

  Future<void> _closeFromMain() async {
    if (_ended) return;
    _ended = true;
    await _teardown();
    try {
      await widget.windowController.close();
    } catch (_) {}
  }

  // Suppress the ringing-window-still-open width for the small ringing UI
  // when we are spawned with mode='incoming' (the parent already opened
  // us at _kSmallSize; this is just a safety net).
  // Bug #3 also fixes the small→large transition via _handleMainMessage.

  // ── Local actions ────────────────────────────────────────────────────

  Future<void> _onAccept() async {
    if (_busy) return;
    _busy = true;
    try {
      await DesktopMultiWindow.invokeMethod(0, 'call.accept', {
        'callId': _callId,
      });
    } catch (_) {}
    // Don't reset _busy — main will reply with switchToActive (which sets
    // _uiMode = active) or main will close us. Either way no more accepts.
  }

  Future<void> _onDecline() async {
    if (_busy) return;
    _busy = true;
    try {
      await DesktopMultiWindow.invokeMethod(0, 'call.decline', {
        'callId': _callId,
      });
    } catch (_) {}
    // Main will close us via 'call.end' or just close the window directly.
  }

  // ── LiveKit lifecycle ────────────────────────────────────────────────

  Future<void> _connect() async {
    // Bug #4: don't start a new connection if the call already ended or
    // we're already connecting. Without this, a late switchToActive after
    // teardown could resurrect the room object.
    if (_connecting || _ended) return;
    _connecting = true;

    final wsUrl = _args['wsUrl'] as String?;
    final token = _args['token'] as String?;
    if (wsUrl == null || token == null) {
      _connecting = false;
      return;
    }

    final room = Room(
      roomOptions: const RoomOptions(adaptiveStream: true, dynacast: true),
    );

    // Bug #4: if _endCall was triggered between the await above and now,
    // throw away this freshly-created room instead of leaking it.
    if (_ended) {
      _connecting = false;
      await room.dispose();
      return;
    }
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
      await room.connect(wsUrl, token);
      if (_ended) return;
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
      if (mounted && !_ended) {
        setState(() => _connState = room.connectionState);
      }
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

  /// User clicked End in the active call UI. Bug #5: we do NOT close the
  /// window ourselves — main is the single source of truth and will close
  /// us in response to 'call.ended'. This avoids the double-close race
  /// between sub-window and main.
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
    // Main will call windowController.close() via _windDownAndCloseWindow.
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
    // Bug #1: outgoing call stays "Ringing…" until peer accepts (signalled
    // by main via 'call.peerAccepted'), regardless of local LiveKit state.
    if (_isOutgoing && !_peerAccepted) return 'Ringing…';
    if (_connState == lk.ConnectionState.connecting) return 'Connecting…';
    if (_connState == lk.ConnectionState.reconnecting) return 'Reconnecting…';
    if (_connState == lk.ConnectionState.connected) {
      return formatCallDuration(_elapsed);
    }
    return 'Connected';
  }

  // ── Build ────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: _uiMode == _UiMode.incoming
            ? _buildIncoming()
            : _buildActive(),
      ),
    );
  }

  Widget _buildIncoming() {
    final isVideo = _callType == CallType.video;
    return Container(
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
            const SizedBox(height: 24),
            Text(
              'Incoming ${isVideo ? "video" : "voice"} call',
              style: const TextStyle(
                color: Color(0xCCFFFFFF),
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 3,
              ),
            ),
            const Spacer(),
            GradientAvatar(
              imageUrl: _peerAvatar,
              name: _peerName,
              size: 110,
            ),
            const SizedBox(height: 18),
            Text(
              _peerName,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (_peerUsername != null) ...[
              const SizedBox(height: 4),
              Text(
                '@$_peerUsername',
                style: const TextStyle(
                  color: Color(0x99FFFFFF),
                  fontSize: 13,
                ),
              ),
            ],
            const Spacer(flex: 2),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _BigActionButton(
                    color: const Color(0xFFEF4444),
                    icon: Icons.call_end_rounded,
                    label: 'Decline',
                    onTap: _onDecline,
                  ),
                  _BigActionButton(
                    color: const Color(0xFF22C55E),
                    icon: isVideo
                        ? Icons.videocam_rounded
                        : Icons.call_rounded,
                    label: 'Accept',
                    onTap: _onAccept,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActive() {
    final isVideo = _callType == CallType.video;
    final remoteTrackRaw = _room?.remoteParticipants.values.firstOrNull
        ?.videoTrackPublications.firstOrNull?.track;
    final localTrackRaw =
        _room?.localParticipant?.videoTrackPublications.firstOrNull?.track;
    final remoteVideoTrack =
        remoteTrackRaw is VideoTrack ? remoteTrackRaw : null;
    final localVideoTrack =
        localTrackRaw is VideoTrack ? localTrackRaw : null;

    return Container(
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
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
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

class _BigActionButton extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _BigActionButton({
    required this.color,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(40),
          child: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.5),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 28),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xCCFFFFFF),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
