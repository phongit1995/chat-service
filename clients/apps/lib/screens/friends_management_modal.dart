import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/relationship.dart';
import '../models/relationship_action.dart';
import '../providers/providers.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../theme/widgets.dart';
import '../utils/toast.dart';
import 'user_profile_screen.dart';

Future<void> showFriendsManagementModal(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    useSafeArea: true,
    builder: (_) => const FractionallySizedBox(
      heightFactor: 0.92,
      child: ClipRRect(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        child: _FriendsManagementSheet(),
      ),
    ),
  );
}

class _FriendsManagementSheet extends ConsumerStatefulWidget {
  const _FriendsManagementSheet();

  @override
  ConsumerState<_FriendsManagementSheet> createState() => _SheetState();
}

class _SheetState extends ConsumerState<_FriendsManagementSheet>
    with SingleTickerProviderStateMixin {
  late final TabController _ctrl;
  static const _tabs = FriendsMgmtTab.values;

  @override
  void initState() {
    super.initState();
    _ctrl = TabController(length: _tabs.length, vsync: this);
    Future.microtask(() {
      if (!mounted) return;
      ref.read(friendsManagementProvider.notifier).loadTab(_tabs.first);
    });
    _ctrl.addListener(() {
      if (_ctrl.indexIsChanging) return;
      ref.read(friendsManagementProvider.notifier).loadTab(_tabs[_ctrl.index]);
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  String _labelOf(FriendsMgmtTab t) => switch (t) {
        FriendsMgmtTab.requests => 'Requests',
        FriendsMgmtTab.sent => 'Sent',
        FriendsMgmtTab.blocked => 'Blocked',
      };

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(friendsManagementProvider);
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: Column(
        children: [
          _Header(onClose: () => Navigator.of(context).maybePop()),
          Container(
            color: AppColors.bgSurface,
            child: TabBar(
              controller: _ctrl,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              indicatorWeight: 2.5,
              labelStyle: AppTypography.bodyMd.copyWith(fontWeight: FontWeight.w600),
              unselectedLabelStyle: AppTypography.bodyMd,
              tabs: [
                for (final t in _tabs)
                  Tab(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_labelOf(t)),
                        if (state.sliceOf(t).total > 0) ...[
                          const SizedBox(width: 6),
                          _Badge(count: state.sliceOf(t).total),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _ctrl,
              children: const [
                _RequestsList(),
                _SentList(),
                _BlockedList(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final VoidCallback onClose;
  const _Header({required this.onClose});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
      decoration: const BoxDecoration(
        color: AppColors.bgSurface,
        border: Border(bottom: BorderSide(color: AppColors.lineSubtle)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text('Manage friends',
                style: AppTypography.h3.copyWith(color: AppColors.textPrimary)),
          ),
          IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: onClose,
            color: AppColors.textSecondary,
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final int count;
  const _Badge({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      constraints: const BoxConstraints(minWidth: 18),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(
        count > 99 ? '99+' : '$count',
        textAlign: TextAlign.center,
        style: AppTypography.small.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _BaseList extends ConsumerWidget {
  final FriendsMgmtTab tab;
  final RelationshipUserInfo? Function(RelationshipResponse) pickUser;
  final List<Widget> Function(RelationshipResponse r, _ActionRunner runner)
      buildActions;
  final String emptyText;
  final String emptySubtitle;

  const _BaseList({
    required this.tab,
    required this.pickUser,
    required this.buildActions,
    required this.emptyText,
    required this.emptySubtitle,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final slice = ref.watch(friendsManagementProvider).sliceOf(tab);
    if (slice.loading && slice.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (slice.error != null && slice.items.isEmpty) {
      return Center(
        child: Text(slice.error!,
            style: AppTypography.bodyMd.copyWith(color: AppColors.textTertiary)),
      );
    }
    if (slice.items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(emptyText,
                  style: AppTypography.bodyMd
                      .copyWith(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Text(emptySubtitle,
                  textAlign: TextAlign.center,
                  style: AppTypography.small.copyWith(color: AppColors.textTertiary)),
            ],
          ),
        ),
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () =>
          ref.read(friendsManagementProvider.notifier).refreshTab(tab),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        itemCount: slice.items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 4),
        itemBuilder: (_, i) {
          final r = slice.items[i];
          final u = pickUser(r);
          if (u == null) return const SizedBox.shrink();
          final runner = _ActionRunner(ref: ref, id: r.id);
          return _Row(
            user: u,
            actions: buildActions(r, runner),
          );
        },
      ),
    );
  }
}

class _ActionRunner {
  final WidgetRef ref;
  final String id;
  _ActionRunner({required this.ref, required this.id});
}

class _Row extends StatelessWidget {
  final RelationshipUserInfo user;
  final List<Widget> actions;
  const _Row({required this.user, required this.actions});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => showUserProfileModal(
          context,
          userId: user.id,
          initialDisplayName: user.displayName,
          initialAvatar: user.avatar,
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              GradientAvatar(
                name: user.displayName,
                imageUrl: user.avatar,
                size: 44,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      '@${user.username}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              ...actions,
            ],
          ),
        ),
      ),
    );
  }
}

class _PendingButton extends ConsumerStatefulWidget {
  final String label;
  final Color color;
  final bool primary;
  final Future<void> Function() onPressed;

  const _PendingButton({
    required this.label,
    required this.color,
    required this.primary,
    required this.onPressed,
  });

  @override
  ConsumerState<_PendingButton> createState() => _PendingButtonState();
}

class _PendingButtonState extends ConsumerState<_PendingButton> {
  bool _loading = false;

  Future<void> _go() async {
    setState(() => _loading = true);
    try {
      await widget.onPressed();
      await ref
          .read(friendsManagementProvider.notifier)
          .refreshAfterAction();
    } catch (_) {
      if (mounted) showErrorToast('Action failed');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final child = _loading
        ? SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: widget.primary ? Colors.white : widget.color,
            ),
          )
        : Text(
            widget.label,
            style: TextStyle(
              color: widget.primary ? Colors.white : widget.color,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          );

    if (widget.primary) {
      return SizedBox(
        height: 32,
        child: ElevatedButton(
          onPressed: _loading ? null : _go,
          style: ElevatedButton.styleFrom(
            backgroundColor: widget.color,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
          ),
          child: child,
        ),
      );
    }
    return SizedBox(
      height: 32,
      child: OutlinedButton(
        onPressed: _loading ? null : _go,
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          side: BorderSide(color: AppColors.line),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
        ),
        child: child,
      ),
    );
  }
}

class _RequestsList extends StatelessWidget {
  const _RequestsList();

  @override
  Widget build(BuildContext context) {
    return _BaseList(
      tab: FriendsMgmtTab.requests,
      pickUser: (r) => r.requester,
      emptyText: 'No pending requests',
      emptySubtitle: 'Friend requests sent to you will appear here.',
      buildActions: (r, runner) => [
        _PendingButton(
          label: 'Accept',
          color: AppColors.primary,
          primary: true,
          onPressed: () => runner.ref
              .read(relationshipServiceProvider)
              .respond(r.id, RespondAction.accept.value),
        ),
        const SizedBox(width: 6),
        _PendingButton(
          label: 'Reject',
          color: AppColors.textSecondary,
          primary: false,
          onPressed: () => runner.ref
              .read(relationshipServiceProvider)
              .respond(r.id, RespondAction.reject.value),
        ),
      ],
    );
  }
}

class _SentList extends StatelessWidget {
  const _SentList();

  @override
  Widget build(BuildContext context) {
    return _BaseList(
      tab: FriendsMgmtTab.sent,
      pickUser: (r) => r.addressee,
      emptyText: 'No sent requests',
      emptySubtitle: 'Friend requests you sent will appear here.',
      buildActions: (r, runner) => [
        _PendingButton(
          label: 'Cancel',
          color: AppColors.textSecondary,
          primary: false,
          onPressed: () =>
              runner.ref.read(relationshipServiceProvider).cancel(r.id),
        ),
      ],
    );
  }
}

class _BlockedList extends StatelessWidget {
  const _BlockedList();

  @override
  Widget build(BuildContext context) {
    return _BaseList(
      tab: FriendsMgmtTab.blocked,
      pickUser: (r) => r.addressee,
      emptyText: 'No blocked users',
      emptySubtitle: 'Users you have blocked appear here.',
      buildActions: (r, runner) => [
        _PendingButton(
          label: 'Unblock',
          color: AppColors.primary,
          primary: true,
          onPressed: () =>
              runner.ref.read(relationshipServiceProvider).unblock(r.id),
        ),
      ],
    );
  }
}
