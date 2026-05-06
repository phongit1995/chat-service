import 'package:flutter/material.dart';

class AppGradients {
  AppGradients._();

  static const LinearGradient signature = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFFEDA77),
      Color(0xFFF58529),
      Color(0xFFDD2A7B),
      Color(0xFF8134AF),
      Color(0xFF515BD4),
    ],
    stops: [0.0, 0.25, 0.5, 0.75, 1.0],
  );

  static const LinearGradient warm = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFEDA77), Color(0xFFF58529), Color(0xFFDD2A7B)],
  );

  static const LinearGradient cool = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFDD2A7B), Color(0xFF8134AF), Color(0xFF515BD4)],
  );

  static const LinearGradient soft = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFF1E6), Color(0xFFFFE0EC), Color(0xFFF0E6FF)],
  );
}

class AppShadows {
  AppShadows._();

  static List<BoxShadow> soft(double opacity) => [
        BoxShadow(
          color: const Color(0xFFDD2A7B).withValues(alpha: opacity * 0.5),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 4,
          offset: const Offset(0, 2),
        ),
      ];

  static const List<BoxShadow> sm = [
    BoxShadow(color: Color(0x0FDD2A7B), blurRadius: 3, offset: Offset(0, 1)),
    BoxShadow(color: Color(0x0A000000), blurRadius: 2, offset: Offset(0, 1)),
  ];

  static const List<BoxShadow> md = [
    BoxShadow(color: Color(0x14DD2A7B), blurRadius: 12, offset: Offset(0, 4)),
    BoxShadow(color: Color(0x0A000000), blurRadius: 4, offset: Offset(0, 2)),
  ];

  static const List<BoxShadow> lg = [
    BoxShadow(color: Color(0x1FDD2A7B), blurRadius: 24, offset: Offset(0, 8)),
    BoxShadow(color: Color(0x0F000000), blurRadius: 8, offset: Offset(0, 4)),
  ];

  static const List<BoxShadow> glowGradient = [
    BoxShadow(color: Color(0x59DD2A7B), blurRadius: 24, offset: Offset(0, 8)),
    BoxShadow(color: Color(0x40F58529), blurRadius: 12, offset: Offset(0, 4)),
  ];
}
