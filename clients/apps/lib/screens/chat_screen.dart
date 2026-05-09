import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../providers/providers.dart';
import '../models/models.dart';
import '../services/socket_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_gradients.dart';
import '../theme/app_typography.dart';
import '../theme/widgets.dart';
import '../utils/relative_time.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String conversationId;
  final Conversation? conversation;
  const ChatScreen({super.key, required this.conversationId, this.conversation});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  List<Message> _messages = [];
  bool _loading = true;
  StreamSubscription<NewMessageEvent>? _sub;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
    Future.microtask(() {
      ref.read(activeConversationProvider.notifier).set(widget.conversationId);
    });
    _sub = ref.read(socketProvider).onNewMessage.listen((event) {
      final m = event.message;
      if (m.conversationId != widget.conversationId) return;
      final idx = _messages.indexWhere((e) =>
          e.id == m.id ||
          (m.clientMsgId != null && e.clientMsgId == m.clientMsgId));
      if (idx >= 0) {
        final updated = [..._messages];
        updated[idx] = m;
        setState(() => _messages = updated);
      } else {
        setState(() => _messages = [..._messages, m]);
        _scrollToBottom();
      }
    });
    ref.read(apiProvider).markAsRead(widget.conversationId).catchError((_) {});
    Future.microtask(() {
      ref.read(conversationsProvider.notifier).markRead(widget.conversationId);
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    _input.dispose();
    _scroll.dispose();
    final notifier = ref.read(activeConversationProvider.notifier);
    if (ref.read(activeConversationProvider) == widget.conversationId) {
      notifier.set(null);
    }
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final list = await ref.read(apiProvider).getMessages(widget.conversationId);
      list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      if (mounted) {
        setState(() {
          _messages = list;
          _loading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
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
              .map((m) => m.clientMsgId == clientMsgId ? m.copyWith(status: 'failed') : m)
              .toList();
        });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Send failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _formatTime(String iso) {
    final t = DateTime.tryParse(iso);
    if (t == null) return '';
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(authProvider).user;
    final convsState = ref.watch(conversationsProvider);
    final liveConv = convsState.value?.firstWhere(
      (c) => c.id == widget.conversationId,
      orElse: () => widget.conversation ?? Conversation(id: widget.conversationId, type: 'direct'),
    );
    final conv = liveConv ?? widget.conversation;
    final title = conv?.displayName ?? 'Chat';
    final isDirect = conv?.type == 'direct';
    final isOnline = isDirect && (conv?.otherUser?.isOnline ?? false);
    final subtitle = isDirect
        ? (isOnline ? 'Active now' : formatLastActive(conv?.otherUser?.lastActiveAt))
        : '${conv?.participantCount ?? 0} members';
    final subtitleColor = isOnline
        ? AppColors.success
        : (isDirect && subtitle.startsWith('Active') ? AppColors.textSecondary : AppColors.textTertiary);

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      appBar: AppBar(
        backgroundColor: AppColors.bgSurface,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary, size: 20),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Row(
          children: [
            Stack(
              children: [
                GradientAvatar(
                  name: title,
                  imageUrl: conv?.avatar,
                  size: 36,
                ),
                if (isOnline)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.bgSurface, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontFamily: AppTypography.display,
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(color: subtitleColor, fontSize: 11, fontWeight: FontWeight.w500),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_outlined, color: AppColors.textSecondary),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.more_horiz_rounded, color: AppColors.textSecondary),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : Builder(builder: (_) {
                    int lastOwnIdx = -1;
                    for (var i = _messages.length - 1; i >= 0; i--) {
                      if (_messages[i].senderId == me?.id) {
                        lastOwnIdx = i;
                        break;
                      }
                    }
                    final convSeen = widget.conversation?.seen ?? false;
                    final isGroup = widget.conversation?.type == 'group';
                    const streakGapMs = 5 * 60 * 1000;
                    return ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      itemCount: _messages.length,
                      itemBuilder: (_, i) {
                        final m = _messages[i];
                        final isMine = m.senderId == me?.id;
                        final tCur = DateTime.tryParse(m.createdAt)?.millisecondsSinceEpoch ?? 0;
                        bool sameAsPrev = false;
                        bool sameAsNext = false;
                        if (i > 0) {
                          final p = _messages[i - 1];
                          final tPrev = DateTime.tryParse(p.createdAt)?.millisecondsSinceEpoch ?? 0;
                          sameAsPrev = p.senderId == m.senderId && (tCur - tPrev) < streakGapMs;
                        }
                        if (i < _messages.length - 1) {
                          final n = _messages[i + 1];
                          final tNext = DateTime.tryParse(n.createdAt)?.millisecondsSinceEpoch ?? 0;
                          sameAsNext = n.senderId == m.senderId && (tNext - tCur) < streakGapMs;
                        }
                        final isFirstInStreak = !sameAsPrev;
                        final isLastInStreak = !sameAsNext;
                        return MessageBubble(
                          content: m.content,
                          isMine: isMine,
                          senderName: isMine ? null : m.senderName,
                          senderAvatar: isMine ? null : m.senderAvatar,
                          time: _formatTime(m.createdAt),
                          status: m.status,
                          isLastOwnMessage: i == lastOwnIdx,
                          conversationSeen: convSeen,
                          isGroup: isGroup,
                          isFirstInStreak: isFirstInStreak,
                          isLastInStreak: isLastInStreak,
                          showTime: isLastInStreak,
                        );
                      },
                    );
                  }),
          ),
          SafeArea(
            top: false,
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.bgSurface,
                border: Border(top: BorderSide(color: AppColors.lineSubtle)),
              ),
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      decoration: const InputDecoration(
                        hintText: 'Type a message…',
                      ),
                      onSubmitted: (_) => _send(),
                      textInputAction: TextInputAction.send,
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _sending ? null : _send,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        gradient: _sending ? null : AppGradients.signature,
                        color: _sending ? AppColors.textDisabled : null,
                        shape: BoxShape.circle,
                        boxShadow: _sending ? null : AppShadows.glowGradient,
                      ),
                      child: const Icon(Icons.send_rounded, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
