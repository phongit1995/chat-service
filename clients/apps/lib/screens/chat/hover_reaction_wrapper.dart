import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../../utils/reactions.dart';

class HoverReactionWrapper extends StatefulWidget {
  final Widget child;
  final bool isMine;
  final bool enabled;
  final Set<String> myReactedTypes;
  final Future<void> Function(String type)? onReact;

  const HoverReactionWrapper({
    super.key,
    required this.child,
    required this.isMine,
    this.enabled = true,
    this.myReactedTypes = const {},
    this.onReact,
  });

  @override
  State<HoverReactionWrapper> createState() => _HoverReactionWrapperState();
}

class _HoverReactionWrapperState extends State<HoverReactionWrapper> {
  bool _hover = false;

  bool get _isDesktop {
    if (kIsWeb) return false;
    return Platform.isMacOS || Platform.isWindows || Platform.isLinux;
  }

  Widget _buildBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.lineSubtle),
        boxShadow: const [BoxShadow(blurRadius: 8, color: Colors.black12)],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: reactionTypes.map((type) {
          final mine = widget.myReactedTypes.contains(type);
          return GestureDetector(
            onTap: () => widget.onReact?.call(type),
            child: Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              margin: const EdgeInsets.symmetric(horizontal: 1),
              decoration: BoxDecoration(
                color: mine ? AppColors.primary100 : Colors.transparent,
                shape: BoxShape.circle,
              ),
              child: Text(reactionEmoji[type] ?? '',
                  style: const TextStyle(fontSize: 18)),
            ),
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled || !_isDesktop || widget.onReact == null) {
      return widget.child;
    }
    return MouseRegion(
      opaque: false,
      hitTestBehavior: HitTestBehavior.translucent,
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          widget.child,
          if (_hover)
            Positioned(
              top: -36,
              left: widget.isMine ? null : 40,
              right: widget.isMine ? 8 : null,
              child: MouseRegion(
                onEnter: (_) => setState(() => _hover = true),
                child: _buildBar(),
              ),
            ),
        ],
      ),
    );
  }
}
