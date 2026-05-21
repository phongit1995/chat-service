enum ConversationType {
  direct('direct'),
  group('group'),
  unknown('');

  final String value;
  const ConversationType(this.value);

  static ConversationType fromValue(String? raw) {
    switch (raw) {
      case 'direct':
        return ConversationType.direct;
      case 'group':
        return ConversationType.group;
      default:
        return ConversationType.unknown;
    }
  }
}
