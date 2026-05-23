enum MessageStatus {
  sending('sending'),
  uploading('uploading'),
  sent('sent'),
  failed('failed'),
  unknown('');

  final String value;
  const MessageStatus(this.value);

  static MessageStatus fromValue(String? raw) {
    switch (raw) {
      case 'sending':
        return MessageStatus.sending;
      case 'uploading':
        return MessageStatus.uploading;
      case 'sent':
        return MessageStatus.sent;
      case 'failed':
        return MessageStatus.failed;
      default:
        return MessageStatus.unknown;
    }
  }
}
