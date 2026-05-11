import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  AppTypography._();

  static const String display = 'Sora';
  static const String body = 'DM Sans';

  static TextStyle get h1 => GoogleFonts.sora(
    fontSize: 26,
    height: 34 / 26,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  static TextStyle get h2 => GoogleFonts.sora(
    fontSize: 20,
    height: 28 / 20,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );

  static TextStyle get h3 => GoogleFonts.sora(
    fontSize: 18,
    height: 26 / 18,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );

  static TextStyle get bodyLg => GoogleFonts.dmSans(
    fontSize: 16,
    height: 24 / 16,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
  );

  static TextStyle get bodyMd => GoogleFonts.dmSans(
    fontSize: 14,
    height: 20 / 14,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
  );

  static TextStyle get caption => GoogleFonts.dmSans(
    fontSize: 13,
    height: 18 / 13,
    fontWeight: FontWeight.w500,
    color: AppColors.textSecondary,
  );

  static TextStyle get small => GoogleFonts.dmSans(
    fontSize: 12,
    height: 16 / 12,
    fontWeight: FontWeight.w400,
    color: AppColors.textTertiary,
  );

  static TextStyle get tiny => GoogleFonts.dmSans(
    fontSize: 11,
    height: 14 / 11,
    fontWeight: FontWeight.w600,
  );
}

class AppRadius {
  AppRadius._();
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;
  static const full = 9999.0;
}
