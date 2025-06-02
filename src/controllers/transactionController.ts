import { CustomRequest, RestanaResponse, NextFunction } from '../types';
import { TransactionService } from '../services/transactionService';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';

interface TransactionQuery {
  page?: string;
  limit?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

interface TransactionParams {
  id?: string;
}

export class TransactionController {
  private transactionService = new TransactionService();

  public getAllTransactions = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      logger.info('Starting getAllTransactions', { query: req.query });
      const { page = '1', limit = '20', status, from_date, to_date } = req.query as TransactionQuery;
      const result = await this.transactionService.getAllTransactions({
        page,
        limit,
        status,
        fromDate: from_date,
        toDate: to_date,
      });

      res.send({
        status: 'success',
        data: result,
      });
    } catch (error: any) {
      logger.error('Error in getAllTransactions', { error: error.message, query: req.query });
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve transactions',
      }, error.statusCode || 500);
    }
  };

  public getTransactionById = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      logger.info('Starting getTransactionById', { id: req.params.id, path: req.url });
      const { id } = req.params as TransactionParams;
      if (!id) {
        throw new HttpError(400, 'Transaction ID is required');
      }
      const transaction = await this.transactionService.getTransactionById(id);

      res.send({
        status: 'success',
        data: transaction,
      });
    } catch (error: any) {
      logger.error('Error in getTransactionById', { error: error.message, id: req.params.id, path: req.url });
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve transaction',
      }, error.statusCode || 500);
    }
  };

  public createTransaction = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      logger.info('Starting createTransaction', { body: req.body });
      const transactionData = req.body;
      const newTransaction = await this.transactionService.createTransaction(transactionData);

      res.send({
        status: 'success',
        data: newTransaction,
      }, 201);
    } catch (error: any) {
      logger.error('Error in createTransaction', { error: error.message, data: req.body });
      res.send({
        status: 'error',
        message: error.message || 'Failed to create transaction',
      }, error.statusCode || 500);
    }
  };

  public updateTransaction = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      logger.info('Starting updateTransaction', { id: req.params.id, body: req.body });
      const { id } = req.params as TransactionParams;
      if (!id) {
        throw new HttpError(400, 'Transaction ID is required');
      }
      const transactionData = req.body;
      const updatedTransaction = await this.transactionService.updateTransaction(id, transactionData);

      res.send({
        status: 'success',
        data: updatedTransaction,
      });
    } catch (error: any) {
      logger.error('Error in updateTransaction', { error: error.message, id: req.params.id });
      res.send({
        status: 'error',
        message: error.message || 'Failed to update transaction',
      }, error.statusCode || 500);
    }
  };

  public searchTransactions = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      logger.info('Starting searchTransactions', { query: req.query, path: req.url });
      const searchParams = req.query as Record<string, string | string[] | undefined>;
      const results = await this.transactionService.searchTransactions(searchParams);

      logger.info('searchTransactions results', { count: results.data.length, pagination: results.pagination });
      res.send({
        status: 'success',
        data: results,
      });
    } catch (error: any) {
      logger.error('Error in searchTransactions', { error: error.message, query: req.query, path: req.url });
      res.send({
        status: 'success',
        data: { data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } },
      });
    }
  };

  public getTransactionStats = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      logger.info('Starting getTransactionStats', { query: req.query, path: req.url });
      const { from_date, to_date } = req.query as TransactionQuery;
      const stats = await this.transactionService.getTransactionStats(from_date, to_date);

      logger.info('getTransactionStats results', { stats });
      res.send({
        status: 'success',
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error in getTransactionStats', { error: error.message, query: req.query, path: req.url });
      res.send({
        status: 'error',
        message: error.message || 'Failed to retrieve transaction statistics',
      }, error.statusCode || 500);
    }
  };
}