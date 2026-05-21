import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
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
  late final PresenceNotifier _presenceNotifier;
  int _lastMessageCount = 0;
  Timer? _stopTypingTimer;
  bool _isTyping = false;
  String? _editingMessageId;

  @override
  void initState() {
    super.initState();
    _activeConversationNotifier = ref.read(activeConversationProvider.notifier);
    _presenceNotifier = ref.read(presenceProvider.notifier);

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
    _presenceNotifier.stopFocusPolling();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToBottom({bool animated = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToMaxExtent(animated: animated);
    });
  }

  void _scrollToMaxExtent({
    required bool animated,
    int attempt = 0,
    double lastExtent = -1,
  }) {
    if (!mounted) return;
    if (!_scroll.hasClients) {
      if (attempt < 10) {
        Future<void>.delayed(const Duration(milliseconds: 32), () {
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

    if (attempt < 6 && (target != lastExtent || target == 0)) {
      Future<void>.delayed(const Duration(milliseconds: 64), () {
        if (!mounted || !_scroll.hasClients) return;
        final newTarget = _scroll.position.maxScrollExtent;
        if (newTarget > target + 0.5) {
          _scrollToMaxExtent(
            animated: false,
            attempt: attempt + 1,
            lastExtent: target,
          );
        }
      });
    }
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;

    if (_editingMessageId != null) {
      final id = _editingMessageId!;
      _input.clear();
      setState(() => _editingMessageId = null);
      final ok = await ref.read(messagesProvider.notifier).editMessage(id, text);
      if (!ok && mounted) {
        final err = ref.read(messagesProvider).error;
        showErrorToast(_extractErrorMessage(err, 'Failed to edit message'));
      }
      return;
    }

    _input.clear();
    _scrollToBottom();
    final ok = await ref.read(messagesProvider.notifier).send(text);
    if (!ok && mounted) {
      showErrorToast('Failed to send message');
    }
  }

  void _startEdit(Message message) {
    if (!message.isText) return;
    setState(() => _editingMessageId = message.id);
    _input.text = message.content;
    _input.selection = TextSelection.collapsed(offset: _input.text.length);
  }

  void _cancelEdit() {
    setState(() => _editingMessageId = null);
    _input.clear();
  }

  Future<void> _deleteMessage(String messageId) async {
    final ok = await ref.read(messagesProvider.notifier).deleteMessage(messageId);
    if (!ok && mounted) {
      final err = ref.read(messagesProvider).error;
      showErrorToast(_extractErrorMessage(err, 'Failed to delete message'));
    }
  }

  String _extractErrorMessage(Object? err, String fallback) {
    if (err is DioException) {
      final data = err.response?.data;
      if (data is Map && data['error'] is String) return data['error'] as String;
      return err.message ?? err.response?.statusMessage ?? fallback;
    }
    return fallback;
  }

  Future<void> _sendImage(File file) async {
    _scrollToBottom();
    final ok = await ref.read(messagesProvider.notifier).sendImage(file);
    if (!ok && mounted) {
      final err = ref.read(messagesProvider).error;
      final msg = err is DioException
          ? (err.message ?? err.response?.statusMessage ?? 'Failed to send image')
          : 'Failed to send image';
      showErrorToast(msg);
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
                      onReact: (mid, type) async {
                        await ref.read(messagesProvider.notifier).toggleReaction(mid, type);
                      },
                      onEdit: _startEdit,
                      onDelete: _deleteMessage,
                    ),
            ),
            TypingIndicator(typingUsers: typingUsers),
            MessageComposer(
              controller: _input,
              sending: messagesState.sending,
              onSend: _send,
              onSendImage: _sendImage,
              editing: _editingMessageId != null,
              onCancelEdit: _cancelEdit,
            ),
          ],
        ),
      ),
    );
  }
}
