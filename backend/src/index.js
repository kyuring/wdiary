import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.js';
import couplesRouter from './routes/couples.js';
import checklistRouter from './routes/checklist.js';
import budgetRouter from './routes/budget.js';
import venuesRouter from './routes/venues.js';
import placesRouter from './routes/places.js';
import sangyeonryeRouter from './routes/sangyeonrye.js';
import vendorsRouter from './routes/vendors.js';
import honeymoonRouter from './routes/honeymoon.js';
import guestsRouter from './routes/guests.js';
import invitationRouter from './routes/invitation.js';
import styleRouter from './routes/style.js';
import weddingDayRouter from './routes/weddingDay.js';
import communityRouter from './routes/community.js';
import guideContentRouter from './routes/guideContent.js';
import adminRouter from './routes/admin.js';
import announcementsRouter from './routes/announcements.js';
import inquiriesRouter from './routes/inquiries.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/couples', couplesRouter);
app.use('/api/checklist', checklistRouter);
app.use('/api/budget', budgetRouter);
app.use('/api/venues', venuesRouter);
app.use('/api/places', placesRouter);
app.use('/api/sangyeonrye', sangyeonryeRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/honeymoon', honeymoonRouter);
app.use('/api/guests', guestsRouter);
app.use('/api/invitation', invitationRouter);
app.use('/api/style', styleRouter);
app.use('/api/wedding-day', weddingDayRouter);
app.use('/api/community', communityRouter);
app.use('/api/guide-content', guideContentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/inquiries', inquiriesRouter);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
