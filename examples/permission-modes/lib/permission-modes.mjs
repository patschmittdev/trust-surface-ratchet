// Permission modes for an imaginary service. Consumers in a real adopter
// would need to reject values outside this canonical list.
//
// Boundary concern: adding a mode can widen what a request is allowed to
// do. Object.freeze makes this top-level array reject runtime mutation.
// The associated pinned-list test makes an edit to its expected contents
// visible, while the gate checks that this export remains categorized and
// associated with a test file that looks like it pins the list. Reviewers
// still decide whether the values and consumers are safe.
export const PERMISSION_MODE_VALUES = Object.freeze(["safe", "operator"]);
