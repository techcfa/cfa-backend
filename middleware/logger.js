const SENSITIVE_KEYS = ['password', 'otp', 'token', 'authorization'];

function redactSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      clone[key] = '***redacted***';
    } else if (val && typeof val === 'object') {
      clone[key] = redactSensitive(val);
    } else {
      clone[key] = val;
    }
  }
  return clone;
}

function requestLogger(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const start = Date.now();
  const { method } = req;
  const url = req.originalUrl || req.url;

  const safeBody = redactSensitive(req.body);
  const safeQuery = redactSensitive(req.query);

  // Incoming log
  console.log(`→ ${method} ${url}`, Object.keys(safeQuery).length ? { query: safeQuery } : '', Object.keys(safeBody).length ? { body: safeBody } : '');

  res.on('finish', () => {
    const ms = Date.now() - start;
    const userId = req.user?.id || req.user?._id || req.admin?.id || req.admin?._id;
    console.log(`← ${method} ${url} ${res.statusCode} ${ms}ms${userId ? ` [uid:${userId}]` : ''}`);
  });

  next();
}

module.exports = { requestLogger };