import Joi from 'joi';

export const disputeValidation = {
  createDispute: Joi.object({
    transaction_id: Joi.string().required()
      .messages({
        'any.required': 'Transaction ID is required'
      }),
    respondent_id: Joi.string().allow(null).optional(),
    dispute_reason: Joi.string().required()
      .messages({
        'any.required': 'Dispute reason is required'
      }),
    dispute_details: Joi.string().required()
      .messages({
        'any.required': 'Dispute details are required'
      })
  }),
  
  updateDispute: Joi.object({
    respondent_id: Joi.string().allow(null),
    dispute_reason: Joi.string(),
    dispute_details: Joi.string(),
    status: Joi.string().valid('opened', 'under_review', 'resolved', 'rejected', 'canceled'),
    resolution: Joi.string().valid('pending', 'in_favor_of_initiator', 'in_favor_of_respondent', 'partial'),
    resolution_notes: Joi.string().allow(null, '')
  }).min(1)
    .messages({
      'object.min': 'At least one field must be provided for update'
    }),
  
  addEvidence: Joi.object({
    evidence_type: Joi.string().required()
      .messages({
        'any.required': 'Evidence type is required'
      }),
    file_path: Joi.string().allow(null, ''),
    description: Joi.string().required()
      .messages({
        'any.required': 'Evidence description is required'
      })
  }),
  
  addComment: Joi.object({
    comment: Joi.string().required()
      .messages({
        'any.required': 'Comment text is required'
      }),
    is_private: Joi.boolean().default(false)
  })
};