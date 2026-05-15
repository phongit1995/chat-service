import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
import 'package:flutter_callkit_incoming/flutter_callkit_incoming.dart';
import 'package:flutter_callkit_incoming/entities/entities.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/call.dart';
import '../models/ws_events.dart';
import '../utils/toast.dart';
import 'core_providers.dart';

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

  const CallState({
    this.mode = CallMode.idle,
    this.incoming,
    this.active,
    this.expanded = false,
    this.micMuted = false,
    this.camOff = false,
    this.localEnded = false,
  });

  CallState copyWith({
    CallMode? mode,
    IncomingCall? incoming,
    ActiveCall? active,
    bool? expanded,
    bool? micMuted,
    bool? camOff,
    bool? localEnded,
    bool clearIncoming = false,
    bool clearActive = false,
  }) => CallState(
        mode: mode ?? this.mode,
        incoming: clearIncoming ? null : (incoming ?? this.incoming),
        active: clearActive ? null : (active ?? this.active),
        expanded: expanded ?? this.expanded,
        micMuted: micMuted ?? this.micMuted,
        camOff: camOff ?? this.camOff,
        localEnded: localEnded ?? this.localEnded,
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

  Future<void> startCall(
    String conversationId,
    CallType callType,
    CallerBrief peer,
  ) async {
    try {
      final data = await ref
          .read(callServiceProvider)
          .start(conversationId, callType);
      state = CallState(
        mode: CallMode.outgoing,
        active: _toActiveCall(data, peer),
        expanded: true,
      );
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
      state = CallState(
        mode: CallMode.active,
        active: _toActiveCall(data, incoming.caller),
        expanded: true,
      );
    } catch (_) {
      showErrorToast('Failed to answer call');
      state = CallState.idle;
    }
  }

  Future<void> declineIncoming() async {
    final incoming = state.incoming;
    if (incoming == null) return;
    await _endCallkitUI(incoming.callId);
    state = CallState(localEnded: true);
    showInfoToast('Call declined');
    try {
      await ref.read(callServiceProvider).decline(incoming.callId);
    } catch (_) {}
  }

  Future<void> endActive() async {
    final active = state.active;
    if (active == null) return;
    final wasActive = state.mode == CallMode.active;
    await _endCallkitUI(active.callId);
    state = CallState(localEnded: true);
    showInfoToast(wasActive ? 'Call ended' : 'Call cancelled');
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
    _endCallkitUI(data.callId);
    showInfoToast('$name declined');
    state = CallState.idle;
  }

  void onEnded(CallEndedPayload data) {
    final isOurIncoming = state.incoming?.callId == data.callId;
    final isOurActive = state.active?.callId == data.callId;
    if (!isOurIncoming && !isOurActive) return;

    _endCallkitUI(data.callId);

    if (state.localEnded) {
      state = CallState.idle;
      return;
    }

    state = CallState.idle;

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
