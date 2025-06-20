import Joi from 'joi';

export const disputeValidation = {
  createDispute: Joi.object({
    transactionId: Joi.string().uuid().optional().messages({
      'string.uuid': 'Transaction ID must be a valid UUID',
    }),
    initiatorEmail: Joi.string().email().required().messages({
      'string.email': 'Invalid initiator email',
      'any.required': 'Initiator email is required',
    }),
    counterpartyEmail: Joi.string().email().required().messages({
      'string.email': 'Invalid counterparty email',
      'any.required': 'Counterparty email is required',
    }),
    reason: Joi.string().optional().max(65535).messages({
      'string.max': 'Reason cannot exceed 65535 characters',
    }),
    amount: Joi.number().precision(2).optional().messages({
      'number.base': 'Amount must be a number',
      'number.precision': 'Amount must have at most 2 decimal places',
    }),
    evidenceType: Joi.string().max(50).optional().messages({
      'string.base': 'Evidence type must be a string',
      'string.max': 'Evidence type cannot exceed 50 characters',
    }),
    evidenceDescription: Joi.string().optional().allow('').messages({
      'string.base': 'Evidence description must be a string',
    }),
    sessionId: Joi.string().max(255).optional().messages({
      'string.max': 'Session ID cannot exceed 255 characters',
    }),
    sourceAccountName: Joi.string().max(255).optional().messages({
      'string.max': 'Source account name cannot exceed 255 characters',
    }),
    sourceBank: Joi.string().max(255).optional().messages({
      'string.max': 'Source bank cannot exceed 255 characters',
    }),
    beneficiaryAccountName: Joi.string().max(255).optional().messages({
      'string.max': 'Beneficiary account name cannot exceed 255 characters',
    }),
    beneficiaryBank: Joi.string().max(255).optional().messages({
      'string.max': 'Beneficiary bank cannot exceed 255 characters',
    }),
  }).custom((value, helpers) => {
    if ((value.evidenceType || value.evidenceDescription) && !(value.evidenceType && value.evidenceDescription)) {
      return helpers.error('object.missing', {
        message: 'Both evidenceType and evidenceDescription are required if one is provided',
      });
    }
    return value;
  }),

  updateDispute: Joi.object({
    reason: Joi.string().optional().max(65535),
    amount: Joi.number().precision(2).optional(),
    status: Joi.string().valid('open', 'under_review', 'resolved', 'rejected', 'canceled').optional(),
    resolution: Joi.string().valid('in_favor_of_initiator', 'in_favor_of_respondent', 'partial').optional(),
    resolutionNotes: Joi.string().optional().allow(''),
    action: Joi.string().valid('accept', 'reject').optional(),
    dateTreated: Joi.date().optional(),
    arbitratorId: Joi.string().uuid().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  addEvidence: Joi.object({
    evidence_type: Joi.string().max(50).required().messages({
      'any.required': 'Evidence type is required',
      'string.max': 'Evidence type cannot exceed 50 characters',
    }),
    description: Joi.string().required().messages({
      'any.required': 'Evidence description is required',
    }),
  }),

  addComment: Joi.object({
    comment: Joi.string().required().messages({
      'any.required': 'Comment text is required',
    }),
    is_private: Joi.boolean().default(false),
  }),

  getUserDisputes: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email',
      'any.required': 'Email is required',
    }),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    status: Joi.string().valid('open', 'under_review', 'resolved', 'rejected', 'canceled').optional(),
  }),
};