import cron from 'node-cron';
import { db } from '../database/connection';
import { emailService } from '../services/emailService';

cron.schedule('0 0 * * *', async () => {
  const disputes = await db('disputes')
    .whereIn('status', ['open', 'under_review'])
    .where('updated_at', '<', db.raw('NOW() - INTERVAL 7 DAY'))
    .select('id', 'arbitrator_id', 'initiator_email', 'counterparty_email');

  for (const dispute of disputes) {
    const arbitrator = await db('api_keys').where('id', dispute.arbitrator_id).first();
    if (arbitrator) {
      await emailService.sendEmail({
        email: arbitrator.email,
        subject: 'Dispute Action Required',
        message: `Dispute ${dispute.id} has had no activity for 7 days. Please review.`,
      });
    }
  }
});