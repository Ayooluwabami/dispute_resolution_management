import Joi from 'joi';

export const arbitrationValidation = {
  assignArbitrator: Joi.object({
    arbitrator_id: Joi.string().uuid().required()
      .messages({
        'any.required': 'Arbitrator ID is required',
        'string.uuid': 'Arbitrator ID must be a valid UUID'
      })
  })
};