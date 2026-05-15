import 'dart:convert';
import 'dart:ui';

import 'package:desktop_multi_window/desktop_multi_window.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
import 'package:flutter_callkit_incoming/flutter_callkit_incoming.dart';
import 'package:flutter_callkit_incoming/entities/entities.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/call.dart';
import '../models/ws_events.dart';
import '../utils/toast.dart';
import 'core_providers.dart';

bool get _isDesktop =>
    defaultTargetPlatform == TargetPlatform.windows ||
    defaultTargetPlatform == TargetPlatform.macOS ||
    defaultTargetPlatform == TargetPlatform.linux;

const Size _kSmallSize = Size(380, 540);
const Size _kLargeSize = Size(960, 640);

Future<int?> _openCallWindow({
  required Map<String, dynamic> args,
  required Size size,
  required String title,
}) async {
  if (!_isDesktop) return null;
  try {
    final controller = await DesktopMultiWindow.createWindow(
      jsonEncode({'type': 'call', ...args}),
    );
    controller
      ..setFrame(Offset.zero & size)
      ..center()
      ..setTitle(title)
      ..show();
    return controller.windowId;
  } catch (_) {
    return null;
  }
}

Future<int?> _openActiveCallWindow(ActiveCall active, bool isOutgoing) =>
    _openCallWindow(
      args: {
        'callId': active.callId,
        'token': active.token,
        'wsUrl': active.wsUrl,
        'roomName': active.roomName,
        'callType': active.callType == CallType.video ? 'video' : 'audio',
        'peerName': active.peer.displayName,
        'peerAvatar': active.peer.avatar,
        'mode': isOutgoing ? 'outgoing' : 'active',
      },
      size: _kLargeSize,
      title: active.peer.displayName,
    );

Future<int?> _openIncomingCallWindow(IncomingCall incoming) =>
    _openCallWindow(
      args: {
        'callId': incoming.callId,
        'roomName': incoming.roomName,
        'callType': incoming.callType == CallType.video ? 'video' : 'audio',
        'peerName': incoming.caller.displayName,
        'peerUsername': incoming.caller.username,
        'peerAvatar': incoming.caller.avatar,
        'mode': 'incoming',
      },
      size: _kSmallSize,
      title: 'Incoming · ${incoming.caller.displayName}',
    );

Future<void> _closeCallWindow(int? windowId) async {
  if (windowId == null) return;
  try {
    await WindowController.fromWindowId(windowId).close();
  } catch (_) {}
}

/// Tell the existing incoming sub-window to switch to active call mode and
/// resize itself. Used after the user answers — we keep the same window
/// instead of spawning a new one.
Future<void> _switchWindowToActive({
  required int windowId,
  required ActiveCall active,
}) async {
  try {
    await DesktopMultiWindow.invokeMethod(windowId, 'call.switchToActive', {
      'callId': active.callId,
      'token': active.token,
      'wsUrl': active.wsUrl,
      'roomName': active.roomName,
      'callType': active.callType == CallType.video ? 'video' : 'audio',
      'peerName': active.peer.displayName,
      'peerAvatar': active.peer.avatar,
    });
    final ctrl = WindowController.fromWindowId(windowId);
    ctrl
      ..setFrame(Offset.zero & _kLargeSize)
      ..center();
  } catch (_) {}
}

enum CallMode { idle, incoming, outgoing, active }

class IncomingCall {
  final String callId;
  final String conversationId;
  final CallType callType;
  final String roomName;
  final CallerBrief caller;

  const IncomingCall({
    required this.callId,
    required this.conversationId,
    required this.callType,
    required this.roomName,
    required this.caller,
  });
}

class ActiveCall {
  final String callId;
  final String conversationId;
  final CallType callType;
  final String roomName;
  final String wsUrl;
  final String token;
  final CallerBrief peer;

  const ActiveCall({
    required this.callId,
    required this.conversationId,
    required this.callType,
    required this.roomName,
    required this.wsUrl,
    required this.token,
    required this.peer,
  });
}

class CallState {
  final CallMode mode;
  final IncomingCall? incoming;
  final ActiveCall? active;
  final bool expanded;
  final bool micMuted;
  final bool camOff;
  final bool localEnded;
  /// Desktop only: id of the spawned call sub-window. Used to close it
  /// when the call ends from any side (peer hangup, remote decline, etc).
  final int? callWindowId;

  const CallState({
    this.mode = CallMode.idle,
    this.incoming,
    this.active,
    this.expanded = false,
    this.micMuted = false,
    this.camOff = false,
    this.localEnded = false,
    this.callWindowId,
  });

  CallState copyWith({
    CallMode? mode,
    IncomingCall? incoming,
    ActiveCall? active,
    bool? expanded,
    bool? micMuted,
    bool? camOff,
    bool? localEnded,
    int? callWindowId,
    bool clearIncoming = false,
    bool clearActive = false,
    bool clearCallWindowId = false,
  }) => CallState(
        mode: mode ?? this.mode,
        incoming: clearIncoming ? null : (incoming ?? this.incoming),
        active: clearActive ? null : (active ?? this.active),
        expanded: expanded ?? this.expanded,
        micMuted: micMuted ?? this.micMuted,
        camOff: camOff ?? this.camOff,
        localEnded: localEnded ?? this.localEnded,
        callWindowId:
            clearCallWindowId ? null : (callWindowId ?? this.callWindowId),
      );

  static const idle = CallState();
}

/// Native CallKit incoming UI — Android only.
/// iOS uses an in-app full-screen incoming page (Apple CallKit requires
/// VoIP push setup which is out of scope for this build).
bool get _useCallkit => defaultTargetPlatform == TargetPlatform.android;

Future<void> _showCallkitUI(IncomingCall incoming) async {
  if (!_useCallkit) return;
  final params = CallKitParams(
    id: incoming.callId,
    nameCaller: incoming.caller.displayName,
    avatar: incoming.caller.avatar,
    type: incoming.callType == CallType.video ? 1 : 0,
    duration: 30000,
    textAccept: 'Accept',
    textDecline: 'Decline',
    missedCallNotification: const NotificationParams(
      showNotification: true,
      isShowCallback: false,
      subtitle: 'Missed call',
    ),
    android: const AndroidParams(
      isCustomNotification: true,
      isShowFullLockedScreen: true,
      ringtonePath: 'system_ringtone_default',
      backgroundColor: '#1E293B',
      actionColor: '#DD2A7B',
      textColor: '#FFFFFF',
    ),
    ios: const IOSParams(
      iconName: 'CallKitLogo',
      handleType: 'generic',
      supportsVideo: true,
      maximumCallGroups: 1,
      maximumCallsPerCallGroup: 1,
      ringtonePath: 'system_ringtone_default',
    ),
  );
  await FlutterCallkitIncoming.showCallkitIncoming(params);
}

Future<void> _endCallkitUI(String callId) async {
  if (!_useCallkit) return;
  await FlutterCallkitIncoming.endCall(callId);
}

CallType _parseCallType(String s) =>
    s == 'video' ? CallType.video : CallType.audio;

ActiveCall _toActiveCall(CallTokenResponse data, CallerBrief peer) =>
    ActiveCall(
      callId: data.callId,
      conversationId: data.conversationId,
      callType: data.callType,
      roomName: data.roomName,
      wsUrl: data.wsUrl,
      token: data.token,
      peer: peer,
    );

String formatCallDuration(int seconds) {
  final m = seconds ~/ 60;
  final s = seconds % 60;
  return '$m:${s.toString().padLeft(2, '0')}';
}

class CallNotifier extends Notifier<CallState> {
  @override
  CallState build() {
    if (_useCallkit) {
      FlutterCallkitIncoming.onEvent.listen(_handleCallkitEvent);
    }
    if (_isDesktop) {
      DesktopMultiWindow.setMethodHandler(_handleSubWindowMessage);
    }
    return CallState.idle;
  }

  void _handleCallkitEvent(CallEvent? event) {
    if (event == null) return;
    switch (event.event) {
      case Event.actionCallAccept:
        answerIncoming();
        break;
      case Event.actionCallDecline:
        declineIncoming();
        break;
      case Event.actionCallEnded:
        endActive();
        break;
      default:
        break;
    }
  }

  /// IPC from the call sub-window (desktop only). The sub-window owns the
  /// LiveKit Room and the incoming-ringing UI — main learns about user
  /// actions there via these messages.
  Future<dynamic> _handleSubWindowMessage(call, fromWindowId) async {
    switch (call.method) {
      case 'call.accept':
        await answerIncoming();
        break;
      case 'call.decline':
        await declineIncoming();
        break;
      case 'call.ended':
        await endActive();
        break;
    }
    return null;
  }

  Future<void> startCall(
    String conversationId,
    CallType callType,
    CallerBrief peer,
  ) async {
    try {
      final data = await ref
          .read(callServiceProvider)
          .start(conversationId, callType);
      final active = _toActiveCall(data, peer);
      state = CallState(
        mode: CallMode.outgoing,
        active: active,
        expanded: true,
      );
      // Outgoing: open large window right away — the user is the one calling.
      final id = await _openActiveCallWindow(active, true);
      if (id != null) state = state.copyWith(callWindowId: id);
    } catch (_) {
      showErrorToast('Failed to start call');
      state = CallState.idle;
    }
  }

  Future<void> answerIncoming() async {
    final incoming = state.incoming;
    if (incoming == null) return;
    await _endCallkitUI(incoming.callId);
    try {
      final data = await ref
          .read(callServiceProvider)
          .answer(incoming.callId);
      final active = _toActiveCall(data, incoming.caller);
      final existingWindowId = state.callWindowId;
      state = CallState(
        mode: CallMode.active,
        active: active,
        expanded: true,
        callWindowId: existingWindowId,
      );
      // Desktop: the small ringing window was already open — resize and
      // switch it to active call mode in-place. Otherwise spawn fresh.
      if (existingWindowId != null) {
        await _switchWindowToActive(
          windowId: existingWindowId,
          active: active,
        );
      } else {
        final id = await _openActiveCallWindow(active, false);
        if (id != null) state = state.copyWith(callWindowId: id);
      }
    } catch (_) {
      showErrorToast('Failed to answer call');
      state = CallState.idle;
    }
  }

  Future<void> declineIncoming() async {
    final incoming = state.incoming;
    if (incoming == null) return;
    await _endCallkitUI(incoming.callId);
    final windowId = state.callWindowId;
    state = CallState(localEnded: true);
    showInfoToast('Call declined');
    await _closeCallWindow(windowId);
    try {
      await ref.read(callServiceProvider).decline(incoming.callId);
    } catch (_) {}
  }

  Future<void> endActive() async {
    final active = state.active;
    if (active == null) return;
    final wasActive = state.mode == CallMode.active;
    final windowId = state.callWindowId;
    await _endCallkitUI(active.callId);
    state = CallState(localEnded: true);
    showInfoToast(wasActive ? 'Call ended' : 'Call cancelled');
    await _closeCallWindow(windowId);
    try {
      await ref.read(callServiceProvider).end(active.callId);
    } catch (_) {}
  }

  void setExpanded(bool expanded) => state = state.copyWith(expanded: expanded);

  void setMicMuted(bool muted) => state = state.copyWith(micMuted: muted);

  void setCamOff(bool off) => state = state.copyWith(camOff: off);

  // ── WS event handlers ──────────────────────────────────────────────────

  Future<void> onIncoming(IncomingCallPayload data) async {
    if (state.mode != CallMode.idle) {
      try {
        await ref.read(callServiceProvider).decline(data.callId);
      } catch (_) {}
      return;
    }

    CallerBrief caller = CallerBrief(id: data.callerId);
    try {
      final u = await ref.read(userServiceProvider).getUserInfo(data.callerId);
      caller = CallerBrief(
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        avatar: u.avatar,
      );
    } catch (_) {}

    if (state.mode != CallMode.idle) return;

    final incoming = IncomingCall(
      callId: data.callId,
      conversationId: data.conversationId,
      callType: _parseCallType(data.callType),
      roomName: data.roomName,
      caller: caller,
    );

    state = CallState(mode: CallMode.incoming, incoming: incoming);
    await _showCallkitUI(incoming);

    // Desktop: spawn a small ringing sub-window. iOS / web render the
    // IncomingCallOverlay in the main window instead.
    if (_isDesktop) {
      final id = await _openIncomingCallWindow(incoming);
      if (id != null) state = state.copyWith(callWindowId: id);
    }
  }

  void onAccepted(CallAcceptedPayload data) {
    final active = state.active;
    if (active?.callId != data.callId) return;
    if (state.mode == CallMode.outgoing) {
      state = state.copyWith(mode: CallMode.active);
    }
  }

  void onDeclined(CallDeclinedPayload data) {
    final active = state.active;
    if (active?.callId != data.callId) return;
    final name = active!.peer.displayName;
    final windowId = state.callWindowId;
    _endCallkitUI(data.callId);
    showInfoToast('$name declined');
    state = CallState.idle;
    _closeCallWindow(windowId);
  }

  void onEnded(CallEndedPayload data) {
    final isOurIncoming = state.incoming?.callId == data.callId;
    final isOurActive = state.active?.callId == data.callId;
    if (!isOurIncoming && !isOurActive) return;

    final windowId = state.callWindowId;
    _endCallkitUI(data.callId);

    if (state.localEnded) {
      state = CallState.idle;
      _closeCallWindow(windowId);
      return;
    }

    state = CallState.idle;
    _closeCallWindow(windowId);

    if (data.status == 'missed') {
      showInfoToast(isOurIncoming ? 'Missed call' : 'No answer');
    } else if (data.status == 'declined') {
      // already shown in onDeclined
    } else if (data.durationSeconds > 0) {
      showSuccessToast('Call ended · ${formatCallDuration(data.durationSeconds)}');
    } else {
      showInfoToast('Call ended');
    }
  }
}

final callProvider = NotifierProvider<CallNotifier, CallState>(
  CallNotifier.new,
);
