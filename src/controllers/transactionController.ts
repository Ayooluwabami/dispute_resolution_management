import { CustomRequest, RestanaResponse, NextFunction } from '../types';
import { TransactionService } from '../services/transactionService';
import { logger } from '../utils/logger';
import { HttpError } from '../utils/httpError';
import { getUserFromRequest } from '../utils/requestUtils';

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
      logger.error('Error getting transactions', { error: error.message });
      next(new HttpError(500, 'Failed to retrieve transactions'));
    }
  };

  public getTransactionById = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params as TransactionParams;
      if (!id) {
        throw new HttpError(400, 'Transaction ID is required');
      }
      const transaction = await this.transactionService.getTransactionById(id);

      if (!transaction) {
        throw new HttpError(404, 'Transaction not found');
      }

      res.send({
        status: 'success',
        data: transaction,
      });
    } catch (error: any) {
      logger.error('Error getting transaction by ID', { error: error.message, id: req.params.id });
      next(error instanceof HttpError ? error : new HttpError(500, 'Failed to retrieve transaction'));
    }
  };

  public createTransaction = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      const transactionData = req.body;
      const newTransaction = await this.transactionService.createTransaction(transactionData);

      res.send({
        status: 'success',
        data: newTransaction,
      });
    } catch (error: any) {
      logger.error('Error creating transaction', { error: error.message });
      next(new HttpError(500, 'Failed to create transaction'));
    }
  };

  public updateTransaction = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params as TransactionParams;
      if (!id) {
        throw new HttpError(400, 'Transaction ID is required');
      }
      const transactionData = req.body;
      const updatedTransaction = await this.transactionService.updateTransaction(id, transactionData);

      if (!updatedTransaction) {
        throw new HttpError(404, 'Transaction not found');
      }

      res.send({
        status: 'success',
        data: updatedTransaction,
      });
    } catch (error: any) {
      logger.error('Error updating transaction', { error: error.message, id: req.params.id });
      next(error instanceof HttpError ? error : new HttpError(500, 'Failed to update transaction'));
    }
  };

  public searchTransactions = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      const searchParams = req.query as Record<string, string | string[] | undefined>;
      const results = await this.transactionService.searchTransactions(searchParams);

      res.send({
        status: 'success',
        data: results,
      });
    } catch (error: any) {
      logger.error('Error searching transactions', { error: error.message });
      next(new HttpError(500, 'Failed to search transactions'));
    }
  };

  public getTransactionStats = async (
    req: CustomRequest,
    res: RestanaResponse,
    next: NextFunction
  ) => {
    try {
      const { from_date, to_date } = req.query as TransactionQuery;
      const stats = await this.transactionService.getTransactionStats(from_date, to_date);

      res.send({
        status: 'success',
        data: stats,
      });
    } catch (error: any) {
      logger.error('Error getting transaction stats', { error: error.message });
      next(new HttpError(500, 'Failed to retrieve transaction statistics'));
    }
  };
}