// validate(zodSchema) -> parses req.body and replaces it with the cleaned data
const validate = (schema) => (req, _res, next) => {
  req.body = schema.parse(req.body);
  next();
};
module.exports = validate;
