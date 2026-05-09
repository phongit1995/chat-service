String formatLastActive(String? iso) {
  if (iso == null || iso.isEmpty) return 'Offline';
  final t = DateTime.tryParse(iso);
  if (t == null) return 'Offline';

  final diff = DateTime.now().toUtc().difference(t.toUtc());
  if (diff.isNegative || diff.inSeconds < 60) return 'Active just now';

  final mins = diff.inMinutes;
  if (mins < 60) return 'Active ${mins}m ago';

  final hrs = diff.inHours;
  if (hrs < 24) return 'Active ${hrs}h ago';

  return 'Offline';
}
