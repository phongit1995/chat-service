enum MessageType {
  text('text'),
  image('image'),
  file('file'),
  video('video'),
  audio('audio'),
  unknown('');

  final String value;
  const MessageType(this.value);

  static MessageType fromValue(String? raw) {
    switch (raw) {
      case 'text':
        return MessageType.text;
      case 'image':
        return MessageType.image;
      case 'file':
        return MessageType.file;
      case 'video':
        return MessageType.video;
      case 'audio':
        return MessageType.audio;
      default:
        return MessageType.unknown;
    }
  }
}
