import 'package:flutter_riverpod/flutter_riverpod.dart';

class ActiveConversationNotifier extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? id) => state = id;
}

final activeConversationProvider =
    NotifierProvider<ActiveConversationNotifier, String?>(
      ActiveConversationNotifier.new,
    );
