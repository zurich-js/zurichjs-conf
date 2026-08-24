/**
 * Empty module stub for Turbopack browser builds.
 *
 * Node.js built-in modules (fs, path, etc.) cannot be bundled for the browser.
 * When a library like barcode-detector contains Node.js detection code that
 * references these modules, Turbopack's static analysis tries to resolve them
 * even though they're never actually called in a browser context.
 *
 * This empty stub satisfies the resolver without shipping any Node.js code.
 */
module.exports = {};
