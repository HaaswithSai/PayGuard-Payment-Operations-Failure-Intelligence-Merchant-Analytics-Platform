/**
 * Async Handler Wrapper
 * Eliminates boilerplate try/catch blocks in Express route handlers and middleware.
 * Any rejected promise or thrown exception is automatically forwarded to next(err).
 *
 * @param {Function} fn - Async express route handler (req, res, next)
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
