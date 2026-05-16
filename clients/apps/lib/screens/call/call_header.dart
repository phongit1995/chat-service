import 'package:flutter/material.dart';

class CallHeader extends StatelessWidget {
  final String name;
  final String statusLabel;
  final bool isVideo;
  final VoidCallback onMinimize;
  final VoidCallback onOpenSettings;

  const CallHeader({
    super.key,
    required this.name,
    required this.statusLabel,
    required this.isVideo,
    required this.onMinimize,
    required this.onOpenSettings,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x99000000), Color(0x4D000000), Colors.transparent],
        ),
      ),
      child: Row(
        children: [
          _IconBtn(
            icon: Icons.expand_more_rounded,
            tooltip: 'Minimize',
            onTap: onMinimize,
          ),
          Expanded(
            child: Column(
              children: [
                Text(
                  name,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    shadows: [
                      Shadow(color: Color(0xCC000000), blurRadius: 4, offset: Offset(0, 1)),
                    ],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  statusLabel,
                  style: const TextStyle(
                    color: Color(0xE6FFFFFF),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          _IconBtn(
            icon: Icons.tune_rounded,
            tooltip: 'Settings',
            onTap: onOpenSettings,
          ),
        ],
      ),
    );
  }
}

class _IconBtn extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  const _IconBtn({required this.icon, required this.tooltip, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.18),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}
