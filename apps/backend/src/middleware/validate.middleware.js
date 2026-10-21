export function validate(schema, source = "body") {
  return (req, res, next) => {
    const payload = source === "query" ? req.query : req.body;
    const result = schema.safeParse(payload);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      });
    }

    if (source === "query") {
      // Express may expose req.query as a getter-only property.
      req.validatedQuery = result.data;
    } else {
      req.body = result.data;
    }

    next();
  };
}
