import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/call.dart';
import '../../providers/call_provider.dart';

class CallButton extends ConsumerWidget {
  final String conversationId;
  final CallerBrief peer;

  const CallButton({super.key, required this.conversationId, required this.peer});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(callProvider.select((s) => s.mode));
    final busy = mode != CallMode.idle;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _IconBtn(
          icon: Icons.call_rounded,
          tooltip: 'Voice call',
          disabled: busy,
          onTap: () => ref
              .read(callProvider.notifier)
              .startCall(conversationId, CallType.audio, peer),
        ),
        _IconBtn(
          icon: Icons.videocam_rounded,
          tooltip: 'Video call',
          disabled: busy,
          onTap: () => ref
              .read(callProvider.notifier)
              .startCall(conversationId, CallType.video, peer),
        ),
      ],
    );
  }
}

class _IconBtn extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final bool disabled;
  final VoidCallback onTap;
  const _IconBtn({
    required this.icon,
    required this.tooltip,
    required this.disabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: tooltip,
      onPressed: disabled ? null : onTap,
      icon: Icon(icon),
      iconSize: 22,
      color: Theme.of(context).colorScheme.onSurface,
    );
  }
}
