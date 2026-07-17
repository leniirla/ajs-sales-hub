import { app } from '../server/app';

// Vercel's Node.js runtime invokes an exported Express app directly as the
// request handler for every /api/* request (see vercel.json rewrites).
export default app;
