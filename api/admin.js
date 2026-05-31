function isAuthorized(req) {
  const configuredSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.headers['x-admin-secret'];

  return Boolean(configuredSecret && providedSecret && providedSecret === configuredSecret);
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  return res.status(200).json({ ok: true });
}
