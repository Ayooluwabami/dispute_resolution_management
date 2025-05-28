import Joi from 'joi';

export const arbitrationValidation = {
  assignArbitrator: Joi.object({
    arbitrator_id: Joi.string().required()
      .messages({
        'any.required': 'Arbitrator ID is required'
      })
  }),
  
  reviewCase: Joi.object({
    notes: Joi.string().allow('', null).optional()
  }),
  
  resolveCase: Joi.object({
    resolution: Joi.string().valid('in_favor_of_initiator', 'in_favor_of_respondent', 'partial').required()
      .messages({
        'any.required': 'Resolution is required',
        'any.only': 'Resolution must be one of: in_favor_of_initiator, in_favor_of_respondent, partial'
      }),
    resolution_notes: Joi.string().required()
      .messages({
        'any.required': 'Resolution notes are required'
      })
  })
};