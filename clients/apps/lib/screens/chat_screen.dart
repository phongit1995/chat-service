import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../providers/messages_provider.dart';
import '../models/models.dart';
import '../theme/app_colors.dart';
import '../utils/toast.dart';
import 'chat/chat_app_bar.dart';
import 'chat/message_composer.dart';
import 'chat/message_list.dart';
import 'chat/typing_indicator.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String conversationId;
  final Conversation? conversation;
  const ChatScreen({
    super.key,
    required this.conversationId,
    this.conversation,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  StreamSubscription<String>? _conversationDeletedSub;
  late final ActiveConversationNotifier _activeConversationNotifier;
  int _lastMessageCount = 0;
  Timer? _stopTypingTimer;
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    _activeConversationNotifier = ref.read(activeConversationProvider.notifier);

    Future.microtask(() {
      if (!mounted) return;
      ref.read(messagesProvider.notifier).load(widget.conversationId);
      _activeConversationNotifier.set(widget.conversationId);
      ref.read(typingProvider.notifier).init(widget.conversationId);
      final otherId = widget.conversation?.otherUser?.id;
      if (widget.conversation?.type == 'direct' && otherId != null) {
        ref.read(presenceProvider.notifier).startFocusPolling(otherId);
      }
      ref
          .read(conversationServiceProvider)
          .markAsRead(widget.conversationId)
          .catchError((_) {});
      ref.read(conversationsRawProvider.notifier).markRead(widget.conversationId);
    });

    _input.addListener(_onInputChanged);

    final socket = ref.read(socketProvider);
    _conversationDeletedSub = socket.onConversationDeleted.listen((id) {
      if (id != widget.conversationId || !mounted) return;
      _activeConversationNotifier.set(null);
      context.go('/');
    });
  }

  void _onInputChanged() {
    if (_input.text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      ref
          .read(conversationServiceProvider)
          .sendTyping(widget.conversationId)
          .catchError((_) {});
    }
    _stopTypingTimer?.cancel();
    if (_input.text.isEmpty) {
      _isTyping = false;
      return;
    }
    _stopTypingTimer = Timer(const Duration(seconds: 3), () {
      _isTyping = false;
    });
  }

  @override
  void dispose() {
    _stopTypingTimer?.cancel();
    _input.removeListener(_onInputChanged);
    _conversationDeletedSub?.cancel();
    ref.read(presenceProvider.notifier).stopFocusPolling();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToBottom({bool animated = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToMaxExtent(animated: animated);
    });
  }

  void _scrollToMaxExtent({required bool animated, int attempt = 0}) {
    if (!mounted) return;
    if (!_scroll.hasClients) {
      if (attempt < 6) {
        Future<void>.delayed(const Duration(milliseconds: 16), () {
          _scrollToMaxExtent(animated: animated, attempt: attempt + 1);
        });
      }
      return;
    }

    final target = _scroll.position.maxScrollExtent;
    if (animated) {
      _scroll.animateTo(
        target,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    } else {
      _scroll.jumpTo(target);
    }
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    _input.clear();
    _scrollToBottom();
    final ok = await ref.read(messagesProvider.notifier).send(text);
    if (!ok && mounted) {
      showErrorToast('Failed to send message');
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(authProvider).user;
    final convsState = ref.watch(conversationsProvider);
    final messagesState = ref.watch(messagesProvider);
    final typingUsers = ref.watch(typingProvider);

    final liveConv = convsState.value?.firstWhere(
      (c) => c.id == widget.conversationId,
      orElse: () =>
          widget.conversation ??
          Conversation(id: widget.conversationId, type: 'direct'),
    );
    final conversation =
        liveConv ??
        widget.conversation ??
        Conversation(id: widget.conversationId, type: 'direct');

    if (messagesState.messages.length != _lastMessageCount) {
      _lastMessageCount = messagesState.messages.length;
      _scrollToBottom(animated: !messagesState.loading);
    }

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) {
          _activeConversationNotifier.set(null);
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.bgBase,
        appBar: ChatAppBar(
          conversation: conversation,
          onBack: () => Navigator.of(context).maybePop(),
        ),
        body: Column(
          children: [
            Expanded(
              child: messagesState.loading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary,
                      ),
                    )
                  : MessageList(
                      conversation: conversation,
                      messages: messagesState.messages,
                      user: me,
                      scrollController: _scroll,
                    ),
            ),
            TypingIndicator(typingUsers: typingUsers),
            MessageComposer(
              controller: _input,
              sending: messagesState.sending,
              onSend: _send,
            ),
          ],
        ),
      ),
    );
  }
}
