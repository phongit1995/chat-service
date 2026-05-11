import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../theme/app_gradients.dart';

class MessageComposer extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  const MessageComposer({
    super.key,
    required this.controller,
    required this.sending,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
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
                controller: controller,
                decoration: const InputDecoration(hintText: 'Type a message…'),
                onSubmitted: (_) => onSend(),
                textInputAction: TextInputAction.send,
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: sending ? null : onSend,
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: sending ? null : AppGradients.signature,
                  color: sending ? AppColors.textDisabled : null,
                  shape: BoxShape.circle,
                  boxShadow: sending ? null : AppShadows.glowGradient,
                ),
                child: const Icon(Icons.send_rounded, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
