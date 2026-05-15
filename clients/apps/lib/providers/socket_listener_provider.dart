import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'call_provider.dart';
import 'conversations_provider.dart';
import 'core_providers.dart';
import 'messages_provider.dart';

class SocketListener {
  final List<StreamSubscription<dynamic>> _subs;
  SocketListener(this._subs);

  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
  }
}

final socketListenerProvider = Provider<SocketListener>((ref) {
  final socket = ref.watch(socketProvider);

  final subs = <StreamSubscription<dynamic>>[
    socket.onConversationCreated.listen((_) {
      ref.read(conversationsRawProvider.notifier).reload();
    }),
    socket.onConversationUpdated.listen((p) {
      ref.read(conversationsRawProvider.notifier).handleConversationUpdated(p);
    }),
    socket.onConversationDeleted.listen((id) {
      ref.read(conversationsRawProvider.notifier).handleConversationDeleted(id);
    }),
    socket.onNewMessage.listen((event) {
      ref.read(conversationsRawProvider.notifier).handleNewMessage(event);
      ref.read(messagesProvider.notifier).applyIncoming(event.message);
    }),
    socket.onIncomingCall.listen((p) {
      ref.read(callProvider.notifier).onIncoming(p);
    }),
    socket.onCallAccepted.listen((p) {
      ref.read(callProvider.notifier).onAccepted(p);
    }),
    socket.onCallDeclined.listen((p) {
      ref.read(callProvider.notifier).onDeclined(p);
    }),
    socket.onCallEnded.listen((p) {
      ref.read(callProvider.notifier).onEnded(p);
    }),
  ];

  ref.onDispose(() {
    for (final s in subs) {
      s.cancel();
    }
  });

  return SocketListener(subs);
});
