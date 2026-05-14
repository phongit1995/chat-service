import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../models/models.dart';
import '../models/requests.dart';
import '../providers/providers.dart';
import '../theme/app_colors.dart';
import '../theme/app_gradients.dart';
import '../theme/app_typography.dart';
import '../utils/toast.dart';
import '../theme/widgets.dart';
import 'change_password_screen.dart';

class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _fullName = TextEditingController();
  final _bio = TextEditingController();
  final _phone = TextEditingController();

  XFile? _pickedImage;
  String? _uploadedAvatarUrl;
  bool _uploading = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    if (user != null) _populateFields(user);
  }

  void _populateFields(User user) {
    _fullName.text = user.fullName ?? '';
    _bio.text = user.bio ?? '';
    _phone.text = user.phone ?? '';
  }

  @override
  void dispose() {
    _fullName.dispose();
    _bio.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (picked == null || !mounted) return;

    setState(() {
      _pickedImage = picked;
      _uploading = true;
    });

    try {
      final result = await ref
          .read(userServiceProvider)
          .uploadAvatar(picked.path);
      setState(() {
        _uploadedAvatarUrl = result.secureUrl;
        _uploading = false;
      });
    } catch (e) {
      showErrorToast('Failed to upload image. Please try again.');
      setState(() {
        _pickedImage = null;
        _uploading = false;
      });
    }
  }

  Future<void> _save() async {
    final fullName = _fullName.text.trim();
    final bio = _bio.text.trim();
    final phone = _phone.text.trim();

    if (fullName.isEmpty && bio.isEmpty && phone.isEmpty && _uploadedAvatarUrl == null) {
      showInfoToast('No changes to save.');
      return;
    }

    setState(() => _saving = true);

    try {
      final req = UpdateProfileRequest(
        fullName: fullName.isNotEmpty ? fullName : null,
        bio: bio.isNotEmpty ? bio : null,
        phone: phone.isNotEmpty ? phone : null,
        avatar: _uploadedAvatarUrl,
      );
      final updatedUser = await ref.read(userServiceProvider).updateProfile(req);
      ref.read(authProvider.notifier).updateUser(updatedUser);
      if (mounted) {
        showSuccessToast('Profile updated successfully!');
        Navigator.of(context).pop();
      }
    } catch (e) {
      final msg = e is Exception ? e.toString().replaceFirst('Exception: ', '') : 'Failed to save profile. Please try again.';
      showErrorToast(msg);
      setState(() {
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final currentAvatarUrl = _uploadedAvatarUrl ?? user?.avatar ?? user?.avatarURL;

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      appBar: AppBar(
        title: const Text('Edit Profile'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            _AvatarPicker(
              currentUrl: currentAvatarUrl,
              pickedFile: _pickedImage,
              uploading: _uploading,
              displayName: user?.displayName ?? '',
              onTap: _uploading || _saving ? null : _pickImage,
            ),
            const SizedBox(height: 32),
            _FieldCard(
              children: [
                _InfoRow(
                  label: 'Username',
                  value: user?.username ?? '',
                  icon: Icons.alternate_email_rounded,
                  readOnly: true,
                ),
                const _Divider(),
                _InfoRow(
                  label: 'Email',
                  value: user?.email ?? '',
                  icon: Icons.email_outlined,
                  readOnly: true,
                ),
              ],
            ),
            const SizedBox(height: 16),
            _FieldCard(
              children: [
                TextField(
                  controller: _fullName,
                  enabled: !_saving,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    prefixIcon: Icon(Icons.person_outline_rounded),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _bio,
                  enabled: !_saving,
                  maxLines: 3,
                  maxLength: 500,
                  decoration: InputDecoration(
                    labelText: 'Bio',
                    prefixIcon: const Icon(Icons.info_outline_rounded),
                    alignLabelWithHint: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      borderSide: const BorderSide(
                        color: AppColors.primary,
                        width: 1.5,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _phone,
                  enabled: !_saving,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            GradientButton(
              onPressed: (_saving || _uploading) ? null : _save,
              loading: _saving,
              fullWidth: true,
              child: const Text('Save Changes'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const ChangePasswordScreen(),
                ),
              ),
              child: const Text(
                'Change Password',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AvatarPicker extends StatelessWidget {
  final String? currentUrl;
  final XFile? pickedFile;
  final bool uploading;
  final String displayName;
  final VoidCallback? onTap;

  const _AvatarPicker({
    this.currentUrl,
    this.pickedFile,
    required this.uploading,
    required this.displayName,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: AppGradients.signature,
              boxShadow: AppShadows.glowGradient,
            ),
            padding: const EdgeInsets.all(3),
            child: ClipOval(
              child: _buildAvatar(),
            ),
          ),
          if (uploading)
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withValues(alpha: 0.4),
              ),
              child: const Center(
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              ),
            )
          else
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  gradient: AppGradients.signature,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: const Icon(
                  Icons.camera_alt_rounded,
                  color: Colors.white,
                  size: 14,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAvatar() {
    if (pickedFile != null) {
      return Image.file(File(pickedFile!.path), fit: BoxFit.cover);
    }
    if (currentUrl != null && currentUrl!.isNotEmpty) {
      return Image.network(
        currentUrl!,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _initials(),
      );
    }
    return _initials();
  }

  Widget _initials() {
    final trimmed = displayName.trim();
    final parts = trimmed.split(RegExp(r'\s+'));
    final initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : trimmed.isEmpty
        ? '?'
        : trimmed.substring(0, trimmed.length >= 2 ? 2 : 1).toUpperCase();

    return Container(
      color: AppColors.primary.withValues(alpha: 0.15),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.w700,
          fontSize: 36,
        ),
      ),
    );
  }
}

class _FieldCard extends StatelessWidget {
  final List<Widget> children;
  const _FieldCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        boxShadow: AppShadows.lg,
        border: Border.all(color: AppColors.lineSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final bool readOnly;

  const _InfoRow({
    required this.label,
    required this.value,
    required this.icon,
    this.readOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.textTertiary),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AppTypography.small),
              const SizedBox(height: 2),
              Text(
                value,
                style: AppTypography.bodyMd.copyWith(
                  color: readOnly ? AppColors.textSecondary : AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return const Divider(color: AppColors.lineSubtle, height: 1);
  }
}
