// Test stub for 'aws-amplify/utils'.
//
// shared/ is a source-only package: the consuming apps install aws-amplify,
// shared's own devDependencies do not. `stores/user.js` calls `Hub.listen(...)`
// unconditionally at module scope, so the bare specifier must resolve to
// something callable even when nothing under test cares about auth events.
export const Hub = {
    listen: () => () => undefined, // returns a no-op unsubscribe function
};
