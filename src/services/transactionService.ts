import { db } from '../database/connection';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';

export class TransactionService {
  public async getAllTransactions(params: any) {
    try {
      const { page = '1', limit = '20', status, fromDate, toDate } = params;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Build query
      const query = db('transactions');

      // Add filters
      if (status) {
        query.where({ status });
      }

      if (fromDate) {
        query.where('transaction_date', '>=', fromDate);
      }

      if (toDate) {
        query.where('transaction_date', '<=', toDate);
      }

      // Count total transactions for pagination
      const [count] = await db('transactions').count('id as total');

      // Execute query with pagination
      const transactions = await query
        .select('*')
        .limit(limitNum)
        .offset(offset)
        .orderBy('transaction_date', 'desc');

      return {
        data: transactions,
        pagination: {
          total: parseInt(count.total as string),
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(parseInt(count.total as string) / limitNum),
        },
      };
    } catch (error: any) {
      logger.error('Error getting transactions', { error: error.message });
      throw new HttpError(500, 'Database error while fetching transactions');
    }
  }

  public async getTransactionById(id: string) {
    try {
      const transaction = await db('transactions').where({ id }).first();

      if (!transaction) {
        throw new HttpError(404, 'Transaction not found');
      }

      return transaction;
    } catch (error: any) {
      logger.error('Error getting transaction by ID', { error: error.message, transactionId: id });
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(500, 'Database error while fetching transaction');
    }
  }

  public async createTransaction(transactionData: any) {
    try {
      // Ensure session_id is unique
      const existingTransaction = await db('transactions').where({ session_id: transactionData.session_id }).first();

      if (existingTransaction) {
        throw new HttpError(409, 'Transaction with this session ID already exists');
      }

      // Create transaction
      const [id] = await db('transactions').insert(transactionData);

      return await this.getTransactionById(id.toString());
    } catch (error: any) {
      logger.error('Error creating transaction', { error: error.message });
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(500, 'Database error while creating transaction');
    }
  }

  public async updateTransaction(id: string, transactionData: any) {
    try {
      // Check if transaction exists
      const transaction = await this.getTransactionById(id);

      if (!transaction) {
        throw new HttpError(404, 'Transaction not found');
      }

      // Update transaction
      await db('transactions').where({ id }).update(transactionData);

      return await this.getTransactionById(id);
    } catch (error: any) {
      logger.error('Error updating transaction', { error: error.message, transactionId: id });
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(500, 'Database error while updating transaction');
    }
  }

  public async searchTransactions(searchParams: any) {
    try {
      const {
        session_id,
        source_account_name,
        source_bank,
        beneficiary_account_name,
        beneficiary_bank,
        amount,
        status,
        channel_code,
        destination_node,
        from_date,
        to_date,
        page = '1',
        limit = '20',
      } = searchParams;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Build query
      const query = db('transactions');

      // Add filters
      if (session_id) {
        query.where('session_id', 'like', `%${session_id}%`);
      }

      if (source_account_name) {
        query.where('source_account_name', 'like', `%${source_account_name}%`);
      }

      if (source_bank) {
        query.where('source_bank', 'like', `%${source_bank}%`);
      }

      if (beneficiary_account_name) {
        query.where('beneficiary_account_name', 'like', `%${beneficiary_account_name}%`);
      }

      if (beneficiary_bank) {
        query.where('beneficiary_bank', 'like', `%${beneficiary_bank}%`);
      }

      if (amount) {
        query.where('amount', amount);
      }

      if (status) {
        query.where('status', status);
      }

      if (channel_code) {
        query.where('channel_code', channel_code);
      }

      if (destination_node) {
        query.where('destination_node', destination_node);
      }

      if (from_date) {
        query.where('transaction_date', '>=', from_date);
      }

      if (to_date) {
        query.where('transaction_date', '<=', to_date);
      }

      // Count total matching transactions for pagination
      const countQuery = query.clone();
      const [count] = await countQuery.count('id as total');

      // Execute query with pagination
      const transactions = await query
        .select('*')
        .limit(limitNum)
        .offset(offset)
        .orderBy('transaction_date', 'desc');

      return {
        data: transactions,
        pagination: {
          total: parseInt(count.total as string),
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(parseInt(count.total as string) / limitNum),
        },
      };
    } catch (error: any) {
      logger.error('Error searching transactions', { error: error.message });
      throw new HttpError(500, 'Database error while searching transactions');
    }
  }

  public async getTransactionStats(fromDate?: string, toDate?: string) {
    try {
      const query = db('transactions');

      if (fromDate) {
        query.where('transaction_date', '>=', fromDate);
      }

      if (toDate) {
        query.where('transaction_date', '<=', toDate);
      }

      // Get total transactions
      const [totalCount] = await query.clone().count('id as count');

      // Get transactions by status
      const statusCounts = await query.clone().select('status').count('id as count').groupBy('status');

      // Get total amount
      const [totalAmount] = await query.clone().sum('amount as total');

      // Get average transaction amount
      const [avgAmount] = await query.clone().avg('amount as avg');

      // Calculate success rate
      const successCount = parseInt(statusCounts.find((s) => s.status === 'completed')?.count as string) || 0;
      const failedCount = parseInt(statusCounts.find((s) => s.status === 'failed')?.count as string) || 0;
      const disputedCount = parseInt(statusCounts.find((s) => s.status === 'disputed')?.count as string) || 0;
      const total = parseInt(totalCount.count as string);

      const successRate = total > 0 ? (successCount / total) * 100 : 0;

      return {
        totalTransactions: total,
        totalAmount: parseFloat(totalAmount?.total as string) || 0,
        averageAmount: parseFloat(avgAmount?.avg as string) || 0,
        successRate: successRate.toFixed(2),
        statusBreakdown: {
          completed: successCount,
          pending: parseInt(statusCounts.find((s) => s.status === 'pending')?.count as string) || 0,
          failed: failedCount,
          disputed: disputedCount,
        },
      };
    } catch (error: any) {
      logger.error('Error getting transaction stats', { error: error.message });
      throw new HttpError(500, 'Database error while calculating transaction statistics');
    }
  }
}