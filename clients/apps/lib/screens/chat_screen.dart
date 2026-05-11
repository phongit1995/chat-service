import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';
import '../providers/providers.dart';
import '../models/models.dart';
import '../services/socket_service.dart';
import '../theme/app_colors.dart';
import 'chat/chat_app_bar.dart';
import 'chat/message_composer.dart';
import 'chat/message_list.dart';

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
  List<Message> _messages = [];
  bool _loading = true;
  StreamSubscription<NewMessageEvent>? _newMessageSub;
  StreamSubscription<String>? _conversationDeletedSub;
  bool _sending = false;
  late final ActiveConversationNotifier _activeConversationNotifier;

  @override
  void initState() {
    super.initState();
    _activeConversationNotifier = ref.read(activeConversationProvider.notifier);
    _load();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _activeConversationNotifier.set(widget.conversationId);
    });
    final socket = ref.read(socketProvider);
    _newMessageSub = socket.onNewMessage.listen((event) {
      final m = event.message;
      if (m.conversationId != widget.conversationId) return;
      final idx = _messages.indexWhere(
        (e) =>
            e.id == m.id ||
            (m.clientMsgId != null && e.clientMsgId == m.clientMsgId),
      );
      if (idx >= 0) {
        final updated = [..._messages];
        updated[idx] = m;
        setState(() => _messages = updated);
      } else {
        setState(() => _messages = [..._messages, m]);
        _scrollToBottom();
      }
    });
    _conversationDeletedSub = socket.onConversationDeleted.listen((
      conversationId,
    ) {
      if (conversationId != widget.conversationId || !mounted) return;
      _activeConversationNotifier.set(null);
      context.go('/');
    });
    ref.read(apiProvider).markAsRead(widget.conversationId).catchError((_) {});
    Future.microtask(() {
      ref.read(conversationsProvider.notifier).markRead(widget.conversationId);
    });
  }

  @override
  void dispose() {
    _newMessageSub?.cancel();
    _conversationDeletedSub?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final list = await ref
          .read(apiProvider)
          .getMessages(widget.conversationId);
      list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      if (mounted) {
        setState(() {
          _messages = list;
          _loading = false;
        });
        _scrollToBottom(animated: false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
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
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _input.clear();

    final clientMsgId = const Uuid().v4();
    final me = ref.read(authProvider).user;
    final optimistic = Message(
      id: clientMsgId,
      conversationId: widget.conversationId,
      senderId: me?.id ?? '',
      senderName: me?.displayName,
      senderAvatar: me?.avatar ?? me?.avatarURL,
      content: text,
      type: 'text',
      status: 'sending',
      createdAt: DateTime.now().toIso8601String(),
      clientMsgId: clientMsgId,
    );
    setState(() => _messages = [..._messages, optimistic]);
    _scrollToBottom();

    try {
      await ref
          .read(apiProvider)
          .sendMessage(widget.conversationId, text, clientMsgId: clientMsgId);
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages = _messages
              .map(
                (m) => m.clientMsgId == clientMsgId
                    ? m.copyWith(status: 'failed')
                    : m,
              )
              .toList();
        });
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Send failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(authProvider).user;
    final convsState = ref.watch(conversationsProvider);
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
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary,
                      ),
                    )
                  : MessageList(
                      conversation: conversation,
                      messages: _messages,
                      user: me,
                      scrollController: _scroll,
                    ),
            ),
            MessageComposer(
              controller: _input,
              sending: _sending,
              onSend: _send,
            ),
          ],
        ),
      ),
    );
  }
}
