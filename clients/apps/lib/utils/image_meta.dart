import 'dart:convert';

class ImageMetadata {
  final String url;
  final String? mimeType;
  final int? size;
  final int? width;
  final int? height;
  final String? fileName;
  final String? localPath;

  ImageMetadata({
    required this.url,
    this.mimeType,
    this.size,
    this.width,
    this.height,
    this.fileName,
    this.localPath,
  });

  factory ImageMetadata.fromJson(Map<String, dynamic> json) => ImageMetadata(
    url: json['url'] as String? ?? '',
    mimeType: json['mimeType'] as String?,
    size: (json['size'] as num?)?.toInt(),
    width: (json['width'] as num?)?.toInt(),
    height: (json['height'] as num?)?.toInt(),
    fileName: json['fileName'] as String?,
    localPath: json['_localPath'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'url': url,
    if (mimeType != null) 'mimeType': mimeType,
    if (size != null) 'size': size,
    if (width != null) 'width': width,
    if (height != null) 'height': height,
    if (fileName != null) 'fileName': fileName,
    if (localPath != null) '_localPath': localPath,
  };

  static ImageMetadata? parse(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      final m = jsonDecode(raw) as Map<String, dynamic>;
      return ImageMetadata.fromJson(m);
    } catch (_) {
      return null;
    }
  }
}
