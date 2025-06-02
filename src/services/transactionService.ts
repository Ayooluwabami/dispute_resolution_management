import { db } from '../database/connection';
import { HttpError } from '../utils/httpError';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class TransactionService {
  public async getAllTransactions(params: any) {
    try {
      const { page = '1', limit = '20', status, fromDate, toDate } = params;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const query = db('transactions');
      if (status) query.where('status', 'like', status);
      if (fromDate) query.where('transaction_date', '>=', fromDate);
      if (toDate) query.where('transaction_date', '<=', toDate);

      const [count] = await db('transactions').count('id as total');
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
      if (error instanceof HttpError) throw error;
      throw new HttpError(500, 'Database error while fetching transaction');
    }
  }

  public async createTransaction(transactionData: any) {
    try {
      const existingTransaction = await db('transactions').where({ session_id: transactionData.session_id }).first();
      if (existingTransaction) {
        logger.warn('Duplicate session_id', { session_id: transactionData.session_id });
        throw new HttpError(409, 'Transaction with this session ID already exists');
      }

      const newTransaction = {
        id: uuidv4(),
        status: transactionData.status || 'pending',
        userId: transactionData.userId || null,
        channel_code: transactionData.channel_code || null,
        destination_node: transactionData.destination_node || null,
        session_id: transactionData.session_id,
        amount: transactionData.amount,
        source_account_name: transactionData.source_account_name,
        source_bank: transactionData.source_bank,
        beneficiary_account_name: transactionData.beneficiary_account_name,
        beneficiary_bank: transactionData.beneficiary_bank,
      };

      await db('transactions').insert(newTransaction);
      const insertedTransaction = await db('transactions').where({ id: newTransaction.id }).first();
      if (!insertedTransaction) {
        logger.error('Inserted transaction not found', { id: newTransaction.id });
        throw new HttpError(500, 'Failed to retrieve inserted transaction');
      }

      logger.info('Transaction created', { id: insertedTransaction.id, session_id: insertedTransaction.session_id });
      return insertedTransaction;
    } catch (error: any) {
      logger.error('Error creating transaction', {
        error: error.message,
        sqlMessage: error.sqlMessage,
        transactionData,
      });
      if (error instanceof HttpError) throw error;
      if (error.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'Transaction with this session ID already exists');
      }
      throw new HttpError(500, `Database error while creating transaction: ${error.message}`);
    }
  }

  public async updateTransaction(id: string, transactionData: any) {
    try {
      const transaction = await this.getTransactionById(id);
      if (!transaction) {
        throw new HttpError(404, 'Transaction not found');
      }

      await db('transactions').where({ id }).update(transactionData);
      return await this.getTransactionById(id);
    } catch (error: any) {
      logger.error('Error updating transaction', { error: error.message, transactionId: id });
      if (error instanceof HttpError) throw error;
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

      const query = db('transactions');
      if (session_id) query.where('session_id', session_id);
      if (source_account_name) query.where('source_account_name', 'like', `%${source_account_name}%`);
      if (source_bank) query.where('source_bank', 'like', `%${source_bank}%`);
      if (beneficiary_account_name) query.where('beneficiary_account_name', 'like', `%${beneficiary_account_name}%`);
      if (beneficiary_bank) query.where('beneficiary_bank', 'like', `%${beneficiary_bank}%`);
      if (amount) query.where('amount', amount);
      if (status) query.where('status', status); // Exact match for status
      if (channel_code) query.where('channel_code', channel_code);
      if (destination_node) query.where('destination_node', destination_node);
      if (from_date) query.where('transaction_date', '>=', from_date);
      if (to_date) query.where('transaction_date', '<=', to_date);

      logger.info('Executing search query', { searchParams, query: query.toString() });

      const countQuery = query.clone();
      const [count] = await countQuery.count('id as total');
      const transactions = await query
        .select('*')
        .limit(limitNum)
        .offset(offset)
        .orderBy('transaction_date', 'desc');

      logger.info('Search results', { count: count.total, transactionsCount: transactions.length });

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
      logger.error('Error searching transactions', { error: error.message, searchParams });
      throw new HttpError(500, 'Database error while searching transactions');
    }
  }

  public async getTransactionStats(fromDate?: string, toDate?: string) {
    try {
      const query = db('transactions');
      if (fromDate) query.where('transaction_date', '>=', fromDate);
      if (toDate) query.where('transaction_date', '<=', toDate);

      const [totalCount] = await query.clone().count('id as count');
      const statusCounts = await query.clone().select('status').count('id as count').groupBy('status');
      const [totalAmount] = await query.clone().sum('amount as total');
      const [avgAmount] = await query.clone().avg('amount as avg');

      const total = parseInt(totalCount.count as string) || 0;
      const successCount = parseInt(statusCounts.find((s) => (s.status as string).toLowerCase() === 'completed')?.count as string) || 0;
      const failedCount = parseInt(statusCounts.find((s) => (s.status as string).toLowerCase() === 'failed')?.count as string) || 0;
      const disputedCount = parseInt(statusCounts.find((s) => (s.status as string).toLowerCase() === 'disputed')?.count as string) || 0;
      const pendingCount = parseInt(statusCounts.find((s) => (s.status as string).toLowerCase() === 'pending')?.count as string) || 0;

      const successRate = total > 0 ? (successCount / total) * 100 : 0;

      logger.info('Transaction stats', { total, successCount, pendingCount, failedCount, disputedCount });

      return {
        totalTransactions: total,
        totalAmount: parseFloat(totalAmount?.total as string) || 0,
        averageAmount: parseFloat(avgAmount?.avg as string) || 0,
        successRate: successRate.toFixed(2),
        statusBreakdown: {
          completed: successCount,
          pending: pendingCount,
          failed: failedCount,
          disputed: disputedCount,
        },
      };
    } catch (error: any) {
      logger.error('Error getting transaction stats', { error: error.message, fromDate, toDate });
      throw new HttpError(500, 'Database error while calculating transaction statistics');
    }
  }
}