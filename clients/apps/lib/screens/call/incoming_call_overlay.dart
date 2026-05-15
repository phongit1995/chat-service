import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/call.dart';
import '../../providers/call_provider.dart';
import '../../theme/widgets.dart';

/// Floating incoming-call popup pinned to the top of the screen. Mounted
/// globally at app root so it appears regardless of current route.
class IncomingCallOverlay extends ConsumerWidget {
  const IncomingCallOverlay({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(callProvider);
    if (state.mode != CallMode.incoming || state.incoming == null) {
      return const SizedBox.shrink();
    }

    final incoming = state.incoming!;
    final caller = incoming.caller;
    final isVideo = incoming.callType == CallType.video;

    return SafeArea(
      child: Align(
        alignment: Alignment.topRight,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Material(
            color: Colors.transparent,
            child: Container(
              width: 320,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF1E293B), Color(0xFF1E1B4B)],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x66000000),
                    blurRadius: 24,
                    offset: Offset(0, 12),
                  ),
                ],
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Incoming ${isVideo ? "video" : "voice"} call',
                    style: const TextStyle(
                      color: Color(0xCCFFFFFF),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  GradientAvatar(
                    imageUrl: caller.avatar,
                    name: caller.displayName,
                    size: 72,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    caller.displayName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (caller.username != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      '@${caller.username}',
                      style: const TextStyle(
                        color: Color(0x99FFFFFF),
                        fontSize: 12,
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _RoundButton(
                        color: const Color(0xFFEF4444),
                        icon: Icons.call_end_rounded,
                        label: 'Decline',
                        onTap: () =>
                            ref.read(callProvider.notifier).declineIncoming(),
                      ),
                      _RoundButton(
                        color: const Color(0xFF22C55E),
                        icon: isVideo
                            ? Icons.videocam_rounded
                            : Icons.call_rounded,
                        label: 'Accept',
                        pulse: true,
                        onTap: () =>
                            ref.read(callProvider.notifier).answerIncoming(),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String label;
  final bool pulse;
  final VoidCallback onTap;
  const _RoundButton({
    required this.color,
    required this.icon,
    required this.label,
    required this.onTap,
    this.pulse = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.5),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xB3FFFFFF),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
