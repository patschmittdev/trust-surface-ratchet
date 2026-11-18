// Boundary concern: changing this list changes which session authority
// classes can cross from a caller into the imaginary worker policy.
export const SESSION_AUTHORITY_VALUES = Object.freeze(["read", "write"]);
