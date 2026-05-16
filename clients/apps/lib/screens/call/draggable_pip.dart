import 'package:flutter/material.dart';

/// Wraps a child as a free-floating, draggable element inside a Stack.
/// Position is CONTROLLED — parent owns it via [position] + [onChange] so
/// it survives rebuilds/minimize cycles.
class DraggablePip extends StatefulWidget {
  final Offset? position;
  final Offset initialOffsetFromCorner;
  final Alignment initialCorner;
  final double width;
  final double height;
  final ValueChanged<Offset> onChange;
  final Widget child;
  final double margin;

  const DraggablePip({
    super.key,
    required this.position,
    required this.width,
    required this.height,
    required this.onChange,
    required this.child,
    this.initialOffsetFromCorner = const Offset(16, 16),
    this.initialCorner = Alignment.topRight,
    this.margin = 8,
  });

  @override
  State<DraggablePip> createState() => _DraggablePipState();
}

class _DraggablePipState extends State<DraggablePip> {
  Offset? _dragPos;

  Offset _resolveInitial(Size canvas) {
    final c = widget.initialCorner;
    final w = widget.width;
    final h = widget.height;
    final dx = widget.initialOffsetFromCorner.dx;
    final dy = widget.initialOffsetFromCorner.dy;
    double x, y;
    if (c == Alignment.topLeft) {
      x = dx; y = dy;
    } else if (c == Alignment.topRight) {
      x = canvas.width - w - dx; y = dy;
    } else if (c == Alignment.bottomLeft) {
      x = dx; y = canvas.height - h - dy;
    } else {
      x = canvas.width - w - dx; y = canvas.height - h - dy;
    }
    return _clamp(Offset(x, y), canvas);
  }

  Offset _clamp(Offset p, Size canvas) {
    final maxX = (canvas.width - widget.width - widget.margin).clamp(widget.margin, double.infinity);
    final maxY = (canvas.height - widget.height - widget.margin).clamp(widget.margin, double.infinity);
    return Offset(
      p.dx.clamp(widget.margin, maxX),
      p.dy.clamp(widget.margin, maxY),
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final canvas = Size(constraints.maxWidth, constraints.maxHeight);
        final base = widget.position ?? _resolveInitial(canvas);
        final pos = _dragPos != null ? _clamp(_dragPos!, canvas) : _clamp(base, canvas);

        // Schedule write-back if initial resolution changed the value, but only
        // when no controlled position exists yet — avoid loops.
        if (widget.position == null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) widget.onChange(pos);
          });
        }

        return Stack(
          children: [
            Positioned(
              left: pos.dx,
              top: pos.dy,
              child: GestureDetector(
                onPanStart: (_) {
                  _dragPos = pos;
                },
                onPanUpdate: (d) {
                  setState(() {
                    _dragPos = _clamp((_dragPos ?? pos) + d.delta, canvas);
                  });
                },
                onPanEnd: (_) {
                  if (_dragPos != null) {
                    widget.onChange(_dragPos!);
                    _dragPos = null;
                  }
                },
                child: SizedBox(
                  width: widget.width,
                  height: widget.height,
                  child: widget.child,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
