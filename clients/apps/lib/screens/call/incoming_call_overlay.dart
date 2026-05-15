import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/call.dart';
import '../../providers/call_provider.dart';
import '../../theme/widgets.dart';

/// Full-screen incoming-call page. Mounted globally at app root so it
/// appears regardless of current route.
///
/// Android uses native CallKit (lock-screen UI) and skips this page.
/// iOS / desktop platforms render this in-app full-screen UI instead.
class IncomingCallOverlay extends ConsumerWidget {
  const IncomingCallOverlay({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(callProvider);
    if (state.mode != CallMode.incoming || state.incoming == null) {
      return const SizedBox.shrink();
    }

    // Android uses CallKit native UI — don't draw anything in-app.
    if (defaultTargetPlatform == TargetPlatform.android) {
      return const SizedBox.shrink();
    }

    final incoming = state.incoming!;
    final caller = incoming.caller;
    final isVideo = incoming.callType == CallType.video;

    return Material(
      color: Colors.transparent,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF020617), Color(0xFF1E1B4B)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 32),
              Text(
                'Incoming ${isVideo ? "video" : "voice"} call',
                style: const TextStyle(
                  color: Color(0xCCFFFFFF),
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 3,
                ),
              ),
              const Spacer(),
              GradientAvatar(
                imageUrl: caller.avatar,
                name: caller.displayName,
                size: 160,
              ),
              const SizedBox(height: 24),
              Text(
                caller.displayName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (caller.username != null) ...[
                const SizedBox(height: 6),
                Text(
                  '@${caller.username}',
                  style: const TextStyle(
                    color: Color(0x99FFFFFF),
                    fontSize: 14,
                  ),
                ),
              ],
              const Spacer(flex: 2),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 32),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _BigActionButton(
                      color: const Color(0xFFEF4444),
                      icon: Icons.call_end_rounded,
                      label: 'Decline',
                      onTap: () =>
                          ref.read(callProvider.notifier).declineIncoming(),
                    ),
                    _BigActionButton(
                      color: const Color(0xFF22C55E),
                      icon: isVideo
                          ? Icons.videocam_rounded
                          : Icons.call_rounded,
                      label: 'Accept',
                      onTap: () =>
                          ref.read(callProvider.notifier).answerIncoming(),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BigActionButton extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _BigActionButton({
    required this.color,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(40),
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.55),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 32),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xCCFFFFFF),
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
