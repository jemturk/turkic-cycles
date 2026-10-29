// Jest stand-in for Sentry (its ESM build doesn't load under Jest). Jest uses a root
// __mocks__ entry for a node_modules package automatically, in every test.
module.exports = {
  init: jest.fn(),
  wrap: (component) => component,
  setUser: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  reactNavigationIntegration: jest.fn(() => ({ registerNavigationContainer: jest.fn() })),
};
