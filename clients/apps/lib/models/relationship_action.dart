enum RelationshipAction {
  send('send'),
  accept('accept'),
  reject('reject'),
  cancel('cancel'),
  unfriend('unfriend'),
  block('block'),
  unblock('unblock');

  final String value;
  const RelationshipAction(this.value);
}

enum RespondAction {
  accept('accept'),
  reject('reject');

  final String value;
  const RespondAction(this.value);
}
