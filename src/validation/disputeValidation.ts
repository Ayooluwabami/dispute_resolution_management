import Joi from 'joi';

export const disputeValidation = {
  createDispute: Joi.object({
    transaction_id: Joi.string().uuid().required()
      .messages({
        'string.uuid': 'Invalid transaction ID format',
        'any.required': 'Transaction ID is required',
      }),
    dispute_reason: Joi.string().required()
      .messages({
        'any.required': 'Dispute reason is required',
      }),
    dispute_details: Joi.string().required()
      .messages({
        'any.required': 'Dispute details are required',
      }),
    clientEmail: Joi.string().email().required()
      .messages({
        'string.email': 'Invalid client email format',
        'any.required': 'Client email is required',
      }),
    counterpartyEmail: Joi.string().email().required()
      .messages({
        'string.email': 'Invalid counterparty email format',
        'any.required': 'Counterparty email is required',
      }),
    amount: Joi.number().precision(2).optional()
      .messages({
        'number.precision': 'Amount must have at most 2 decimal places',
      }),
  }),

  updateDispute: Joi.object({
    dispute_reason: Joi.string(),
    dispute_details: Joi.string(),
    status: Joi.string().valid('open', 'under_review', 'resolved', 'rejected', 'canceled'),
    resolution: Joi.string().valid('pending', 'in_favor_of_initiator', 'in_favor_of_respondent', 'partial'),
    resolution_notes: Joi.string().allow(null, ''),
  }).min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),

  addEvidence: Joi.object({
    evidence_type: Joi.string().required()
      .messages({
        'any.required': 'Evidence type is required',
      }),
    description: Joi.string().required()
      .messages({
        'any.required': 'Evidence description is required',
      }),
  }),

  addComment: Joi.object({
    comment: Joi.string().required()
      .messages({
        'any.required': 'Comment text is required',
      }),
    is_private: Joi.boolean().default(false),
    clientEmail: Joi.string().email().optional(),
    counterpartyEmail: Joi.string().email().optional(),
  }),
};