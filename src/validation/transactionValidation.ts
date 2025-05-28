import Joi from 'joi';

export const transactionValidation = {
  createTransaction: Joi.object({
    session_id: Joi.string().required()
      .messages({
        'any.required': 'Session ID is required'
      }),
    amount: Joi.number().positive().precision(2).required()
      .messages({
        'number.base': 'Amount must be a number',
        'number.positive': 'Amount must be positive',
        'number.precision': 'Amount cannot have more than 2 decimal places',
        'any.required': 'Amount is required'
      }),
    source_account_name: Joi.string().required()
      .messages({
        'any.required': 'Source account name is required'
      }),
    source_bank: Joi.string().required()
      .messages({
        'any.required': 'Source bank is required'
      }),
    beneficiary_account_name: Joi.string().required()
      .messages({
        'any.required': 'Beneficiary account name is required'
      }),
    beneficiary_bank: Joi.string().required()
      .messages({
        'any.required': 'Beneficiary bank is required'
      }),
    status: Joi.string().valid('pending', 'completed', 'failed', 'disputed').default('pending')
      .messages({
        'any.only': 'Status must be one of: pending, completed, failed, disputed'
      }),
    channel_code: Joi.string().allow(null, '').optional(),
    destination_node: Joi.string().allow(null, '').optional(),
    userId: Joi.string().optional(),
  }),
  
  updateTransaction: Joi.object({
    status: Joi.string().valid('pending', 'completed', 'failed', 'disputed')
      .messages({
        'any.only': 'Status must be one of: pending, completed, failed, disputed'
      }),
    amount: Joi.number().positive().precision(2)
      .messages({
        'number.base': 'Amount must be a number',
        'number.positive': 'Amount must be positive',
        'number.precision': 'Amount cannot have more than 2 decimal places'
      }),
    source_account_name: Joi.string(),
    source_bank: Joi.string(),
    beneficiary_account_name: Joi.string(),
    beneficiary_bank: Joi.string(),
    channel_code: Joi.string().allow(null, ''),
    destination_node: Joi.string().allow(null, '')
  }).min(1)
    .messages({
      'object.min': 'At least one field must be provided for update'
    })
};