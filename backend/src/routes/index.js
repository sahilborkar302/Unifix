const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize, userFromToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const events = require('../services/events');

const auth = require('../controllers/authController');
const labs = require('../controllers/labController');
const computers = require('../controllers/computerController');
const complaints = require('../controllers/complaintController');
const notifications = require('../controllers/notificationController');
const users = require('../controllers/userController');
const dashboard = require('../controllers/dashboardController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

router.get('/health', (_req, res) => res.json({ ok: true, app: 'UNIFIX' }));

/* ---- Auth ---- */
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.get('/auth/me', protect, auth.me);
router.put('/auth/profile', protect, auth.updateProfile);
router.put('/auth/password', protect, auth.changePassword);

/* ---- Public: labs / PCs / stats (read-only) ---- */
router.get('/stats', dashboard.publicStats);
router.get('/labs', labs.list);
router.get('/labs/:id', labs.get);
router.get('/computers/:id', computers.get);

/* ---- Admin: lab + PC management ---- */
router.post('/labs', protect, authorize('admin'), labs.create);
router.put('/labs/:id', protect, authorize('admin'), labs.update);
router.delete('/labs/:id', protect, authorize('admin'), labs.remove);
router.post('/labs/:id/computers', protect, authorize('admin'), labs.addComputer);
router.patch('/computers/:id', protect, authorize('admin'), computers.edit);
router.delete('/computers/:id', protect, authorize('admin'), computers.remove);
router.patch('/computers/:id/status', protect, authorize('admin', 'technician'), computers.updateStatus);

/* ---- Complaints ---- */
router.post('/complaints', protect, authorize('student'), upload.single('image'), complaints.create);
router.get('/complaints', protect, complaints.list);
router.get('/complaints/:id', protect, complaints.get);
router.patch('/complaints/:id/assign', protect, authorize('admin'), complaints.assign);
router.patch('/complaints/:id/priority', protect, authorize('admin'), complaints.setPriority);
router.patch('/complaints/:id/reject', protect, authorize('admin'), complaints.reject);
router.patch('/complaints/:id/start', protect, authorize('technician', 'admin'), complaints.start);
router.patch('/complaints/:id/notes', protect, authorize('technician', 'admin'), complaints.notes);
router.patch('/complaints/:id/resolve', protect, authorize('technician', 'admin'), complaints.resolve);

/* ---- Notifications ---- */
router.get('/notifications', protect, notifications.list);
router.patch('/notifications/read-all', protect, notifications.markAllRead);
router.patch('/notifications/:id/read', protect, notifications.markRead);
router.delete('/notifications', protect, notifications.clearAll);

/* ---- Admin: users + dashboard ---- */
router.get('/users/technicians', protect, authorize('admin'), users.technicians);
router.get('/users', protect, authorize('admin'), users.list);
router.post('/users', protect, authorize('admin'), users.create);
router.patch('/users/:id', protect, authorize('admin'), users.update);
router.get('/dashboard/admin', protect, authorize('admin'), dashboard.adminDashboard);

/* ---- Live updates (Server-Sent Events). Token is optional: guests get public PC updates only ---- */
router.get('/events', async (req, res) => {
  let user = null;
  if (req.query.token) {
    try { user = await userFromToken(String(req.query.token)); } catch { user = null; }
  }
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write(`event: connected\ndata: {}\n\n`);
  const id = events.addClient(res, user);
  req.on('close', () => events.removeClient(id));
});

module.exports = router;
