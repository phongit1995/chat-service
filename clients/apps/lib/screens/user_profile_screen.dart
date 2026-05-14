import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../theme/app_colors.dart';
import '../theme/app_gradients.dart';
import '../theme/app_typography.dart';
import '../theme/widgets.dart';
import '../utils/toast.dart';

class UserProfileScreen extends ConsumerStatefulWidget {
  final String userId;
  final String? initialDisplayName;
  final String? initialAvatar;

  const UserProfileScreen({
    super.key,
    required this.userId,
    this.initialDisplayName,
    this.initialAvatar,
  });

  @override
  ConsumerState<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends ConsumerState<UserProfileScreen> {
  UserPublicProfile? _profile;
  bool _loading = true;
  String? _error;
  bool _startingChat = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await ref.read(userServiceProvider).getUserInfo(widget.userId);
      if (mounted) setState(() { _profile = profile; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = 'Failed to load profile'; _loading = false; });
    }
  }

  Future<void> _startChat() async {
    setState(() => _startingChat = true);
    try {
      final conv = await ref.read(conversationServiceProvider).createDirectConversation(widget.userId);
      await ref.read(conversationsRawProvider.notifier).reload();
      if (!mounted) return;
      context.pop();
      context.push('/chat/${conv.id}', extra: conv);
    } catch (e) {
      if (mounted) {
        setState(() => _startingChat = false);
        showErrorToast('Failed to start chat');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: _loading
          ? _buildLoading()
          : _error != null
              ? _buildError()
              : _buildProfile(),
    );
  }

  Widget _buildLoading() {
    final name = widget.initialDisplayName ?? '';
    final avatar = widget.initialAvatar;

    return CustomScrollView(
      slivers: [
        _buildSliverAppBar(name: name, avatarUrl: avatar, isOnline: false),
        SliverFillRemaining(
          child: Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
        ),
      ],
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline_rounded, size: 48, color: AppColors.textTertiary),
          const SizedBox(height: 12),
          Text(_error!, style: AppTypography.bodyMd.copyWith(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          TextButton(onPressed: _loadProfile, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildProfile() {
    final p = _profile!;
    return CustomScrollView(
      slivers: [
        _buildSliverAppBar(name: p.displayName, avatarUrl: p.avatar, isOnline: p.isOnline),
        SliverPadding(
          padding: const EdgeInsets.all(20),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              _buildStatusChip(p),
              const SizedBox(height: 20),
              if (p.bio != null && p.bio!.isNotEmpty) ...[
                _buildSection(
                  icon: Icons.info_outline_rounded,
                  label: 'Bio',
                  child: Text(p.bio!, style: AppTypography.bodyMd.copyWith(color: AppColors.textSecondary)),
                ),
                const SizedBox(height: 16),
              ],
              _buildSection(
                icon: Icons.alternate_email_rounded,
                label: 'Username',
                child: Text('@${p.username}', style: AppTypography.bodyMd.copyWith(color: AppColors.textPrimary)),
              ),
              const SizedBox(height: 16),
              if (p.createdAt != null) ...[
                _buildSection(
                  icon: Icons.calendar_today_rounded,
                  label: 'Member since',
                  child: Text(_formatDate(p.createdAt!), style: AppTypography.bodyMd.copyWith(color: AppColors.textSecondary)),
                ),
                const SizedBox(height: 16),
              ],
              if (!p.isOnline && p.lastActiveAt != null && p.lastActiveAt!.isNotEmpty) ...[
                _buildSection(
                  icon: Icons.access_time_rounded,
                  label: 'Last seen',
                  child: Text(_formatLastActive(p.lastActiveAt!), style: AppTypography.bodyMd.copyWith(color: AppColors.textSecondary)),
                ),
                const SizedBox(height: 16),
              ],
              const SizedBox(height: 8),
              GradientButton(
                onPressed: _startingChat ? null : _startChat,
                loading: _startingChat,
                fullWidth: true,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.chat_bubble_outline_rounded, size: 18, color: Colors.white),
                    const SizedBox(width: 8),
                    Text('Send Message', style: AppTypography.bodyMd.copyWith(color: Colors.white, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildSliverAppBar({required String name, String? avatarUrl, required bool isOnline}) {
    return SliverAppBar(
      expandedHeight: 220,
      pinned: true,
      backgroundColor: AppColors.bgSurface,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded),
        onPressed: () => context.pop(),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          children: [
            Container(
              decoration: BoxDecoration(gradient: AppGradients.signature),
            ),
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 28,
                decoration: BoxDecoration(
                  color: AppColors.bgBase,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                ),
              ),
            ),
            Positioned(
              bottom: 4,
              left: 0,
              right: 0,
              child: Column(
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        width: 88,
                        height: 88,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: AppGradients.signature,
                          boxShadow: AppShadows.glowGradient,
                        ),
                        padding: const EdgeInsets.all(3),
                        child: ClipOval(
                          child: avatarUrl != null && avatarUrl.isNotEmpty
                              ? Image.network(avatarUrl, fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => _avatarInitials(name))
                              : _avatarInitials(name),
                        ),
                      ),
                      if (isOnline)
                        Positioned(
                          right: 2,
                          bottom: 2,
                          child: Container(
                            width: 18,
                            height: 18,
                            decoration: BoxDecoration(
                              color: AppColors.success,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2.5),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    name,
                    style: AppTypography.h3.copyWith(color: AppColors.textPrimary),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _avatarInitials(String name) {
    final trimmed = name.trim();
    final parts = trimmed.split(RegExp(r'\s+'));
    final initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : trimmed.isEmpty ? '?' : trimmed[0].toUpperCase();

    return Container(
      color: AppColors.primary.withValues(alpha: 0.15),
      alignment: Alignment.center,
      child: Text(initials, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 32)),
    );
  }

  Widget _buildStatusChip(UserPublicProfile p) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: p.isOnline ? AppColors.success.withValues(alpha: 0.12) : AppColors.bgOverlay,
          borderRadius: BorderRadius.circular(AppRadius.full),
          border: Border.all(
            color: p.isOnline ? AppColors.success.withValues(alpha: 0.4) : AppColors.line,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: p.isOnline ? AppColors.success : AppColors.textTertiary,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              p.isOnline ? 'Online' : 'Offline',
              style: AppTypography.small.copyWith(
                color: p.isOnline ? AppColors.success : AppColors.textTertiary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({required IconData icon, required String label, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.lineSubtle),
        boxShadow: AppShadows.sm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppColors.textTertiary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: AppTypography.small.copyWith(color: AppColors.textTertiary)),
                const SizedBox(height: 3),
                child,
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return iso;
    }
  }

  String _formatLastActive(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return _formatDate(iso);
    } catch (_) {
      return iso;
    }
  }
}
