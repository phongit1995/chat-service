enum UserStatus {
  online('online'),
  away('away'),
  busy('busy'),
  offline('offline'),
  unknown('');

  final String value;
  const UserStatus(this.value);

  static UserStatus fromValue(String? raw) {
    if (raw == null) return UserStatus.unknown;
    for (final s in UserStatus.values) {
      if (s.value == raw) return s;
    }
    return UserStatus.unknown;
  }
}
